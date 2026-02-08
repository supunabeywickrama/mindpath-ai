from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, text as sql_text

from app.deps import get_db
from app.auth_dev import get_current_user
from app.models import User, JournalEntry, MoodEntry
from app.memory_models import UserMemory
from app.embeddings import embed_texts
from app.auth import get_current_user

router = APIRouter(prefix="/memory", tags=["memory"])

def vec_to_pgvector(v: list[float]) -> str:
    return "[" + ",".join(f"{x:.8f}" for x in v) + "]"

@router.post("/reindex")
def reindex(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Clear existing memories for user (simple approach)
    db.execute(sql_text("DELETE FROM user_memories WHERE user_id = :uid"), {"uid": user.id})
    db.commit()

    texts = []
    meta = []

    # Journal
    js = list(db.scalars(select(JournalEntry).where(JournalEntry.user_id == user.id)).all())
    for j in js:
        content = f"[Journal] {j.title}\n{j.content}"
        texts.append(content)
        meta.append(("journal", j.id, content))

    # Mood
    ms = list(db.scalars(select(MoodEntry).where(MoodEntry.user_id == user.id)).all())
    for m in ms:
        content = f"[Mood] mood={m.mood} note={(m.note or '').strip()}"
        texts.append(content)
        meta.append(("mood", m.id, content))

    if not texts:
        return {"ok": True, "indexed": 0}

    vecs = embed_texts(texts)

    for (kind, sid, content), v in zip(meta, vecs):
        mem = UserMemory(user_id=user.id, kind=kind, source_id=sid, content=content)
        db.add(mem)
        db.flush()
        db.execute(
            sql_text("UPDATE user_memories SET embedding = (:emb)::vector WHERE id = :id"),
            {"emb": vec_to_pgvector(v), "id": mem.id},
        )

    db.commit()
    return {"ok": True, "indexed": len(texts)}
