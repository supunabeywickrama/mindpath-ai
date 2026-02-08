import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Reminder, User
from app.emailer import send_email

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def check_reminders_loop():
    logger.info("Scheduler started.")
    while True:
        try:
            # We need to create a session
            with SessionLocal() as db:
                await process_reminders(db)
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
        
        # Check every minute
        await asyncio.sleep(60)

async def process_reminders(db: Session):
    now = datetime.utcnow()
    # Find active reminders that are due
    # We join with User to get the email address
    results = db.execute(
        select(Reminder, User)
        .join(User, Reminder.user_id == User.id)
        .where(Reminder.next_trigger <= now, Reminder.email_enabled == True)
    ).all()

    for reminder, user in results:
        logger.info(f"📧 Sending reminder to {user.email}: '{reminder.title}'")
        
        try:
            await send_email(
                to_email=user.email,
                subject=f"Reminder: {reminder.title}",
                body=f"Hi there,\n\nJust a reminder: {reminder.title}\n\n- MindPath AI"
            )
        except Exception as e:
            logger.error(f"Failed to send email to {user.email}: {e}")
        
        if reminder.is_recurring:
            # Simple daily recurrence logic for now
            # In a real app, parse r.recurrence_pattern (e.g. cron or "Mon,Wed")
            # Here assuming daily if recurring
            reminder.next_trigger = reminder.next_trigger + timedelta(days=1)
            logger.info(f"   -> Rescheduled for {reminder.next_trigger}")
        else:
            # One-time reminder: disable or delete
            reminder.email_enabled = False
            logger.info("   -> Marked as done (disabled)")
    
    if results:
        db.commit()
