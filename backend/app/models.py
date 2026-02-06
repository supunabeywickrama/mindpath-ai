from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, JSON
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
