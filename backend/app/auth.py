from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.deps import get_db
from app.config import settings
from app.models import User
from app.auth_asgardeo import get_current_user_asgardeo

def get_current_user_dev(
    db: Session = Depends(get_db),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required (dev)")
    u = db.scalar(select(User).where(User.id == int(x_user_id)))
    if not u:
        raise HTTPException(status_code=401, detail="User not found")
    return u

async def get_current_user(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
):
    if settings.auth_mode == "asgardeo":
        return await get_current_user_asgardeo(db=db, authorization=authorization)
    return get_current_user_dev(db=db, x_user_id=x_user_id)
