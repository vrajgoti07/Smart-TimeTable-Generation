"""
Application Configuration
Loads settings from environment variables
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, SecretStr
from typing import Optional

class Settings(BaseSettings):
    """
    Application settings for Smart Timetable.
    Loads from environment variables or .env file.
    Required variables: MONGODB_URL, SECRET_KEY
    """
    # Database
    MONGODB_URL: str = Field(..., alias="MONGODB_URL")
    DATABASE_NAME: str = Field("timetable_db", alias="DATABASE_NAME")
    
    # Security
    SECRET_KEY: SecretStr = Field(..., alias="SECRET_KEY")
    ALGORITHM: str = Field("HS256", alias="ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(1440, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # Frontend/CORS
    FRONTEND_URL: str = Field("http://localhost:5173", alias="FRONTEND_URL")

    # Load from .env file
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore"
    )

try:
    settings = Settings()
except Exception as e:
    import sys
    print(f"\n❌ CONFIGURATION ERROR: {e}")
    print("Ensure all required environment variables are set in your .env file.\n")
    raise e
