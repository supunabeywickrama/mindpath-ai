import os
from datetime import datetime
import pytz
from apscheduler.schedulers.blocking import BlockingScheduler
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import User
from app.notify_models import CheckInSchedule
from app.chat_models import ChatThread, ChatMessage

# Optional email sender (only runs if SMTP_* set)
from app.emailer import send_email


def get_or_create_thread(db: Session, user_id: int) -> ChatThread:
    thread = db.scalar(
        select(ChatThread)
        .where(ChatThread.user_id == user_id)
        .order_by(ChatThread.created_at.desc())
    )
    if thread:
        return thread
    t = ChatThread(user_id=user_id, title="Daily Check-ins")
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


def already_sent_today(db: Session, thread_id: int, today_key: str) -> bool:
    q = (
        select(ChatMessage)
        .where(ChatMessage.thread_id == thread_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(20)
    )
    recent = list(db.scalars(q).all())
    return any(today_key in (m.content or "") for m in recent)


def tick():
    db = SessionLocal()
    try:
        schedules = list(
            db.scalars(select(CheckInSchedule).where(CheckInSchedule.enabled == True)).all()
        )

        print("Tick:", datetime.utcnow().isoformat(), "Schedules:", len(schedules))

        for s in schedules:
            tz = pytz.timezone(s.tz or "Asia/Colombo")
            now_local = datetime.now(tz)

            if now_local.hour != s.hour or now_local.minute != s.minute:
                continue

            user = db.get(User, s.user_id)
            if not user:
                continue

            print(
                "Sending check-in to user:",
                user.email,
                "at",
                now_local.strftime("%H:%M"),
                "tz",
                s.tz,
            )

            thread = get_or_create_thread(db, user.id)

            today_key = f"[checkin:{now_local.strftime('%Y-%m-%d')}]"
            if already_sent_today(db, thread.id, today_key):
                continue

            msg = (
                f"{today_key}\n"
                "Hi 👋 How are you feeling right now?\n"
                "• Mood (0–10)\n"
                "• One sentence about today\n"
                "• One small step you can do next"
            )

            db.add(ChatMessage(thread_id=thread.id, role="assistant", content=msg))
            db.commit()

            # Email (only if SMTP configured)
            try:
                if os.getenv("SMTP_HOST") and user.email:
                    subject = "MindPath daily check-in"
                    body = msg.replace("•", "-")
                    import asyncio

                    asyncio.run(send_email(user.email, subject, body))
            except Exception:
                pass
    finally:
        db.close()


if __name__ == "__main__":
    scheduler = BlockingScheduler()
    scheduler.add_job(
        tick, "interval", minutes=1, id="checkin_tick", replace_existing=True
    )
    print("Worker running: check-ins every minute. Press Ctrl+C to stop.")
    scheduler.start()

