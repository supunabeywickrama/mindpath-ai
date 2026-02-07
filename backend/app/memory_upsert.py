from sqlalchemy.orm import Session
from sqlalchemy import select, text as sql_text

from app.embeddings import embed_texts
from app.memory_models import UserMemory


def vec_to_pgvector(v: list[float]) -> str:
    return "[" + ",".join(f"{x:.8f}" for x in v) + "]"


def upsert_user_memory(
    db: Session,
    *,
    user_id: int,
    kind: str,          # "journal" | "mood"
    source_id: int,     # journal_entries.id or mood_entries.id
    content: str,
):
    content = (content or "").strip()
    if not content:
        return

    existing = db.scalar(
        select(UserMemory).where(
            UserMemory.user_id == user_id,
            UserMemory.kind == kind,
            UserMemory.source_id == source_id,
        )
    )

    if existing is None:
        mem = UserMemory(user_id=user_id, kind=kind, source_id=source_id, content=content)
        db.add(mem)
        db.flush()
        mem_id = mem.id
    else:
        existing.content = content
        db.flush()
        mem_id = existing.id

    emb = vec_to_pgvector(embed_texts([content])[0])

    db.execute(
        sql_text("UPDATE user_memories SET embedding = (:emb)::vector WHERE id = :id"),
        {"emb": emb, "id": mem_id},
    )


def delete_user_memory(db: Session, *, user_id: int, kind: str, source_id: int):
    db.execute(
        sql_text(
            "DELETE FROM user_memories WHERE user_id = :uid AND kind = :kind AND source_id = :sid"
        ),
        {"uid": user_id, "kind": kind, "sid": source_id},
    )
