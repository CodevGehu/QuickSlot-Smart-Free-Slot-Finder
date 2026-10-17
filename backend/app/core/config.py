from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    
    # PostgreSQL 18
    DATABASE_URL: str = "postgresql+psycopg2://postgres@127.0.0.1:5433/postgres"
    PG_HOST: str = "127.0.0.1"
    PG_PORT: int = 5433
    PG_DATABASE: str = "postgres"
    PG_USER: str = "postgres"
    PG_PASSWORD: str = ""
    
    # Valkey / Cache
    VALKEY_URL: str = "valkey://127.0.0.1:6379/0"
    CACHE_ENABLED: bool = True
    CACHE_TTL_MIN: int = 25
    CACHE_TTL_MAX: int = 35
    
    # Security
    SESSION_SECRET_KEY: str = "dev-campus-free-slot-finder-session-secret-key-32-chars-long!"
    CAMPUS_ID: str = "main-campus-gehu"
    
    # Uploads & Storage
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")
    MAX_UPLOAD_SIZE_MB: int = 25
    
    # Worker
    WORKER_POLL_INTERVAL_SEC: float = 2.0
    WORKER_LEASE_DURATION_SEC: int = 60
    MAX_JOB_RETRIES: int = 3
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
