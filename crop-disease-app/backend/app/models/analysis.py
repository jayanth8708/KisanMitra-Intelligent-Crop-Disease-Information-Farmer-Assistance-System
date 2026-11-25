from sqlalchemy import Column, Integer, String, DateTime, Text, Float, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    image_path = Column(String(500), nullable=False)
    original_filename = Column(String(255), nullable=True)
    language = Column(String(10), default="en")

    # Detection results
    crop_name = Column(String(100), nullable=True)
    disease_name = Column(String(200), nullable=True)
    confidence = Column(Float, nullable=True)
    symptoms = Column(Text, nullable=True)
    severity = Column(String(50), nullable=True)
    prevention = Column(Text, nullable=True)
    management = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)
    sources = Column(Text, nullable=True)   # JSON list of source references
    raw_response = Column(Text, nullable=True)
    is_diseased = Column(String(20), nullable=True)  # "yes", "no", "uncertain"

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    session_id = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)   # "user" or "assistant"
    content = Column(Text, nullable=False)
    language = Column(String(10), default="en")
    sources = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
