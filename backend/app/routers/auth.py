from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.deps import get_db
from app.models import User
from app.schemas import DevLoginIn, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/dev-login", response_model=UserOut)
def dev_login(payload: DevLoginIn, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        return existing

    user = User(email=payload.email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
