from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.deps import get_db
from app.models import User
from app.schemas import DevLoginIn, UserOut
from app.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/dev-login", response_model=UserOut)
def dev_login(payload: DevLoginIn, db: Session = Depends(get_db)):
    try:
        existing = db.scalar(select(User).where(User.email == payload.email))
        if existing:
            return {
                "id": existing.id,
                "email": existing.email,
                "created_at": existing.created_at,
                "is_admin": payload.email == "admin@mindpath.ai"
            }

        user = User(email=payload.email)
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return {
            "id": user.id,
            "email": user.email,
            "created_at": user.created_at,
            "is_admin": payload.email == "admin@mindpath.ai"
        }
    except Exception as e:
        print(f"DEV LOGIN ERROR: {e}") # This will show in backend logs
        raise e
