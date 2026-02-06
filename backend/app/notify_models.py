from datetime import datetime, time
from sqlalchemy import Integer, DateTime, ForeignKey, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

class CheckInSchedule(Base):
    __tablename__ = "checkin_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    tz: Mapped[str] = mapped_column(String(64), default="Asia/Colombo")
    hour: Mapped[int] = mapped_column(Integer, default=9)
    minute: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
