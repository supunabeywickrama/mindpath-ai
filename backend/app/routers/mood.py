from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.deps import get_db
from app.auth_dev import get_current_user
from app.models import MoodEntry, User
from app.schemas import MoodCreate, MoodOut
from app.auth import get_current_user

router = APIRouter(prefix="/moods", tags=["moods"])

@router.get("", response_model=list[MoodOut])
def list_moods(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = (
        select(MoodEntry)
        .where(MoodEntry.user_id == user.id)
        .order_by(MoodEntry.created_at.desc())
    )
    return list(db.scalars(q).all())

@router.post("", response_model=MoodOut)
def create_mood(
    payload: MoodCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entry = MoodEntry(
        user_id=user.id,
        mood=payload.mood,
        emotions=payload.emotions,
        tags=payload.tags,
        note=payload.note,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
