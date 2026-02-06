from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Any

# -------- Users --------
class UserOut(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True

class DevLoginIn(BaseModel):
    email: EmailStr

# -------- Mood --------
class MoodCreate(BaseModel):
    mood: int = Field(ge=0, le=10)
    emotions: list[str] = []
    tags: dict[str, Any] = {}
    note: str | None = None

class MoodOut(BaseModel):
    id: int
    user_id: int
    created_at: datetime
    mood: int
    emotions: list[str]
    tags: dict[str, Any]
    note: str | None

    class Config:
        from_attributes = True

# -------- Journal --------
class JournalCreate(BaseModel):
    title: str = "Untitled"
    content: str
    mood: int | None = Field(default=None, ge=0, le=10)
    emotions: list[str] = []

class JournalOut(BaseModel):
    id: int
    user_id: int
    created_at: datetime
    title: str
    content: str
    mood: int | None
    emotions: list[str]

    class Config:
        from_attributes = True
