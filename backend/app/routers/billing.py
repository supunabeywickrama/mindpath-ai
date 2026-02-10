from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime, timedelta
from app.deps import get_db
from app.auth import get_current_user
from app.models import User
from app.schemas import UserOut

router = APIRouter(prefix="/billing", tags=["billing"])

@router.post("/start-trial", response_model=UserOut)
def start_trial(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.is_trial or current_user.subscription_plan != "free":
        raise HTTPException(status_code=400, detail="Trial already used or active subscription exists")

    current_user.is_trial = True
    current_user.subscription_plan = "trial"
    current_user.trial_ends_at = datetime.utcnow() + timedelta(days=14)
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/upgrade", response_model=UserOut)
def upgrade_premium(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Mock payment success
    current_user.subscription_plan = "premium"
    current_user.is_trial = False
    current_user.subscription_ends_at = datetime.utcnow() + timedelta(days=30)
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/cancel", response_model=UserOut)
def cancel_subscription(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.subscription_plan == "free":
         raise HTTPException(status_code=400, detail="No active subscription")

    # In a real app, this would cancel at period end.
    # For now, we revert immediately to free for simplicity or keep it premium until expiration?
    # Let's revert to free immediately for simplest UI feedback loop in this prototype.
    current_user.subscription_plan = "free"
    current_user.is_trial = False
    current_user.subscription_ends_at = None
    current_user.trial_ends_at = None
    
    db.commit()
    db.refresh(current_user)
    return current_user
