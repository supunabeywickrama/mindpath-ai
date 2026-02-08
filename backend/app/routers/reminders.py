from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime

from app.deps import get_db
from app.auth import get_current_user
from app.models import User, Reminder
from app.schemas import ReminderCreate, ReminderOut

router = APIRouter(prefix="/reminders", tags=["reminders"])

@router.get("", response_model=list[ReminderOut])
def list_reminders(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return db.scalars(
        select(Reminder)
        .where(Reminder.user_id == user.id)
        .order_by(Reminder.next_trigger.asc())
    ).all()

@router.post("", response_model=ReminderOut)
def create_reminder(
    payload: ReminderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    reminder = Reminder(
        user_id=user.id,
        title=payload.title,
        next_trigger=payload.next_trigger,
        is_recurring=payload.is_recurring,
        recurrence_pattern=payload.recurrence_pattern,
        email_enabled=payload.email_enabled
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder

@router.delete("/{reminder_id}")
def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    reminder = db.scalar(
        select(Reminder)
        .where(Reminder.id == reminder_id, Reminder.user_id == user.id)
    )
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    db.delete(reminder)
    db.commit()
    return {"deleted": True}
