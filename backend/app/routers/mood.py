from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class MoodEntry(BaseModel):
    mood: int  # 0-10
    note: str | None = None
    created_at: datetime | None = None

# TEMP in-memory storage (later: DB)
MOODS: list[MoodEntry] = []

@router.post("/mood")
def add_mood(entry: MoodEntry):
    entry.created_at = datetime.utcnow()
    MOODS.append(entry)
    return {"ok": True, "entry": entry}

@router.get("/mood")
def list_moods():
    return {"items": MOODS}
