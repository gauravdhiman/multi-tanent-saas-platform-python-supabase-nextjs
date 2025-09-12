"""
Authentication API routes.
"""

from typing import Dict
from fastapi import APIRouter, status, Header
from fastapi.responses import JSONResponse
from opentelemetry import trace

from src.auth.models import SignUpRequest, SignInRequest, AuthResponse, ErrorResponse, UserProfile
from src.auth.service import auth_service

# Get tracer for this module
tracer = trace.get_tracer(__name__)

# Create auth router
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])


@auth_router.post("/signup", response_model=AuthResponse, responses={
    400: {"model": ErrorResponse, "description": "Validation error"},
    409: {"model": ErrorResponse, "description": "User already exists"},
    500: {"model": ErrorResponse, "description": "Internal server error"}
})
@tracer.start_as_current_span("auth.routes.sign_up")
async def sign_up(request: SignUpRequest) -> JSONResponse:
    """
    Register a new user account.
    
    - **email**: Valid email address
    - **password**: Strong password (8+ chars, uppercase, lowercase, number, special char)
    - **password_confirm**: Must match password
    - **first_name**: User's first name
    - **last_name**: User's last name
    """
    current_span = trace.get_current_span()
    current_span.set_attribute("user.email", request.email)
    
    auth_response, error = await auth_service.sign_up(request)
    
    if error:
        status_code = status.HTTP_400_BAD_REQUEST
        if error.error == "auth_error" and "already registered" in error.message.lower():
            status_code = status.HTTP_409_CONFLICT
            current_span.set_attribute("error.type", "user_already_exists")
        elif error.error == "internal_error":
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            current_span.set_attribute("error.type", "internal_error")
        
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error.message))
        return JSONResponse(
            status_code=status_code,
            content=error.model_dump()
        )
    
    current_span.set_attribute("user.id", str(auth_response.user.id))
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=auth_response.model_dump()
    )


@auth_router.post("/signin", response_model=AuthResponse, responses={
    400: {"model": ErrorResponse, "description": "Invalid credentials"},
    500: {"model": ErrorResponse, "description": "Internal server error"}
})
@tracer.start_as_current_span("auth.routes.sign_in")
async def sign_in(request: SignInRequest) -> JSONResponse:
    """
    Authenticate user with email and password.
    
    - **email**: Registered email address
    - **password**: User password
    """
    current_span = trace.get_current_span()
    current_span.set_attribute("user.email", request.email)
    
    auth_response, error = await auth_service.sign_in(request)
    
    if error:
        status_code = status.HTTP_400_BAD_REQUEST
        if error.error == "internal_error":
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            current_span.set_attribute("error.type", "internal_error")
        else:
            current_span.set_attribute("error.type", "invalid_credentials")
        
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error.message))
        return JSONResponse(
            status_code=status_code,
            content=error.model_dump()
        )
    
    current_span.set_attribute("user.id", str(auth_response.user.id))
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=auth_response.model_dump()
    )


@auth_router.post("/signout", responses={
    200: {"description": "Successfully signed out"},
    400: {"model": ErrorResponse, "description": "Sign out failed"}
})
@tracer.start_as_current_span("auth.routes.sign_out")
async def sign_out(authorization: str = Header(None)) -> JSONResponse:
    """
    Sign out user and invalidate session.
    
    Requires Authorization header with Bearer token.
    """
    current_span = trace.get_current_span()
    if not authorization or not authorization.startswith("Bearer "):
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Missing or invalid authorization header"))
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "unauthorized", "message": "Missing or invalid authorization header"}
        )
    
    access_token = authorization.replace("Bearer ", "")
    current_span.set_attribute("token.provided", True)
    
    success, error = await auth_service.sign_out(access_token)
    
    if error:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error.message))
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=error.model_dump()
        )
    
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Successfully signed out"}
    )


@auth_router.post("/refresh", response_model=AuthResponse, responses={
    400: {"model": ErrorResponse, "description": "Invalid refresh token"},
    500: {"model": ErrorResponse, "description": "Internal server error"}
})
@tracer.start_as_current_span("auth.routes.refresh_token")
async def refresh_token(request: Dict[str, str]) -> JSONResponse:
    """
    Refresh access token using refresh token.
    
    - **refresh_token**: Valid refresh token
    """
    current_span = trace.get_current_span()
    refresh_token = request.get("refresh_token")
    if not refresh_token:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Refresh token is required"))
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "missing_token", "message": "Refresh token is required"}
        )
    
    current_span.set_attribute("token.provided", True)
    
    auth_response, error = await auth_service.refresh_token(refresh_token)
    
    if error:
        status_code = status.HTTP_400_BAD_REQUEST
        if error.error == "internal_error":
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            current_span.set_attribute("error.type", "internal_error")
        else:
            current_span.set_attribute("error.type", "invalid_token")
        
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error.message))
        return JSONResponse(
            status_code=status_code,
            content=error.model_dump()
        )
    
    current_span.set_attribute("user.id", str(auth_response.user.id))
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=auth_response.model_dump()
    )


@auth_router.get("/me", response_model=UserProfile, responses={
    401: {"model": ErrorResponse, "description": "Invalid or expired token"},
    500: {"model": ErrorResponse, "description": "Internal server error"}
})
@tracer.start_as_current_span("auth.routes.get_current_user")
async def get_current_user(authorization: str = Header(None)) -> JSONResponse:
    """
    Get current user profile.
    
    Requires Authorization header with Bearer token.
    """
    current_span = trace.get_current_span()
    if not authorization or not authorization.startswith("Bearer "):
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Missing or invalid authorization header"))
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "unauthorized", "message": "Missing or invalid authorization header"}
        )
    
    access_token = authorization.replace("Bearer ", "")
    current_span.set_attribute("token.provided", True)
    
    user_profile, error = await auth_service.get_current_user(access_token)
    
    if error:
        status_code = status.HTTP_401_UNAUTHORIZED
        if error.error == "internal_error":
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            current_span.set_attribute("error.type", "internal_error")
        else:
            current_span.set_attribute("error.type", "invalid_token")
        
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error.message))
        return JSONResponse(
            status_code=status_code,
            content=error.model_dump()
        )
    
    current_span.set_attribute("user.id", str(user_profile.id))
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=user_profile.model_dump()
    )