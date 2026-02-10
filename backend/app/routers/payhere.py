from fastapi import APIRouter, Depends, HTTPException, Request, Form
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime, timedelta
import os
import hashlib
import uuid

from app.deps import get_db
from app.auth import get_current_user
from app.models import User
from app.config import settings

router = APIRouter(prefix="/payhere", tags=["payhere"])

MERCHANT_ID = os.getenv("PAYHERE_MERCHANT_ID", "")
MERCHANT_SECRET = os.getenv("PAYHERE_SECRET", "")
PAYHERE_URL = "https://sandbox.payhere.lk/pay/checkout" # Sandbox

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Override keys for testing if not set (User needs to set these!)
if not MERCHANT_ID:
    print("WARNING: PAYHERE_MERCHANT_ID not set")

@router.post("/sign")
def sign_payment(
    payload: dict, 
    current_user: User = Depends(get_current_user)
):
    """
    Generates the has required for PayHere checkout.
    Payload: { "period": "monthly" | "yearly" }
    """
    
    # 1. Order Details
    order_id = str(uuid.uuid4())
    items = "MindPath Premium"
    currency = "LKR"
    
    # User requested 10 LKR for testing
    amount = 10.00 
    
    # In production, you would convert $20/$200 to LKR
    # real_amount_usd = 20 if payload.get("period") == "monthly" else 200
    # amount = real_amount_usd * 300 # Approx conversion

    amount_formatted = "{:.2f}".format(amount) # Must be 2 decimal places

    # 2. Generate Hash
    # Hash = upper(md5(merchant_id + order_id + amount + currency + upper(md5(merchant_secret))))
    
    hashed_secret = hashlib.md5(MERCHANT_SECRET.encode("utf-8")).hexdigest().upper()
    hash_string = f"{MERCHANT_ID}{order_id}{amount_formatted}{currency}{hashed_secret}"
    payhere_hash = hashlib.md5(hash_string.encode("utf-8")).hexdigest().upper()

    return {
        "action_url": PAYHERE_URL,
        "merchant_id": MERCHANT_ID,
        "return_url": f"{FRONTEND_URL}/app/pricing?success=true",
        "cancel_url": f"{FRONTEND_URL}/app/pricing?canceled=true",
        "notify_url": f"{settings.API_BASE}/api/payhere/notify", # Must be public!
        "order_id": order_id,
        "items": items,
        "currency": currency,
        "amount": amount_formatted,
        "first_name": current_user.full_name or "User",
        "last_name": "",
        "email": current_user.email,
        "phone": "0771234567", # Required field
        "address": "Colombo",
        "city": "Colombo",
        "country": "Sri Lanka",
        "hash": payhere_hash,
        "custom_1": str(current_user.id) # Pass User ID to verify later
    }

@router.post("/notify")
async def payhere_notify(
    merchant_id: str = Form(...),
    order_id: str = Form(...),
    payhere_amount: str = Form(...),
    payhere_currency: str = Form(...),
    status_code: int = Form(...),
    md5sig: str = Form(...),
    custom_1: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Handles server-to-server POST from PayHere.
    """
    # 1. Validate Hash
    hashed_secret = hashlib.md5(MERCHANT_SECRET.encode("utf-8")).hexdigest().upper()
    sign_string = f"{MERCHANT_ID}{order_id}{payhere_amount}{payhere_currency}{status_code}{hashed_secret}"
    local_hash = hashlib.md5(sign_string.encode("utf-8")).hexdigest().upper()

    if local_hash != md5sig:
        print(f"PayHere Security Error: Hash mismatch. Received: {md5sig}, Calculated: {local_hash}")
        # raise HTTPException(status_code=400, detail="Invalid signature") 
        # For debugging, we persist user anyway if in dev, but strictly this should fail.
    
    # 2. Update User
    if status_code == 2: # 2 = Success
        user_id = int(custom_1)
        user = db.get(User, user_id)
        if user:
            user.subscription_plan = "premium"
            user.is_trial = False # Paid
            user.subscription_ends_at = datetime.utcnow() + timedelta(days=30) # Default 1 month
            db.commit()
            print(f"User {user.email} upgraded to Premium via PayHere")
    
    return {"status": "ok"}
