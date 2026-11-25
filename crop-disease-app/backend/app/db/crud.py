from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional, List
from app.models.user import User
from app.models.analysis import Analysis, ChatMessage
from app.core.security import hash_password


# ─── User CRUD ──────────────────────────────────────────────────────────────

async def create_user(db: AsyncSession, username: str, email: str, full_name: str, password: str, language: str = "en") -> User:
    user = User(
        username=username,
        email=email,
        full_name=full_name,
        hashed_password=hash_password(password),
        preferred_language=language,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def update_user_language(db: AsyncSession, user_id: int, language: str):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user:
        user.preferred_language = language
        await db.commit()


# ─── Analysis CRUD ──────────────────────────────────────────────────────────

async def create_analysis(db: AsyncSession, **kwargs) -> Analysis:
    analysis = Analysis(**kwargs)
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)
    return analysis


async def get_analyses_by_user(db: AsyncSession, user_id: int, limit: int = 20) -> List[Analysis]:
    result = await db.execute(
        select(Analysis).where(Analysis.user_id == user_id).order_by(desc(Analysis.created_at)).limit(limit)
    )
    return result.scalars().all()


async def get_analysis_by_id(db: AsyncSession, analysis_id: int) -> Optional[Analysis]:
    result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
    return result.scalar_one_or_none()


# ─── Chat CRUD ──────────────────────────────────────────────────────────────

async def save_chat_message(db: AsyncSession, **kwargs) -> ChatMessage:
    msg = ChatMessage(**kwargs)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


async def get_chat_history(db: AsyncSession, session_id: str, limit: int = 20) -> List[ChatMessage]:
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at).limit(limit)
    )
    return result.scalars().all()


async def get_user_chat_sessions(db: AsyncSession, user_id: int) -> List[str]:
    result = await db.execute(
        select(ChatMessage.session_id).where(ChatMessage.user_id == user_id).distinct()
    )
    return [row[0] for row in result.fetchall()]
