import os
from pydantic_settings import BaseSettings

from typing import Optional

class Settings(BaseSettings):
    app_name: str = "AI Service"
    port: int = 8001
    environment: str = "development"
    
    # Required variables (no default value = raises error if missing)
    gemini_api_key: Optional[str] = None
    
    # Shared HS256 secret used by auth-service to sign access tokens (required to serve /ai/chat)
    jwt_secret: Optional[str] = None
    rate_limit_per_minute: int = 20
    max_prompt_chars: int = 4000
    max_context_chars: int = 50000

    # Optional with defaults
    cors_origin: str = "http://localhost:3000"
    mock_ai: bool = False
    mock_ai_on_error: bool = True
    ai_model: str = "gemini-2.5-flash"

    class Config:
        env_file = ".env"
        # We want to error on missing required fields, so we don't use extra="ignore" 
        # unless we specifically want to allow unknown env vars (which is fine).
        # But for missing fields, Pydantic defaults to erroring which is what we want.
        extra = "ignore" 

settings = Settings()
