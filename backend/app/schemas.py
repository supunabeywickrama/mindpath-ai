from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Any

# -------- Users --------
class UserOut(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime
    is_admin: bool = False

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

class CheckInUpdate(BaseModel):
    tz: str = "Asia/Colombo"
    hour: int = Field(ge=0, le=23)
    minute: int = Field(ge=0, le=59)
    enabled: bool = True

class CheckInOut(BaseModel):
    id: int
    tz: str
    hour: int
    minute: int
    enabled: bool

    class Config:
        from_attributes = True