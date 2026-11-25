from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db import crud
from app.core.security import verify_password, create_access_token, get_current_user
from app.models.user import User

router = APIRouter()


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    language: str = "en"


class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str | None
    preferred_language: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if await crud.get_user_by_username(db, data.username):
        raise HTTPException(status_code=400, detail="Username already taken")
    if await crud.get_user_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = await crud.create_user(
        db,
        username=data.username,
        email=data.email,
        full_name=data.full_name,
        password=data.password,
        language=data.language,
    )
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await crud.get_user_by_username(db, data.username)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.patch("/language")
async def update_language(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lang = data.get("language", "en")
    if lang not in ["en", "hi", "te", "kn"]:
        raise HTTPException(status_code=400, detail="Unsupported language")
    await crud.update_user_language(db, current_user.id, lang)
    return {"message": "Language updated", "language": lang}
