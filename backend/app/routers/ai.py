from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime
import io

from sqlalchemy import text as sql_text

from app.deps import get_db
from app.auth_dev import get_current_user
from app.models import User
from app.chat_models import ChatThread, ChatMessage

from app.llm import client, build_instructions
from app.config import settings
from app.embeddings import embed_texts

from app.safety import detect_crisis, crisis_response
from app.auth import get_current_user


router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...), 
    user: User = Depends(get_current_user)
):
    """
    Transcribe uploaded audio file (blob) to text using OpenAI Whisper.
    """
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")

    try:
        # Read file content
        content = await file.read()
        
        # We need to pass a file-like object with a name to OpenAI API
        # The 'name' attribute helps OpenAI determine the file type (e.g. .webm, .mp3)
        buffer = io.BytesIO(content)
        buffer.name = file.filename or "audio.webm"  
        
        # Call OpenAI Whisper
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=buffer,
            response_format="text"
        )
        
        # 'transcript' is just the text string when response_format="text"
        return {"text": transcript}

    except Exception as e:
        print(f"TRANSCRIPTION ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


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

    # 2.5) Safety guardrail: if crisis detected, do NOT call OpenAI
    sr = detect_crisis(text)
    if sr.is_crisis:
        reply = crisis_response()
        db.add(ChatMessage(thread_id=thread.id, role="assistant", content=reply))
        db.commit()
        return {"reply": reply, "created_at": datetime.utcnow().isoformat(), "thread_id": thread.id}

    # 3) Build OpenAI messages (history + user message)
    input_msgs: list[dict] = []
    for h in payload.history[-12:]:
        role = h.role if h.role in ("user", "assistant") else "user"
        input_msgs.append({"role": role, "content": h.content})
    input_msgs.append({"role": "user", "content": text})

    # 3.1) Inject Reminders Context
    from app.models import Reminder
    reminders = db.scalars(
        select(Reminder)
        .where(Reminder.user_id == user.id, Reminder.email_enabled == True)
        .order_by(Reminder.next_trigger.asc())
    ).all()
    
    if reminders:
        lines = ["Active Reminders:"]
        for r in reminders:
            recur = f" (Recurring: {r.recurrence_pattern})" if r.is_recurring else ""
            lines.append(f"- {r.title} at {r.next_trigger}{recur}")
        reminder_text = "\n".join(lines)
        
        input_msgs.insert(0, {
            "role": "system", 
            "content": f"User's Schedule:\n{reminder_text}\n(Use this to answer related questions)"
        })

    # 3.5) RAG: retrieve global knowledge + user memory and inject as grounding context
    try:
        qvec = vec_to_pgvector(embed_texts([text])[0])

        # A) Global knowledge RAG (rag_chunks)
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
        global_context = "\n\n---\n\n".join([r[0] for r in rows]) if rows else ""

        # B) Personalized memory RAG (user_memories)
        mem_rows = db.execute(
            sql_text(
                """
                SELECT content
                FROM user_memories
                WHERE user_id = :uid AND embedding IS NOT NULL
                ORDER BY embedding <=> (:qvec)::vector
                LIMIT 5
                """
            ),
            {"uid": user.id, "qvec": qvec},
        ).fetchall()
        user_context = "\n\n".join([r[0] for r in mem_rows]) if mem_rows else ""

        if user_context:
            input_msgs.insert(
                0,
                {
                    "role": "system",
                    "content": (
                        "User context (personal history snippets). Use carefully. "
                        "Do not claim certainty; phrase as suggestions.\n\n"
                        f"{user_context}"
                    ),
                },
            )

        if global_context:
            input_msgs.insert(
                0,
                {
                    "role": "system",
                    "content": (
                        "Knowledge base snippets (grounding). "
                        "Use if relevant; otherwise ignore.\n\n"
                        f"{global_context}"
                    ),
                },
            )
    except Exception as e:
        print(f"RAG ERROR: {e}")
        db.rollback()

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


class TTSRequest(BaseModel):
    text: str
    voice: str = "alloy"


@router.post("/tts")
def text_to_speech(payload: TTSRequest, user: User = Depends(get_current_user)):
    """
    Generates audio from text using OpenAI TTS.
    """
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")

    try:
        response = client.audio.speech.create(
            model="tts-1",
            voice=payload.voice,
            input=payload.text,
        )
        return Response(content=response.content, media_type="audio/mpeg")
    except Exception as e:
        print(f"TTS ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


class VirtualChatRequest(BaseModel):
    message: str
    user_emotion: str = "neutral"
    history: list[ChatMessageIn] = []


class VirtualChatResponse(BaseModel):
    reply: str
    assistant_emotion: str


@router.post("/virtual-chat", response_model=VirtualChatResponse)
def virtual_chat(
    payload: VirtualChatRequest, user: User = Depends(get_current_user)
):
    text = payload.message.strip()
    emotion = payload.user_emotion.lower()
    
    if not text:
         return {"reply": "I'm listening...", "assistant_emotion": "neutral"}

    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")

    # 1) Safety check
    sr = detect_crisis(text)
    if sr.is_crisis:
        return {
            "reply": "I'm concerned about what you just said. Please, if you're in danger, reach out to emergency services immediately.",
            "assistant_emotion": "concerned"
        }

    # 2) Build System Prompt
    base_system = (
        "You are a warm, empathetic, and supportive virtual friend. "
        "Keep your responses SHORT (1-2 sentences max) and conversational, suitable for spoken dialogue. "
        "Do not use markdown or lists. Just talk naturally."
    )
    
    emotion_context = ""
    if emotion in ["sad", "angry", "fearful", "disgusted"]:
        emotion_context = f"The user looks {emotion}. Be extra gentle, validating, and supportive. acknowledged their visible emotion."
    elif emotion in ["happy", "surprised"]:
        emotion_context = f"The user looks {emotion}. Match their energy and be positive."
    else:
        emotion_context = "The user looks neutral. Be calm and friendly."

    final_system = f"{base_system}\n{emotion_context}"

    # 3) Build Messages
    input_msgs = [{"role": "system", "content": final_system}]
    for h in payload.history[-6:]:  # Keep history short for voice
        role = h.role if h.role in ("user", "assistant") else "user"
        input_msgs.append({"role": role, "content": h.content})
    input_msgs.append({"role": "user", "content": text})

    # 4) Call LLM
    try:
        # o1-mini / o3-mini models do not support temperature != 1
        # It's safest to omit it or set to 1 if using those models. 
        # Since we might be using o1-mini via settings.openai_model, we'll omit it locally 
        # or use a default if your library/model supports it. 
        # For wide compatibility with reasoning models, we remove explicit temperature or set to 1.
        
        res = client.chat.completions.create(
            model=settings.openai_model,
            messages=input_msgs,
            # temperature=1, # Default is usually 1, or forced to 1 by o1-mini
        )
        reply = res.choices[0].message.content.strip()
        
        # Determine assistant emotion based on reply content (simple heuristic or separate LLM call - keeping simple for now)
        # Default to 'neutral' or 'happy' unless mapped
        assistant_emotion = "neutral"
        if any(x in reply.lower() for x in ["sorry", "sad", "hard", "tough", "here for you"]):
            assistant_emotion = "concerned"
        elif any(x in reply.lower() for x in ["great", "awesome", "happy", "good news"]):
            assistant_emotion = "happy"
            
        return {"reply": reply, "assistant_emotion": assistant_emotion}

    except Exception as e:
        print(f"VIRTUAL CHAT ERROR: {e}")
        raise HTTPException(status_code=502, detail=f"OpenAI request failed: {e}")


class TransformRequest(BaseModel):
    text: str
    mode: str  # summarize, rewrite, plan


@router.post("/transform")
def transform_text(payload: TransformRequest, user: User = Depends(get_current_user)):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")

    instructions = ""
    if payload.mode == "summarize":
        instructions = "Summarize this journal entry in 2-3 sentences. Capture the core emotion and key events."
    elif payload.mode == "rewrite":
        instructions = "Rewrite this journal entry to be clearer and more self-compassionate. Fix grammar but keep the tone personal/journal-like."
    elif payload.mode == "plan":
        instructions = "Based on this journal entry, suggest 3 small, concrete, actionable steps the user can take to feel better or move forward. Format as a bulleted list."
    else:
        raise HTTPException(status_code=400, detail=f"Invalid mode: {payload.mode}")

    try:
        # We use a simple chat completion here
        res = client.responses.create(
            model=settings.openai_model,
            instructions="You are a helpful wellness AI assistant.",
            input=[
                {"role": "user", "content": f"{instructions}\n\nInput text:\n{text}"}
            ]
        )
        output = res.output_text or "Could not generate a response."
        return {"output": output}
    except Exception as e:
        print(f"OPENAI TRANSFORM ERROR: {e}")
        raise HTTPException(status_code=502, detail="AI request failed")
