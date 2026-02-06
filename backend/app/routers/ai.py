from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime

from sqlalchemy import text as sql_text

from app.deps import get_db
from app.auth_dev import get_current_user
from app.models import User
from app.chat_models import ChatThread, ChatMessage

from app.llm import client, build_instructions
from app.config import settings
from app.embeddings import embed_texts

router = APIRouter(prefix="/ai", tags=["ai"])


def vec_to_pgvector(v: list[float]) -> str:
    return "[" + ",".join(f"{x:.8f}" for x in v) + "]"


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
    q = (
        select(ChatThread)
        .where(ChatThread.user_id == user.id)
        .order_by(ChatThread.created_at.desc())
    )
    threads = list(db.scalars(q).all())
    return [{"id": t.id, "title": t.title, "created_at": t.created_at.isoformat()} for t in threads]


@router.get("/threads/{thread_id}/messages", response_model=list[MsgOut])
def list_thread_messages(
    thread_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    thread = db.scalar(
        select(ChatThread).where(ChatThread.id == thread_id, ChatThread.user_id == user.id)
    )
    if not thread:
        return []
    q = (
        select(ChatMessage)
        .where(ChatMessage.thread_id == thread_id)
        .order_by(ChatMessage.created_at.asc())
    )
    msgs = list(db.scalars(q).all())
    return [
        {"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
        for m in msgs
    ]


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    text = payload.message.strip()
    if not text:
        return {
            "reply": "Say something and I’ll respond.",
            "created_at": datetime.utcnow().isoformat(),
            "thread_id": payload.thread_id or 0,
        }

    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")

    # 1) Find or create thread
    thread = None
    if payload.thread_id:
        thread = db.scalar(
            select(ChatThread).where(ChatThread.id == payload.thread_id, ChatThread.user_id == user.id)
        )

    if thread is None:
        thread = ChatThread(user_id=user.id, title="Chat")
        db.add(thread)
        db.commit()
        db.refresh(thread)

    # 2) Store user message
    db.add(ChatMessage(thread_id=thread.id, role="user", content=text))
    db.commit()

    # 3) Build OpenAI messages (history + user message)
    input_msgs: list[dict] = []
    for h in payload.history[-12:]:
        role = h.role if h.role in ("user", "assistant") else "user"
        input_msgs.append({"role": role, "content": h.content})
    input_msgs.append({"role": "user", "content": text})

    # 3.5) RAG: retrieve top chunks and inject as grounding context
    try:
        qvec = vec_to_pgvector(embed_texts([text])[0])
        rows = db.execute(
            sql_text(
                """
                SELECT content
                FROM rag_chunks
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> (:qvec)::vector
                LIMIT 5
                """
            ),
            {"qvec": qvec},
        ).fetchall()

        context = "\n\n---\n\n".join([r[0] for r in rows]) if rows else ""

        if context:
            input_msgs.insert(
                0,
                {
                    "role": "system",
                    "content": (
                        "Use the following knowledge snippets as grounding. "
                        "If not relevant to the user’s question, ignore them.\n\n"
                        f"{context}"
                    ),
                },
            )
    except Exception:
        pass

    # 4) OpenAI reply
    try:
        res = client.responses.create(
            model=settings.openai_model,
            instructions=build_instructions(),
            input=input_msgs,
        )
        reply = res.output_text or "I’m here with you — tell me a bit more."
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenAI request failed: {e}")

    # 5) Store assistant reply
    db.add(ChatMessage(thread_id=thread.id, role="assistant", content=reply))
    db.commit()

    return {"reply": reply, "created_at": datetime.utcnow().isoformat(), "thread_id": thread.id}
