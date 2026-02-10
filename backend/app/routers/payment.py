import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime, timedelta
import os

from app.deps import get_db
from app.auth import get_current_user
from app.models import User
from app.config import settings

router = APIRouter(prefix="/payment", tags=["payment"])

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

@router.post("/checkout")
def create_checkout_session(
    payload: dict, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Creates a Stripe Checkout Session for a subscription.
    Payload: { "period": "monthly" | "yearly" }
    """
    period = payload.get("period", "monthly")
    
    try:
        # 1. Get or Create Customer
        if offset_customer_id := current_user.stripe_customer_id:
            customer_id = offset_customer_id
        else:
            customer = stripe.Customer.create(
                email=current_user.email,
                name=current_user.full_name or current_user.email
            )
            customer_id = customer.id
            current_user.stripe_customer_id = customer_id
            db.commit()

        # 2. Determine Price (Ad-hoc $0.03 for testing)
        # In production, use price_id from Stripe Dashboard
        # Here we use ad-hoc price data
        unit_amount = 3 # $0.03 cents
        interval = "month" if period == "monthly" else "year"
        product_name = f"MindPath Premium ({period.capitalize()})"

        # 3. Create Session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": product_name,
                        "description": "Premium AI Features + Voice Assistant"
                    },
                    "unit_amount": unit_amount,
                    "recurring": {
                        "interval": interval
                    }
                },
                "quantity": 1,
            }],
            subscription_data={
                "trial_period_days": 7,
                "metadata": {
                    "user_id": str(current_user.id)
                }
            },
            success_url=f"{FRONTEND_URL}/app/pricing?success=true",
            cancel_url=f"{FRONTEND_URL}/app/pricing?canceled=true",
        )
        
        return {"url": session.url}

    except Exception as e:
        print(f"Stripe Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None), db: Session = Depends(get_db)):
    payload = await request.body()
    
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, WEBHOOK_SECRET
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle Events
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        # Fulfill subscription
        await handle_checkout_completed(session, db)
    
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        await handle_subscription_deleted(subscription, db)

    return {"status": "success"}


async def handle_checkout_completed(session, db: Session):
    customer_id = session.get("customer")
    # Find user by customer_id
    stmt = select(User).where(User.stripe_customer_id == customer_id)
    user = db.scalar(stmt)
    
    if user:
        user.subscription_plan = "premium"
        user.is_trial = True # Technically in trial first
        # We should fetch subscription to get end date, but for now:
        db.commit()
        print(f"User {user.email} upgraded to Premium via Stripe")


async def handle_subscription_deleted(subscription, db: Session):
    customer_id = subscription.get("customer")
    stmt = select(User).where(User.stripe_customer_id == customer_id)
    user = db.scalar(stmt)
    
    if user:
        user.subscription_plan = "free"
        user.is_trial = False
        user.subscription_ends_at = datetime.utcnow() # Expired
        db.commit()
        print(f"User {user.email} subscription canceled/ended")
