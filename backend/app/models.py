from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.db import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    moods: Mapped[list["MoodEntry"]] = relationship(back_populates="user")
    journals: Mapped[list["JournalEntry"]] = relationship(back_populates="user")
    
    external_sub: Mapped[str | None] = mapped_column(String, unique=True, index=True, nullable=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Profile settings
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    language: Mapped[str] = mapped_column(String(10), default="en")
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")

    reminders: Mapped[list["Reminder"]] = relationship(back_populates="user")

class MoodEntry(Base):
    __tablename__ = "mood_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    mood: Mapped[int] = mapped_column(Integer)  # 0-10
    emotions: Mapped[list[str]] = mapped_column(JSON, default=list)
    tags: Mapped[dict] = mapped_column(JSON, default=dict)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship(back_populates="moods")


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    title: Mapped[str] = mapped_column(String(200), default="Untitled")
    content: Mapped[str] = mapped_column(Text)
    mood: Mapped[int | None] = mapped_column(Integer, nullable=True)
    emotions: Mapped[list[str]] = mapped_column(JSON, default=list)

    user: Mapped["User"] = relationship(back_populates="journals")


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    title: Mapped[str] = mapped_column(String(255))
    
    # Core scheduling logic
    # If is_recurring=False, next_trigger is the one-time targets.
    # If is_recurring=True, next_trigger is the *next* occurrence, updated after sending.
    next_trigger: Mapped[datetime] = mapped_column(DateTime, index=True)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    recurrence_pattern: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None) 
    # e.g., "daily", "weekly:Mon", "weekly:Mon,Wed"

    email_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    user: Mapped["User"] = relationship(back_populates="reminders")


