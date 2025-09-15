"""
FastAPI application entry point for the multi-tenant SaaS platform.
Includes authentication, health endpoints and CORS configuration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import uvicorn
import logging
from opentelemetry import trace
from config import settings
from config import supabase_config
from src.auth.routes import auth_router
from src.rbac.routes import rbac_router
from src.organization.routes import organization_router
from src.billing.routes import router as billing_router

# Import the OpenTelemetry setup function first to ensure proper logging configuration
from config.opentelemetry import emit_log, emit_metric, setup_manual_opentelemetry, logging_level

# Configure logging to ensure it outputs to stdout with proper formatting
# The OpenTelemetry logging handler is added in the setup_manual_opentelemetry function
logging.basicConfig(
    level=logging_level,
    format='%(name)s - %(levelname)s - %(message)s'
)

# Set up OpenTelemetry explicitly to ensure logger and meter providers are available
# This needs to happen before configuring logging to ensure proper integration
setup_manual_opentelemetry()


# Get tracer for this module
tracer = trace.get_tracer(__name__)

# Test logging to verify OpenTelemetry is working
logging.info("Backend application starting up")
print("Backend application starting up")  # Print to stdout for visibility
emit_log("Backend application started", "INFO", {"service": "saas-platform-backend"})
emit_metric("backend.app.start", 1, {"service": "saas-platform-backend"})

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
    
    # Instrument the FastAPI app with OpenTelemetry
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.requests import RequestsInstrumentor
        
        # Define URLs to exclude from instrumentation (health check endpoints)
        excluded_urls = "/health,/health/ready,/health/live"
        FastAPIInstrumentor.instrument_app(app, excluded_urls=excluded_urls)
        RequestsInstrumentor().instrument()
        logging.info("FastAPI instrumentation completed")
        print("FastAPI instrumentation completed")  # Print to stdout for visibility
    except Exception as e:
        logging.error(f"Failed to instrument FastAPI app: {e}")
        print(f"Failed to instrument FastAPI app: {e}")  # Print to stdout for visibility

    # Include authentication routes
    app.include_router(auth_router)
    
    # Include RBAC routes
    app.include_router(rbac_router)
    
    # Include organization routes
    app.include_router(organization_router)
    
    # Include billing routes
    app.include_router(billing_router)
    
    
    return app


# Create the FastAPI app instance
app = create_app()

# Emit a test log and metric when the app starts
# These should be captured by the OpenTelemetry auto-instrumentation
logging.info("Backend application started")
emit_log("Backend application started", "INFO", {"service": "saas-platform-backend"})
emit_metric("backend.app.start", 1, {"service": "saas-platform-backend"})

@app.get("/")
async def root():
    """Root endpoint with basic API information."""
    # Log a message using OpenTelemetry
    logging.info("Root endpoint accessed")
    print("Root endpoint accessed")  # Print to stdout for visibility
    emit_metric("backend.endpoint.access", 1, {"endpoint": "/"})
    
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
    # logging.info("Health check endpoint accessed")
    # emit_log("Health check endpoint accessed", "INFO", {"endpoint": "/health"})
    # emit_metric("backend.health.check", 1, {"status": "healthy"})
    
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
    emit_metric("backend.readiness.check", 1, {"status": "ready"})
    
    return JSONResponse({
        "status": "ready",
        "timestamp": datetime.utcnow().isoformat(),
    })


@app.get("/health/live")
async def liveness_check():
    """Liveness check for Kubernetes deployments."""
    # Log a message using OpenTelemetry
    logging.info("Liveness check endpoint accessed")
    emit_metric("backend.liveness.check", 1, {"status": "alive"})
    
    return JSONResponse({
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat(),
    })


@app.get("/test-otel")
@tracer.start_as_current_span("auth.sign_in")
async def test_opentelemetry():
    """Test endpoint to verify OpenTelemetry tracing is working."""
    import time
    current_span = trace.get_current_span()
    # from opentelemetry import trace
    
    # Get the current tracer
    # tracer = trace.get_tracer(__name__)
    
    # Create a span to test tracing
    current_span.set_attribute("test.attribute", "test-value")
    current_span.add_event("Test event in span")
    
    # Simulate some work
    time.sleep(0.1)
    
    # Log a message
    logging.info("OpenTelemetry test endpoint accessed")
    emit_log("OpenTelemetry test endpoint accessed", "INFO", {"endpoint": "/test-otel"})
    emit_metric("backend.test.otel", 1, {"endpoint": "/test-otel"})
    
    # Add another event
    current_span.add_event("Test event after work")
    
    return JSONResponse({
        "message": "OpenTelemetry test completed",
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