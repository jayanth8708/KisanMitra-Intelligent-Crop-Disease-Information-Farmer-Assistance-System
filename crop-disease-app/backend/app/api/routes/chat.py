import json
import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_optional_user
from app.db import crud
from app.db.database import get_db
from app.models.user import User
from app.services.chatbot_service import chatbot_service
from app.services.gemini_helper import AIQuotaError

router = APIRouter()

ALLOWED_AUDIO_TYPES = {
    "audio/webm",
    "audio/ogg",
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/aac",
    "audio/flac",
    "video/webm",  # some browsers label MediaRecorder audio streams as video/webm
}
MAX_AUDIO_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


class ChatRequest(BaseModel):
    message: str
    language: str = "en"
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    sources: List[dict] = []
    suggested_questions: List[str] = []


class VoiceChatResponse(ChatResponse):
    transcript: str


async def _process_chat_turn(
    db: AsyncSession,
    current_user: Optional[User],
    message_text: str,
    language: str,
    session_id: Optional[str],
) -> dict:
    """Run RAG + Gemini chat, persist both turns to SQLite, and return response fields."""
    active_session_id = session_id or str(uuid.uuid4())

    history_messages = await crud.get_chat_history(db, active_session_id, limit=16)
    conversation_history = [
        {"role": msg.role, "content": msg.content}
        for msg in history_messages
    ]

    try:
        reply, sources = await chatbot_service.chat(
            message=message_text,
            language=language,
            conversation_history=conversation_history,
            session_id=active_session_id,
        )
    except AIQuotaError as e:
        raise HTTPException(status_code=429, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail="AI service is temporarily busy. Please try again in a few seconds.",
        )

    user_id = current_user.id if current_user else None
    await crud.save_chat_message(
        db,
        user_id=user_id,
        session_id=active_session_id,
        role="user",
        content=message_text,
        language=language,
    )
    await crud.save_chat_message(
        db,
        user_id=user_id,
        session_id=active_session_id,
        role="assistant",
        content=reply,
        language=language,
        sources=json.dumps(sources),
    )

    suggestions = await chatbot_service.suggest_questions(language)
    return {
        "reply": reply,
        "session_id": active_session_id,
        "sources": sources,
        "suggested_questions": suggestions[:3],
    }


@router.post("/message", response_model=ChatResponse)
async def chat_message(
    data: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    if not data.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    result = await _process_chat_turn(
        db=db,
        current_user=current_user,
        message_text=data.message.strip(),
        language=data.language,
        session_id=data.session_id,
    )
    return ChatResponse(**result)


@router.post("/voice", response_model=VoiceChatResponse)
async def chat_voice(
    audio: UploadFile = File(...),
    language: str = Form(default="en"),
    session_id: Optional[str] = Form(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    raw_mime = (audio.content_type or "audio/webm").split(";")[0].strip().lower()
    if raw_mime not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported audio format: {audio.content_type}")

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio recording is empty")
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Audio file too large. Maximum size is {settings.MAX_FILE_SIZE_MB}MB",
        )

    # Normalize video/webm MediaRecorder container to audio/webm for Gemini audio handling
    gemini_mime = "audio/webm" if raw_mime == "video/webm" else raw_mime
    try:
        transcript = await chatbot_service.transcribe_audio(
            audio_bytes=audio_bytes,
            mime_type=gemini_mime,
            language=language,
        )
    except AIQuotaError as e:
        raise HTTPException(status_code=429, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Voice transcription failed. Please try again or type your question.",
        )

    if not transcript:
        raise HTTPException(
            status_code=400,
            detail="Could not detect clear speech in the recording. Please speak clearly and try again.",
        )

    result = await _process_chat_turn(
        db=db,
        current_user=current_user,
        message_text=transcript,
        language=language,
        session_id=session_id,
    )
    return VoiceChatResponse(transcript=transcript, **result)


@router.get("/history/{session_id}")
async def get_chat_history(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    messages = await crud.get_chat_history(db, session_id, limit=50)
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "language": m.language,
            "created_at": str(m.created_at),
        }
        for m in messages
    ]


@router.get("/suggestions")
async def get_suggestions(language: str = "en"):
    suggestions = await chatbot_service.suggest_questions(language)
    return {"suggestions": suggestions}
