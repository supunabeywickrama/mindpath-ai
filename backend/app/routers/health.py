from fastapi import APIRouter
from app.auth import get_current_user
from app.deps import get_db
from sqlalchemy.orm import Session

router = APIRouter(tags=["health"])

@router.get("/health")
def health():
    return {"status": "ok"}
