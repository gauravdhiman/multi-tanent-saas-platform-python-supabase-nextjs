"""
Application settings and configuration management.
Uses Pydantic Settings for type-safe configuration handling.
"""

from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Application Settings
    app_name: str = Field(default="SaaS Platform API", description="Application name")
    app_version: str = Field(default="1.0.0", description="Application version")
    debug: bool = Field(default=False, description="Debug mode")
    environment: str = Field(default="development", description="Environment (development/production)")
    
    # Server Settings
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    reload: bool = Field(default=True, description="Auto-reload on code changes")
    
    # CORS Settings
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        description="Allowed CORS origins"
    )
    cors_credentials: bool = Field(default=True, description="Allow CORS credentials")
    cors_methods: list[str] = Field(default=["*"], description="Allowed CORS methods")
    cors_headers: list[str] = Field(default=["*"], description="Allowed CORS headers")
    
    # Database Settings (Future Supabase integration)
    database_url: Optional[str] = Field(default=None, description="Database connection URL")
    
    # Redis Settings (Future integration)
    redis_url: Optional[str] = Field(default=None, description="Redis connection URL")
    
    # JWT Settings (Future auth integration)
    jwt_secret_key: Optional[str] = Field(default=None, description="JWT secret key")
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    jwt_expire_minutes: int = Field(default=30, description="JWT expiration in minutes")
    
    # External API Settings (Future integrations)
    supabase_url: Optional[str] = Field(default=None, description="Supabase project URL")
    supabase_service_key: Optional[str] = Field(default=None, description="Supabase service key")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = Settings()