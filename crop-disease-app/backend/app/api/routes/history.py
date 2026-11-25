import json
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db import crud
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/analyses")
async def get_analysis_history(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analyses = await crud.get_analyses_by_user(db, current_user.id, limit=limit)
    return [
        {
            "id": a.id,
            "crop_name": a.crop_name,
            "disease_name": a.disease_name,
            "confidence": a.confidence,
            "severity": a.severity,
            "is_diseased": a.is_diseased,
            "image_url": f"/uploads/{os.path.basename(a.image_path)}" if a.image_path else None,
            "language": a.language,
            "created_at": str(a.created_at),
        }
        for a in analyses
    ]


@router.get("/chat-sessions")
async def get_chat_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = await crud.get_user_chat_sessions(db, current_user.id)
    return {"sessions": sessions}


@router.get("/chat-session/{session_id}")
async def get_session_messages(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    messages = await crud.get_chat_history(db, session_id, limit=100)
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


@router.delete("/analysis/{analysis_id}")
async def delete_analysis(
    analysis_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analysis = await crud.get_analysis_by_id(db, analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if analysis.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    # Delete image file
    if analysis.image_path and os.path.exists(analysis.image_path):
        try:
            os.remove(analysis.image_path)
        except Exception:
            pass
    await db.delete(analysis)
    await db.commit()
    return {"message": "Analysis deleted"}
