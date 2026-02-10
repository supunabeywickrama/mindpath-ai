from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text as sql_text
from datetime import datetime, timedelta

from app.deps import get_db
from app.auth import get_current_user
from app.models import User
from app.llm import client, build_instructions
from app.config import settings
from app.auth import get_current_user

router = APIRouter(prefix="/insights", tags=["insights"])


class InsightsResponse(BaseModel):
    days: int
    mood_avg: float | None
    mood_min: int | None
    mood_max: int | None
    mood_count: int
    top_emotions: list[str]
    top_tags: list[str]
    journal_count: int
    themes: list[str]
    suggestions: list[str]
    ai_summary: str | None


def _json_list_counts(db: Session, table: str, col: str, user_id: int, since: datetime, limit: int = 8) -> list[str]:
    # valid cols are secure enough here (internal use)
    if col == "tags":
        # Tags are stored as JSON strings/dicts: {"Tag": true}. We want the keys.
        # Postgres: json_object_keys(t.tags)
        # SQLite: json_each(t.tags) returns key, value.
        # We'll assume Postgres for now as per config.
        q = sql_text(
            f"""
            SELECT key AS item, COUNT(*) AS c
            FROM {table} t
            CROSS JOIN LATERAL json_object_keys(t.{col}) AS key
            WHERE t.user_id = :uid
              AND t.created_at >= :since
            GROUP BY key
            ORDER BY c DESC
            LIMIT :limit
            """
        )
    else:
        # Emotions are JSON arrays: ["happy", "sad"]
        q = sql_text(
            f"""
            SELECT x AS item, COUNT(*) AS c
            FROM {table} t
            JOIN LATERAL json_array_elements_text(t.{col}) AS x ON json_typeof(t.{col}) = 'array'
            WHERE t.user_id = :uid
              AND t.created_at >= :since
            GROUP BY x
            ORDER BY c DESC
            LIMIT :limit
            """
        )
    
    try:
        rows = db.execute(q, {"uid": user_id, "since": since, "limit": limit}).fetchall()
        return [r[0] for r in rows]
    except Exception as e:
        print(f"Error querying {col}: {e}")
        return []

@router.get("/trend")
def trend(days: int = 7, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    days = max(1, min(days, 90))
    since = datetime.utcnow() - timedelta(days=days)
    
    # Postgres: created_at::date
    # SQLite: date(created_at)
    # We'll try a generic approach or Postgres specific
    q = sql_text(
        """
        SELECT 
            created_at::date as day,
            AVG(mood) as mood
        FROM mood_entries
        WHERE user_id = :uid AND created_at >= :since
        GROUP BY day
        ORDER BY day ASC
        """
    )
    
    try:
        rows = db.execute(q, {"uid": user.id, "since": since}).fetchall()
        # rows are (date, float)
        return [{"day": str(r[0]), "mood": float(r[1])} for r in rows]
    except Exception as e:
        # Fallback for SQLite execution if local dev uses it?
        # If the above fails, it might be due to ::date syntax
        print(f"Trend query failed: {e}")
        return []


@router.get("/summary", response_model=InsightsResponse)
def summary(days: int = 7, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    days = max(1, min(days, 90))
    since = datetime.utcnow() - timedelta(days=days)

    mood_row = db.execute(
        sql_text(
            """
            SELECT
              COUNT(*)::int AS n,
              AVG(mood)::float AS avg,
              MIN(mood)::int AS min,
              MAX(mood)::int AS max
            FROM mood_entries
            WHERE user_id = :uid AND created_at >= :since
            """
        ),
        {"uid": user.id, "since": since},
    ).fetchone()

    mood_count = int(mood_row[0]) if mood_row and mood_row[0] is not None else 0
    mood_avg = float(mood_row[1]) if mood_row and mood_row[1] is not None else None
    mood_min = int(mood_row[2]) if mood_row and mood_row[2] is not None else None
    mood_max = int(mood_row[3]) if mood_row and mood_row[3] is not None else None

    top_emotions = _json_list_counts(db, "mood_entries", "emotions", user.id, since, limit=8)
    top_tags = _json_list_counts(db, "mood_entries", "tags", user.id, since, limit=8)

    j_row = db.execute(
        sql_text(
            """
            SELECT COUNT(*)::int
            FROM journal_entries
            WHERE user_id = :uid AND created_at >= :since
            """
        ),
        {"uid": user.id, "since": since},
    ).fetchone()
    journal_count = int(j_row[0]) if j_row and j_row[0] is not None else 0

    themes = []
    if journal_count > 0:
        jr = db.execute(
            sql_text(
                """
                SELECT title, content
                FROM journal_entries
                WHERE user_id = :uid AND created_at >= :since
                ORDER BY created_at DESC
                LIMIT 10
                """
            ),
            {"uid": user.id, "since": since},
        ).fetchall()
        text_blob = " ".join([(r[0] or "") + " " + (r[1] or "") for r in jr]).lower()
        for w in ["sleep", "work", "family", "stress", "anxiety", "tired", "morning", "lonely", "focus"]:
            if w in text_blob:
                themes.append(w)

    suggestions = []
    if mood_avg is not None and mood_avg <= 3:
        suggestions.append("Keep goals tiny this week: one small task + one rest break.")
    if "sleep" in themes or "tired" in top_emotions:
        suggestions.append("Try a consistent sleep window for 3 nights (even if short).")
    if "stress" in top_tags or "anxious" in top_emotions:
        suggestions.append("Use a 60-second exhale-focused breathing (inhale 4, exhale 6 × 5).")
    if not suggestions:
        suggestions.append("Keep tracking — patterns become clearer after 1–2 weeks.")

    ai_summary = None
    if settings.openai_api_key:
        try:
            prompt = {
                "days": days,
                "mood_avg": mood_avg,
                "mood_min": mood_min,
                "mood_max": mood_max,
                "top_emotions": top_emotions[:5],
                "top_tags": top_tags[:5],
                "journal_count": journal_count,
                "themes": themes[:6],
            }
            res = client.responses.create(
                model=settings.openai_model,
                instructions=build_instructions(),
                input=[
                    {
                        "role": "system",
                        "content": (
                            "You are a supportive wellness assistant. "
                            "Summarize patterns gently without medical claims. "
                            "Be specific and practical. 4-6 sentences max."
                        ),
                    },
                    {"role": "user", "content": f"Summarize this user's last {days} days: {prompt}"},
                ],
            )
            ai_summary = res.output_text
        except Exception:
            ai_summary = None

    return {
        "days": days,
        "mood_avg": mood_avg,
        "mood_min": mood_min,
        "mood_max": mood_max,
        "mood_count": mood_count,
        "top_emotions": top_emotions,
        "top_tags": top_tags,
        "journal_count": journal_count,
        "themes": themes,
        "suggestions": suggestions,
        "ai_summary": ai_summary,
    }


from fastapi.responses import StreamingResponse
from app.utils.pdf_gen import generate_insights_pdf
import io
from app.emailer import send_email

@router.get("/export/pdf")
def export_pdf(days: int = 7, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Reuse summary logic (ideal refactor: extract logic to service)
    # For now, call summary function directly (bad practice if it depends on request, but here it depends on DB/User)
    # Better: refactor summary logic. Let's do it cleanly by calling the logic.
    # To avoid duplication, I will just call the summary function logic.
    # BUT, summary() is a path operation function. Calling it directly is tricky with dependencies.
    # Refactoring `summary` logic into a service function `get_insights_summary` is the right way.
    # However, for speed/simplicity, I will instantiate dependencies or just copy logic? 
    # Copying logic is bad. Let's refactor slightly.
    
    # Wait, I can just call the implemented service logic if I extract it.
    # Let's extract the logic from `summary` to `_get_summary_data`.
    
    data_dict = _get_summary_data(db, user, days)
    data = InsightsResponse(**data_dict)
    
    pdf_bytes = generate_insights_pdf(data)
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=insights_{days}days.pdf"}
    )

@router.post("/export/email")
async def email_report(days: int = 7, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    data_dict = _get_summary_data(db, user, days)
    data = InsightsResponse(**data_dict)
    
    pdf_bytes = generate_insights_pdf(data)
    
    await send_email(
        to_email=user.email,
        subject=f"Your MindPath Insights ({days} days)",
        body=f"Hi {user.email},\n\nPlease find attached your insights report for the last {days} days.\n\nBest,\nMindPath AI",
        attachments=[(f"insights_{days}days.pdf", pdf_bytes, "application/pdf")]
    )
    return {"message": "Email sent"}

def _get_summary_data(db: Session, user: User, days: int):
    days = max(1, min(days, 90))
    since = datetime.utcnow() - timedelta(days=days)

    mood_row = db.execute(
        sql_text(
            """
            SELECT
              COUNT(*)::int AS n,
              AVG(mood)::float AS avg,
              MIN(mood)::int AS min,
              MAX(mood)::int AS max
            FROM mood_entries
            WHERE user_id = :uid AND created_at >= :since
            """
        ),
        {"uid": user.id, "since": since},
    ).fetchone()

    mood_count = int(mood_row[0]) if mood_row and mood_row[0] is not None else 0
    mood_avg = float(mood_row[1]) if mood_row and mood_row[1] is not None else None
    mood_min = int(mood_row[2]) if mood_row and mood_row[2] is not None else None
    mood_max = int(mood_row[3]) if mood_row and mood_row[3] is not None else None

    top_emotions = _json_list_counts(db, "mood_entries", "emotions", user.id, since, limit=8)
    top_tags = _json_list_counts(db, "mood_entries", "tags", user.id, since, limit=8)

    j_row = db.execute(
        sql_text(
            """
            SELECT COUNT(*)::int
            FROM journal_entries
            WHERE user_id = :uid AND created_at >= :since
            """
        ),
        {"uid": user.id, "since": since},
    ).fetchone()
    journal_count = int(j_row[0]) if j_row and j_row[0] is not None else 0

    themes = []
    if journal_count > 0:
        jr = db.execute(
            sql_text(
                """
                SELECT title, content
                FROM journal_entries
                WHERE user_id = :uid AND created_at >= :since
                ORDER BY created_at DESC
                LIMIT 10
                """
            ),
            {"uid": user.id, "since": since},
        ).fetchall()
        text_blob = " ".join([(r[0] or "") + " " + (r[1] or "") for r in jr]).lower()
        for w in ["sleep", "work", "family", "stress", "anxiety", "tired", "morning", "lonely", "focus"]:
            if w in text_blob:
                themes.append(w)

    suggestions = []
    if mood_avg is not None and mood_avg <= 3:
        suggestions.append("Keep goals tiny this week: one small task + one rest break.")
    if "sleep" in themes or "tired" in top_emotions:
        suggestions.append("Try a consistent sleep window for 3 nights (even if short).")
    if "stress" in top_tags or "anxious" in top_emotions:
        suggestions.append("Use a 60-second exhale-focused breathing (inhale 4, exhale 6 × 5).")
    if not suggestions:
        suggestions.append("Keep tracking — patterns become clearer after 1–2 weeks.")

    ai_summary = None
    if settings.openai_api_key:
        try:
            prompt = {
                "days": days,
                "mood_avg": mood_avg,
                "mood_min": mood_min,
                "mood_max": mood_max,
                "top_emotions": top_emotions[:5],
                "top_tags": top_tags[:5],
                "journal_count": journal_count,
                "themes": themes[:6],
            }
            res = client.responses.create(
                model=settings.openai_model,
                instructions=build_instructions(),
                input=[
                    {
                        "role": "system",
                        "content": (
                            "You are a supportive wellness assistant. "
                            "Summarize patterns gently without medical claims. "
                            "Be specific and practical. 4-6 sentences max."
                        ),
                    },
                    {"role": "user", "content": f"Summarize this user's last {days} days: {prompt}"},
                ],
            )
            ai_summary = res.output_text
        except Exception:
            ai_summary = None

    return {
        "days": days,
        "mood_avg": mood_avg,
        "mood_min": mood_min,
        "mood_max": mood_max,
        "mood_count": mood_count,
        "top_emotions": top_emotions,
        "top_tags": top_tags,
        "journal_count": journal_count,
        "themes": themes,
        "suggestions": suggestions,
        "ai_summary": ai_summary,
    }
