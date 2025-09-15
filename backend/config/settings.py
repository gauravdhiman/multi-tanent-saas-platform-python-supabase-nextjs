"""
Application settings and configuration management.
Uses Pydantic Settings for type-safe configuration handling.
"""

from typing import Optional
import json
from pydantic import Field, validator
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
    supabase_anon_key: Optional[str] = Field(default=None, description="Supabase anonymous key")
    
    # Stripe Settings
    stripe_secret_key: Optional[str] = Field(default=None, description="Stripe secret key")
    stripe_webhook_secret: Optional[str] = Field(default=None, description="Stripe webhook endpoint secret")
    
    # OpenTelemetry Settings
    new_relic_license_key: Optional[str] = Field(default=None, description="New Relic license key")
    otel_enabled: bool = Field(default=False, description="Enable OpenTelemetry")
    otel_service_name: str = Field(default="saas-platform-backend", description="OpenTelemetry service name")
    
    # OpenTelemetry Traces Settings
    otel_exporter_otlp_traces_endpoint: Optional[str] = Field(default=None, description="OTLP traces endpoint")
    otel_exporter_otlp_traces_headers: Optional[str] = Field(default=None, description="OTLP traces headers")
    otel_exporter_otlp_traces_protocol: str = Field(default="http/protobuf", description="OTLP traces protocol")
    otel_exporter_otlp_traces_insecure: bool = Field(default=False, description="OTLP traces insecure mode")
    
    # OpenTelemetry Metrics Settings
    otel_exporter_otlp_metrics_endpoint: Optional[str] = Field(default=None, description="OTLP metrics endpoint")
    otel_exporter_otlp_metrics_headers: Optional[str] = Field(default=None, description="OTLP metrics headers")
    otel_exporter_otlp_metrics_protocol: str = Field(default="http/protobuf", description="OTLP metrics protocol")
    otel_exporter_otlp_metrics_insecure: bool = Field(default=False, description="OTLP metrics insecure mode")
    
    # OpenTelemetry Logs Settings
    otel_exporter_otlp_logs_endpoint: Optional[str] = Field(default=None, description="OTLP logs endpoint")
    otel_exporter_otlp_logs_headers: Optional[str] = Field(default=None, description="OTLP logs headers")
    otel_exporter_otlp_logs_protocol: str = Field(default="http/protobuf", description="OTLP logs protocol")
    otel_exporter_otlp_logs_insecure: bool = Field(default=False, description="OTLP logs insecure mode")
    
    @validator('cors_origins', pre=True)
    def parse_cors_origins(cls, v):
        """Parse CORS origins from environment variable string."""
        if isinstance(v, str):
            # Try to parse as JSON array first
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                # If not valid JSON, split by comma and strip whitespace
                return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "allow"  # Allow extra fields that are not explicitly defined


# Global settings instance
settings = Settings()