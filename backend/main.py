"""
FastAPI application entry point for the multi-tenant SaaS platform.
Includes basic health endpoint and CORS configuration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import uvicorn

from config import settings


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
    
    return app


# Create the FastAPI app instance
app = create_app()


@app.get("/")
async def root():
    """Root endpoint with basic API information."""
    return JSONResponse({
        "message": "Multi-tenant SaaS Platform API",
        "version": settings.app_version,
        "environment": settings.environment,
        "timestamp": datetime.utcnow().isoformat(),
    })


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring and load balancers."""
    return JSONResponse({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.app_version,
        "environment": settings.environment,
        "checks": {
            "api": "ok",
            # Future health checks will be added here:
            # "database": "ok",
            # "redis": "ok",
            # "external_apis": "ok",
        }
    })


@app.get("/health/ready")
async def readiness_check():
    """Readiness check for Kubernetes deployments."""
    return JSONResponse({
        "status": "ready",
        "timestamp": datetime.utcnow().isoformat(),
    })


@app.get("/health/live")
async def liveness_check():
    """Liveness check for Kubernetes deployments."""
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