from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.deps import get_db
from app.auth_dev import get_current_user
from app.models import User
from app.notify_models import CheckInSchedule
from app.schemas import CheckInUpdate, CheckInOut
from app.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/checkin", response_model=CheckInOut | None)
def get_checkin(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    sched = db.scalar(select(CheckInSchedule).where(CheckInSchedule.user_id == user.id))
    return sched  # returns null if none

@router.post("/checkin", response_model=CheckInOut)
def set_checkin(payload: CheckInUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    sched = db.scalar(select(CheckInSchedule).where(CheckInSchedule.user_id == user.id))

    if sched is None:
        sched = CheckInSchedule(
            user_id=user.id,
            tz=payload.tz,
            hour=payload.hour,
            minute=payload.minute,
            enabled=payload.enabled,
        )
        db.add(sched)
    else:
        sched.tz = payload.tz
        sched.hour = payload.hour
        sched.minute = payload.minute
        sched.enabled = payload.enabled

    db.commit()
    db.refresh(sched)
    return sched
