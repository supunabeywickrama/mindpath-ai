import asyncio
import logging
from app.emailer import send_email
from app.config import settings

# Configure logging to show output in console
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    if not settings.smtp_user or not settings.smtp_pass:
        print("❌ Error: SMTP_USER or SMTP_PASS not set in .env")
        return

    print(f"📧 Attempting to send test email to {settings.smtp_user}...")
    try:
        await send_email(
            to_email=settings.smtp_user,
            subject="MindPath SMTP Test",
            body="If you are reading this, your SMTP configuration is correct! 🚀"
        )
        print("✅ Email sent successfully!")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")

if __name__ == "__main__":
    asyncio.run(main())
