from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.deps import get_db
from app.auth_dev import get_current_user
from app.models import JournalEntry, User
from app.schemas import JournalCreate, JournalOut

router = APIRouter(prefix="/journal", tags=["journal"])

@router.get("", response_model=list[JournalOut])
def list_journal(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(JournalEntry).where(JournalEntry.user_id == user.id).order_by(JournalEntry.created_at.desc())
    return list(db.scalars(q).all())

@router.post("", response_model=JournalOut)
def create_journal(
    payload: JournalCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entry = JournalEntry(
        user_id=user.id,
        title=payload.title,
        content=payload.content,
        mood=payload.mood,
        emotions=payload.emotions,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

@router.delete("/{entry_id}")
def delete_journal(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entry = db.get(JournalEntry, entry_id)
    if not entry or entry.user_id != user.id:
        return {"deleted": False}
    db.delete(entry)
    db.commit()
    return {"deleted": True}
