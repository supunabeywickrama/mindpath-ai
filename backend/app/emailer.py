import os
import aiosmtplib
import logging
from email.message import EmailMessage
from app.config import settings

logger = logging.getLogger(__name__)

async def send_email(to_email: str, subject: str, body: str):
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    logger.info(f"Connecting to SMTP: {settings.smtp_host}:{settings.smtp_port}")

    await aiosmtplib.send(
        msg,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        start_tls=True,
        username=settings.smtp_user,
        password=settings.smtp_pass,
    )
