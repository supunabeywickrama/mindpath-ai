from pydantic import BaseModel, EmailStr, Field, field_serializer
from datetime import datetime, timezone
from typing import Any

# ... (Users, Mood, Journal schemas remain same, I will use StartLine to target ReminderOut)

# -------- Reminders --------
class ReminderCreate(BaseModel):
    title: str
    next_trigger: datetime 
    is_recurring: bool = False
    recurrence_pattern: str | None = None
    email_enabled: bool = True

class ReminderOut(BaseModel):
    id: int
    user_id: int
    created_at: datetime
    title: str
    next_trigger: datetime
    is_recurring: bool
    recurrence_pattern: str | None
    email_enabled: bool

    class Config:
        from_attributes = True

    @field_serializer('next_trigger', 'created_at')
    def serialize_dt(self, dt: datetime, _info):
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc).isoformat()
        return dt.isoformat()

# -------- Users --------
class UserOut(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime
    is_admin: bool = False
    
    # Profile
    full_name: str | None = None
    language: str = "en"
    country: str | None = None
    timezone: str = "UTC"

    # Subscription
    subscription_plan: str = "free"
    is_trial: bool = False
    trial_ends_at: datetime | None = None
    subscription_ends_at: datetime | None = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: str | None = None
    language: str = "en"
    country: str | None = None
    timezone: str = "UTC"

class DevLoginIn(BaseModel):
    email: EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

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

