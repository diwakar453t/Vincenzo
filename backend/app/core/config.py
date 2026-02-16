from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "PreSkool ERP"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database - defaults to SQLite for local dev, use PostgreSQL in production
    DATABASE_URL: str = "sqlite:///./preskool.db"
    
    # Redis (optional for local dev)
    REDIS_URL: str = "redis://localhost:6379"
    
    # Keycloak (optional for local dev)
    KEYCLOAK_URL: str = "http://localhost:8080"
    KEYCLOAK_REALM: str = "preskool"
    KEYCLOAK_CLIENT_ID: str = "preskool-api"
    KEYCLOAK_CLIENT_SECRET: Optional[str] = None
    
    # JWT
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5173"]
    
    # File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
