"""
Authentication service for handling user registration and login.
"""

from typing import Tuple, Optional
from gotrue import User, Session
from gotrue.errors import AuthError
from config import supabase_config
from .models import SignUpRequest, SignInRequest, AuthResponse, UserProfile, ErrorResponse
from .rbac_service import rbac_service
import asyncio


class AuthService:
    """Service for handling authentication operations."""
    
    def __init__(self):
        self.supabase_config = supabase_config
    
    @property
    def supabase(self):
        """Get Supabase client, raise error if not configured."""
        if not self.supabase_config.is_configured():
            raise ValueError("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
        return self.supabase_config.client
    
    async def sign_up(self, request: SignUpRequest) -> Tuple[Optional[AuthResponse], Optional[ErrorResponse]]:
        """Register a new user with Supabase Auth."""
        try:
            # Sign up with Supabase Auth
            auth_response = self.supabase.auth.sign_up({
                "email": request.email,
                "password": request.password,
                "options": {
                    "data": {
                        "first_name": request.first_name,
                        "last_name": request.last_name,
                    }
                }
            })
            
            if not auth_response.user:
                return None, ErrorResponse(
                    error="signup_failed",
                    message="Failed to create user account"
                )
            
            # Assign default role (org_admin) to the new user
            if auth_response.user:
                # Get the org_admin role
                org_admin_role, error = await rbac_service.get_role_by_name("org_admin")
                if not error and org_admin_role:
                    # Assign the role to the user
                    from .rbac_models import UserRoleCreate
                    user_role_data = UserRoleCreate(
                        user_id=auth_response.user.id,
                        role_id=org_admin_role.id,
                        organization_id=None  # Platform-wide role
                    )
                    await rbac_service.assign_role_to_user(user_role_data)
            
            # If no session (email confirmation required), return success message
            if not auth_response.session:
                return AuthResponse(
                    access_token="",
                    expires_in=0,
                    user=self._build_user_profile(auth_response.user)
                ), None
            
            # Return auth response with tokens
            return AuthResponse(
                access_token=auth_response.session.access_token,
                expires_in=auth_response.session.expires_in or 3600,
                refresh_token=auth_response.session.refresh_token,
                user=self._build_user_profile(auth_response.user)
            ), None
            
        except AuthError as e:
            return None, ErrorResponse(
                error="auth_error",
                message=str(e),
                details={"code": getattr(e, 'code', None)}
            )
        except Exception as e:
            return None, ErrorResponse(
                error="internal_error",
                message="An unexpected error occurred during registration"
            )
    
    async def sign_in(self, request: SignInRequest) -> Tuple[Optional[AuthResponse], Optional[ErrorResponse]]:
        """Authenticate user with email and password."""
        try:
            auth_response = self.supabase.auth.sign_in_with_password({
                "email": request.email,
                "password": request.password
            })
            
            if not auth_response.user or not auth_response.session:
                return None, ErrorResponse(
                    error="invalid_credentials",
                    message="Invalid email or password"
                )
            
            return AuthResponse(
                access_token=auth_response.session.access_token,
                expires_in=auth_response.session.expires_in or 3600,
                refresh_token=auth_response.session.refresh_token,
                user=self._build_user_profile(auth_response.user)
            ), None
            
        except AuthError as e:
            return None, ErrorResponse(
                error="auth_error",
                message=str(e),
                details={"code": getattr(e, 'code', None)}
            )
        except Exception as e:
            return None, ErrorResponse(
                error="internal_error",
                message="An unexpected error occurred during login"
            )
    
    async def sign_out(self, access_token: str) -> Tuple[bool, Optional[ErrorResponse]]:
        """Sign out user and invalidate session."""
        try:
            self.supabase.auth.sign_out()
            return True, None
        except Exception as e:
            return False, ErrorResponse(
                error="signout_error",
                message="Failed to sign out user"
            )
    
    async def refresh_token(self, refresh_token: str) -> Tuple[Optional[AuthResponse], Optional[ErrorResponse]]:
        """Refresh access token using refresh token."""
        try:
            auth_response = self.supabase.auth.refresh_session(refresh_token)
            
            if not auth_response.session or not auth_response.user:
                return None, ErrorResponse(
                    error="refresh_failed",
                    message="Failed to refresh token"
                )
            
            return AuthResponse(
                access_token=auth_response.session.access_token,
                expires_in=auth_response.session.expires_in or 3600,
                refresh_token=auth_response.session.refresh_token,
                user=self._build_user_profile(auth_response.user)
            ), None
            
        except AuthError as e:
            return None, ErrorResponse(
                error="auth_error",
                message=str(e)
            )
    
    async def get_user(self, access_token: str) -> Tuple[Optional[UserProfile], Optional[ErrorResponse]]:
        """Get user profile from access token."""
        try:
            user_response = self.supabase.auth.get_user(access_token)
            
            if not user_response.user:
                return None, ErrorResponse(
                    error="invalid_token",
                    message="Invalid or expired token"
                )
            
            return self._build_user_profile(user_response.user), None
            
        except AuthError as e:
            return None, ErrorResponse(
                error="auth_error",
                message=str(e)
            )
    
    def _build_user_profile(self, user: User) -> UserProfile:
        """Build UserProfile from Supabase User object."""
        user_metadata = user.user_metadata or {}
        
        return UserProfile(
            id=user.id,
            email=user.email or "",
            first_name=user_metadata.get("first_name", ""),
            last_name=user_metadata.get("last_name", ""),
            email_confirmed_at=user.email_confirmed_at,
            created_at=user.created_at,
            updated_at=user.updated_at
        )


# Global auth service instance
auth_service = AuthService()