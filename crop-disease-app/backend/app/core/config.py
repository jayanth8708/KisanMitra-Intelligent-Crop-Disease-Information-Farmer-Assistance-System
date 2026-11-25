from pydantic_settings import BaseSettings
from typing import List
import json
import os


class Settings(BaseSettings):
    # API Keys
    GEMINI_API_KEY: str = ""
    COHERE_API_KEY: str = ""

    # JWT
    SECRET_KEY: str = "change-this-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Database
    DATABASE_URL: str = "sqlite:///./data/crop_disease.db"

    # ChromaDB
    CHROMA_DB_PATH: str = "./data/chroma_db"

    # Uploads
    UPLOAD_DIR: str = "./data/uploads"
    MAX_FILE_SIZE_MB: int = 10

    # CORS (comma-separated string or JSON list string)
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def allowed_origins_list(self) -> List[str]:
        val = self.ALLOWED_ORIGINS.strip()
        if val.startswith("["):
            try:
                parsed = json.loads(val)
                if isinstance(parsed, list):
                    return [str(o).strip() for o in parsed if str(o).strip()]
            except Exception:
                pass
        return [o.strip() for o in val.split(",") if o.strip()]

    # App
    APP_NAME: str = "Intelligent Crop Disease Information and Farmer Assistance System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def model_post_init(self, __context):
        # Ensure upload dir exists
        os.makedirs(self.UPLOAD_DIR, exist_ok=True)
        os.makedirs(self.CHROMA_DB_PATH, exist_ok=True)
        os.makedirs("./data", exist_ok=True)


settings = Settings()
