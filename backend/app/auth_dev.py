from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.deps import get_db
from app.models import User

def get_current_user(
    db: Session = Depends(get_db),
    x_user_id: int | None = Header(default=None),
):
    if x_user_id is None:
        raise HTTPException(status_code=401, detail="Missing X-User-Id header (dev auth)")
    user = db.scalar(select(User).where(User.id == x_user_id))
    if not user:
        raise HTTPException(status_code=401, detail="Invalid X-User-Id")
    return user
