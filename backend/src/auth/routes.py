"""
Authentication API routes.
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Header
from fastapi.responses import JSONResponse

from .models import SignUpRequest, SignInRequest, AuthResponse, ErrorResponse, UserProfile
from .service import auth_service


# Create auth router
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])


@auth_router.post("/signup", response_model=AuthResponse, responses={
    400: {"model": ErrorResponse, "description": "Validation error"},
    409: {"model": ErrorResponse, "description": "User already exists"},
    500: {"model": ErrorResponse, "description": "Internal server error"}
})
async def sign_up(request: SignUpRequest) -> JSONResponse:
    """
    Register a new user account.
    
    - **email**: Valid email address
    - **password**: Strong password (8+ chars, uppercase, lowercase, number, special char)
    - **password_confirm**: Must match password
    - **first_name**: User's first name
    - **last_name**: User's last name
    """
    auth_response, error = await auth_service.sign_up(request)
    
    if error:
        status_code = status.HTTP_400_BAD_REQUEST
        if error.error == "auth_error" and "already registered" in error.message.lower():
            status_code = status.HTTP_409_CONFLICT
        elif error.error == "internal_error":
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            
        return JSONResponse(
            status_code=status_code,
            content=error.model_dump()
        )
    
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=auth_response.model_dump()
    )


@auth_router.post("/signin", response_model=AuthResponse, responses={
    400: {"model": ErrorResponse, "description": "Invalid credentials"},
    500: {"model": ErrorResponse, "description": "Internal server error"}
})
async def sign_in(request: SignInRequest) -> JSONResponse:
    """
    Authenticate user with email and password.
    
    - **email**: Registered email address
    - **password**: User password
    """
    auth_response, error = await auth_service.sign_in(request)
    
    if error:
        status_code = status.HTTP_400_BAD_REQUEST
        if error.error == "internal_error":
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            
        return JSONResponse(
            status_code=status_code,
            content=error.model_dump()
        )
    
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=auth_response.model_dump()
    )


@auth_router.post("/signout", responses={
    200: {"description": "Successfully signed out"},
    400: {"model": ErrorResponse, "description": "Sign out failed"}
})
async def sign_out(authorization: str = Header(None)) -> JSONResponse:
    """
    Sign out user and invalidate session.
    
    Requires Authorization header with Bearer token.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "unauthorized", "message": "Missing or invalid authorization header"}
        )
    
    access_token = authorization.replace("Bearer ", "")
    success, error = await auth_service.sign_out(access_token)
    
    if error:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=error.model_dump()
        )
    
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Successfully signed out"}
    )


@auth_router.post("/refresh", response_model=AuthResponse, responses={
    400: {"model": ErrorResponse, "description": "Invalid refresh token"},
    500: {"model": ErrorResponse, "description": "Internal server error"}
})
async def refresh_token(request: Dict[str, str]) -> JSONResponse:
    """
    Refresh access token using refresh token.
    
    - **refresh_token**: Valid refresh token
    """
    refresh_token = request.get("refresh_token")
    if not refresh_token:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "missing_token", "message": "Refresh token is required"}
        )
    
    auth_response, error = await auth_service.refresh_token(refresh_token)
    
    if error:
        status_code = status.HTTP_400_BAD_REQUEST
        if error.error == "internal_error":
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            
        return JSONResponse(
            status_code=status_code,
            content=error.model_dump()
        )
    
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=auth_response.model_dump()
    )


@auth_router.get("/me", response_model=UserProfile, responses={
    401: {"model": ErrorResponse, "description": "Invalid or expired token"},
    500: {"model": ErrorResponse, "description": "Internal server error"}
})
async def get_current_user(authorization: str = Header(None)) -> JSONResponse:
    """
    Get current user profile.
    
    Requires Authorization header with Bearer token.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "unauthorized", "message": "Missing or invalid authorization header"}
        )
    
    access_token = authorization.replace("Bearer ", "")
    user_profile, error = await auth_service.get_user(access_token)
    
    if error:
        status_code = status.HTTP_401_UNAUTHORIZED
        if error.error == "internal_error":
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            
        return JSONResponse(
            status_code=status_code,
            content=error.model_dump()
        )
    
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=user_profile.model_dump()
    )