from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime

from app.deps import get_db
from app.auth_dev import get_current_user
from app.models import User
from app.chat_models import ChatThread, ChatMessage



router = APIRouter(prefix="/ai", tags=["ai"])

class ChatMessageIn(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessageIn] = []
    thread_id: int | None = None

class ChatResponse(BaseModel):
    reply: str
    created_at: str
    thread_id: int

class ThreadOut(BaseModel):
    id: int
    title: str
    created_at: str

class MsgOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: str

@router.get("/threads", response_model=list[ThreadOut])
def list_threads(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = select(ChatThread).where(ChatThread.user_id == user.id).order_by(ChatThread.created_at.desc())
    threads = list(db.scalars(q).all())
    return [{"id": t.id, "title": t.title, "created_at": t.created_at.isoformat()} for t in threads]

@router.get("/threads/{thread_id}/messages", response_model=list[MsgOut])
def list_thread_messages(thread_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    thread = db.scalar(select(ChatThread).where(ChatThread.id == thread_id, ChatThread.user_id == user.id))
    if not thread:
        return []
    q = select(ChatMessage).where(ChatMessage.thread_id == thread_id).order_by(ChatMessage.created_at.asc())
    msgs = list(db.scalars(q).all())
    return [{"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at.isoformat()} for m in msgs]


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    text = payload.message.strip()
    if not text:
        return {"reply": "Say something and I’ll respond.", "created_at": datetime.utcnow().isoformat(), "thread_id": payload.thread_id or 0}

    # 1) Find or create thread
    thread = None
    if payload.thread_id:
        thread = db.scalar(select(ChatThread).where(ChatThread.id == payload.thread_id, ChatThread.user_id == user.id))

    if thread is None:
        thread = ChatThread(user_id=user.id, title="Chat")
        db.add(thread)
        db.commit()
        db.refresh(thread)

    # 2) Store user message
    db.add(ChatMessage(thread_id=thread.id, role="user", content=text))
    db.commit()

    # 3) Mock reply (replace in B)
    reply = (
        "I hear you. Thanks for sharing.\n\n"
        "If you want, tell me:\n"
        "1) What happened today?\n"
        "2) What are you feeling right now?\n"
        "3) What would help even 1%?\n\n"
        "Note: This is a wellness support tool, not medical advice."
    )

    # 4) Store assistant reply
    db.add(ChatMessage(thread_id=thread.id, role="assistant", content=reply))
    db.commit()

    return {"reply": reply, "created_at": datetime.utcnow().isoformat(), "thread_id": thread.id}
