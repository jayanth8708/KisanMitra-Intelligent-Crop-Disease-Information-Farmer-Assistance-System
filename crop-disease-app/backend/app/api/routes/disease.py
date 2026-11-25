import os
import uuid
import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db import crud
from app.core.config import settings
from app.core.security import get_optional_user
from app.services.gemini_service import gemini_vision_service
from app.services.rag_service import rag_service
from app.utils.image_utils import validate_image, preprocess_image, get_image_info
from app.models.user import User

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"}
MAX_SIZE_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


@router.post("/analyze")
async def analyze_disease(
    file: UploadFile = File(...),
    language: str = Form(default="en"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type not supported: {file.content_type}")

    # Read file contents
    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE_MB}MB")

    # Save raw upload
    raw_filename = f"raw_{uuid.uuid4().hex}_{file.filename}"
    raw_path = os.path.join(settings.UPLOAD_DIR, raw_filename)
    with open(raw_path, "wb") as f:
        f.write(contents)

    # Validate it's a real image
    is_valid, reason = validate_image(raw_path)
    if not is_valid:
        os.remove(raw_path)
        raise HTTPException(status_code=400, detail=f"Invalid image: {reason}")

    # Pre-process image (fix orientation, resize, sharpen)
    try:
        processed_path = preprocess_image(raw_path, settings.UPLOAD_DIR)
    except Exception as e:
        processed_path = raw_path  # fallback to raw

    # Clean up raw file if processed successfully
    if processed_path != raw_path and os.path.exists(raw_path):
        try:
            os.remove(raw_path)
        except Exception:
            pass

    # Get image metadata
    img_info = get_image_info(processed_path)

    # RAG context for disease analysis
    rag_context = ""
    rag_sources = []
    try:
        # Use filename as a hint for the query
        query = f"crop disease symptoms treatment {Path(file.filename).stem}"
        docs, metas = await rag_service.retrieve(query, language=language, n_results=3)
        if docs:
            rag_context = "\n".join(docs[:2])
            rag_sources = [{"name": m.get("source", ""), "type": m.get("type", "")} for m in metas]
    except Exception:
        pass

    # Gemini Vision Analysis
    result = await gemini_vision_service.analyze_image(processed_path, language=language)
    result["image_info"] = img_info
    result["rag_sources"] = rag_sources

    # Build relative URL for the image
    image_url = f"/uploads/{os.path.basename(processed_path)}"
    result["image_url"] = image_url

    # Persist to DB
    try:
        analysis = await crud.create_analysis(
            db,
            user_id=current_user.id if current_user else None,
            image_path=processed_path,
            original_filename=file.filename,
            language=language,
            crop_name=result.get("crop_name", ""),
            disease_name=result.get("disease_name", ""),
            confidence=result.get("confidence", 0.0),
            symptoms=result.get("symptoms", ""),
            severity=result.get("severity", ""),
            prevention=result.get("prevention", ""),
            management=result.get("management", ""),
            recommendations=result.get("recommendations", ""),
            sources=json.dumps(rag_sources),
            is_diseased=result.get("is_diseased", "uncertain"),
            raw_response=result.get("raw_response", ""),
        )
        result["analysis_id"] = analysis.id
    except Exception as e:
        result["analysis_id"] = None
        result["db_error"] = str(e)

    return JSONResponse(content=result)


@router.get("/analysis/{analysis_id}")
async def get_analysis(
    analysis_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    analysis = await crud.get_analysis_by_id(db, analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {
        "id": analysis.id,
        "crop_name": analysis.crop_name,
        "disease_name": analysis.disease_name,
        "confidence": analysis.confidence,
        "symptoms": analysis.symptoms,
        "severity": analysis.severity,
        "prevention": analysis.prevention,
        "management": analysis.management,
        "recommendations": analysis.recommendations,
        "is_diseased": analysis.is_diseased,
        "image_url": f"/uploads/{os.path.basename(analysis.image_path)}",
        "language": analysis.language,
        "created_at": str(analysis.created_at),
        "sources": json.loads(analysis.sources) if analysis.sources else [],
    }
