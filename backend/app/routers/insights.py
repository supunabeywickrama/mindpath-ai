from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text as sql_text
from datetime import datetime, timedelta

from app.deps import get_db
from app.auth_dev import get_current_user
from app.models import User
from app.llm import client, build_instructions
from app.config import settings

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
    # emotions/tags columns are JSON (not JSONB) in your schema.
    # Some rows may have non-array JSON values; only expand arrays.
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
    rows = db.execute(q, {"uid": user_id, "since": since, "limit": limit}).fetchall()
    return [r[0] for r in rows]


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
