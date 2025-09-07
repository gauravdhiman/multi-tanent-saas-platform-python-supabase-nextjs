"""
FastAPI application entry point for the multi-tenant SaaS platform.
Includes authentication, health endpoints and CORS configuration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import uvicorn
import os
import logging

from config import settings, supabase_config
from config.opentelemetry import setup_opentelemetry, instrument_fastapi
from src.auth.routes import auth_router
from src.auth.rbac_routes import rbac_router
from src.auth.example_routes import example_router


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Multi-tenant SaaS platform API",
        debug=settings.debug,
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
    )
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=settings.cors_credentials,
        allow_methods=settings.cors_methods,
        allow_headers=settings.cors_headers,
    )
    
    # Include authentication routes
    app.include_router(auth_router)
    
    # Include RBAC routes
    app.include_router(rbac_router)
    
    # Include example routes (for demonstration)
    app.include_router(example_router)
    
    return app


# Create the FastAPI app instance
app = create_app()

# Set up OpenTelemetry if enabled
otel_enabled = os.getenv("OTEL_ENABLED", "false").lower() == "true"
if otel_enabled:
    providers = setup_opentelemetry(app_name="saas-platform-backend")
    tracer_provider, logger_provider, meter_provider = providers
    instrument_fastapi(app)

@app.get("/")
async def root():
    """Root endpoint with basic API information."""
    # Log a message using OpenTelemetry
    logging.info("Root endpoint accessed")
    
    return JSONResponse({
        "message": "Multi-tenant SaaS Platform API",
        "version": settings.app_version,
        "environment": settings.environment,
        "timestamp": datetime.utcnow().isoformat(),
    })


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring and load balancers."""
    # Log a message using OpenTelemetry
    logging.info("Health check endpoint accessed")
    
    checks = {
        "api": "ok"
    }
    
    # Check Supabase connection if configured
    if supabase_config.is_configured():
        supabase_healthy = supabase_config.health_check()
        checks["supabase"] = "ok" if supabase_healthy else "error"
    else:
        checks["supabase"] = "not_configured"
    
    return JSONResponse({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.app_version,
        "environment": settings.environment,
        "checks": checks
    })


@app.get("/health/ready")
async def readiness_check():
    """Readiness check for Kubernetes deployments."""
    # Log a message using OpenTelemetry
    logging.info("Readiness check endpoint accessed")
    
    return JSONResponse({
        "status": "ready",
        "timestamp": datetime.utcnow().isoformat(),
    })


@app.get("/health/live")
async def liveness_check():
    """Liveness check for Kubernetes deployments."""
    # Log a message using OpenTelemetry
    logging.info("Liveness check endpoint accessed")
    
    return JSONResponse({
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat(),
    })


if __name__ == "__main__":
    # For development - use uvicorn CLI for production
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        log_level="debug" if settings.debug else "info",
    )