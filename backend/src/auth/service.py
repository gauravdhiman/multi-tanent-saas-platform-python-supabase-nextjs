"""
Authentication service for handling user registration, login, and session management.
"""

from typing import Tuple, Optional
from fastapi import HTTPException, status
import logging
from opentelemetry import trace, metrics

from config import supabase_config
from .models import SignUpRequest, SignInRequest, AuthResponse, UserProfile
from .rbac_service import rbac_service

# Get tracer for this module
tracer = trace.get_tracer(__name__)

# Get meter for this module
meter = metrics.get_meter(__name__)

# Create metrics
auth_attempts_counter = meter.create_counter(
    "auth.attempts",
    description="Number of authentication attempts"
)

auth_success_counter = meter.create_counter(
    "auth.success",
    description="Number of successful authentications"
)

auth_failure_counter = meter.create_counter(
    "auth.failures",
    description="Number of failed authentications"
)

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
    
    @tracer.start_as_current_span("auth.sign_up")
    async def sign_up(self, request: SignUpRequest) -> Tuple[Optional[AuthResponse], Optional[HTTPException]]:
        """
        Register a new user account.
        
        Args:
            request: SignUpRequest with user registration details
            
        Returns:
            Tuple of (AuthResponse or None, HTTPException or None)
        """
        # Record metrics
        auth_attempts_counter.add(1, {"operation": "signup", "source": "backend"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("user.email", request.email)
        logging.info(f"Attempting to sign up user: {request.email}")
        
        try:
            # Sign up with Supabase Auth
            response = self.supabase.auth.sign_up({
                "email": request.email,
                "password": request.password,
                "options": {
                    "data": {
                        "first_name": request.first_name,
                        "last_name": request.last_name
                    }
                }
            })
            
            if not response or not response.user:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Sign up failed"))
                logging.error("Sign up failed - no user returned from Supabase")
                auth_failure_counter.add(1, {"operation": "signup", "error": "no_user_returned"})
                return None, HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to create user account"
                )
            
            user = response.user
            session = response.session
            
            # Log the successful sign up
            logging.info(f"User signed up successfully: {user.id}")
            current_span.set_attribute("user.id", str(user.id))
            auth_success_counter.add(1, {"operation": "signup"})
            
            # Get user profile from metadata
            user_metadata = user.user_metadata or {}
            profile = UserProfile(
                id=user.id,
                email=user.email,
                first_name=user_metadata.get("first_name", ""),
                last_name=user_metadata.get("last_name", ""),
                is_verified=user.email_confirmed_at is not None,
                created_at=user.created_at
            )
            
            # Create auth response
            auth_response = AuthResponse(
                user=profile,
                access_token=session.access_token if session else None,
                refresh_token=session.refresh_token if session else None
            )
            
            # Assign default org_admin role to new user
            try:
                # Get the org_admin role
                org_admin_role, role_error = await rbac_service.get_role_by_name("org_admin")
                if role_error or not org_admin_role:
                    logging.warning(f"Could not find org_admin role: {role_error}")
                else:
                    # Create a dummy organization for the user with recognizable pattern
                    from src.organization.models import OrganizationCreate
                    org_data = OrganizationCreate(
                        name=f"{user.email}'s Organization",
                        description=f"Default organization for {user.email}. Please update with your organization details.",
                        slug=f"{user.id[:8]}-dummy-org",
                        is_active=True
                    )
                    
                    from src.organization.service import organization_service
                    organization, org_error = await organization_service.create_organization(org_data)
                    if org_error or not organization:
                        logging.warning(f"Could not create default organization: {org_error}")
                    else:
                        # Assign org_admin role to user for their organization
                        from src.auth.rbac_models import UserRoleCreate
                        user_role_data = UserRoleCreate(
                            user_id=user.id,
                            role_id=org_admin_role.id,
                            organization_id=organization.id
                        )
                        
                        user_role, role_assign_error = await rbac_service.assign_role_to_user(user_role_data)
                        if role_assign_error or not user_role:
                            logging.warning(f"Could not assign org_admin role: {role_assign_error}")
                        else:
                            logging.info(f"Assigned org_admin role to user {user.id} for organization {organization.id}")
                            # Set attributes on current span
                            current_span.set_attribute("role.assigned", True)
                            current_span.set_attribute("organization.id", str(organization.id))
            
            except Exception as e:
                logging.error(f"Error assigning default role: {e}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return auth_response, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            logging.error(f"Sign up error: {e}")
            auth_failure_counter.add(1, {"operation": "signup", "error": "exception"})
            
            # Handle specific Supabase errors
            if "already registered" in str(e).lower():
                return None, HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="User already registered"
                )
            
            return None, HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error during sign up"
            )
    
    @tracer.start_as_current_span("auth.sign_in")
    async def sign_in(self, request: SignInRequest) -> Tuple[Optional[AuthResponse], Optional[HTTPException]]:
        """
        Authenticate user with email and password.
        
        Args:
            request: SignInRequest with user credentials
            
        Returns:
            Tuple of (AuthResponse or None, HTTPException or None)
        """
        # Record metrics
        auth_attempts_counter.add(1, {"operation": "signin", "source": "backend"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("user.email", request.email)
        logging.info(f"Attempting to sign in user: {request.email}")
        
        try:
            # Sign in with Supabase Auth
            response = self.supabase.auth.sign_in_with_password({
                "email": request.email,
                "password": request.password
            })
            
            if not response or not response.user:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Invalid credentials"))
                logging.warning(f"Sign in failed for user: {request.email}")
                auth_failure_counter.add(1, {"operation": "signin", "error": "invalid_credentials"})
                return None, HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid email or password"
                )
            
            user = response.user
            session = response.session
            
            # Log the successful sign in
            logging.info(f"User signed in successfully: {user.id}")
            current_span.set_attribute("user.id", str(user.id))
            auth_success_counter.add(1, {"operation": "signin"})
            
            # Get user profile from metadata
            user_metadata = user.user_metadata or {}
            profile = UserProfile(
                id=user.id,
                email=user.email,
                first_name=user_metadata.get("first_name", ""),
                last_name=user_metadata.get("last_name", ""),
                is_verified=user.email_confirmed_at is not None,
                created_at=user.created_at
            )
            
            # Create auth response
            auth_response = AuthResponse(
                user=profile,
                access_token=session.access_token if session else None,
                refresh_token=session.refresh_token if session else None
            )
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return auth_response, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            logging.error(f"Sign in error: {e}")
            auth_failure_counter.add(1, {"operation": "signin", "error": "exception"})
            return None, HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error during sign in"
            )
    
    @tracer.start_as_current_span("auth.sign_out")
    async def sign_out(self, access_token: str) -> Tuple[bool, Optional[HTTPException]]:
        """
        Sign out user and invalidate session.
        
        Args:
            access_token: User's access token
            
        Returns:
            Tuple of (success boolean, HTTPException or None)
        """
        # Record metrics
        auth_attempts_counter.add(1, {"operation": "signout", "source": "backend"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("token.provided", bool(access_token))
        logging.info("Attempting to sign out user")
        
        try:
            # Set auth session for Supabase client
            self.supabase.auth.set_session(access_token, None)
            
            # Sign out with Supabase Auth
            self.supabase.auth.sign_out()
            
            logging.info("User signed out successfully")
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            auth_success_counter.add(1, {"operation": "signout"})
            return True, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            logging.error(f"Sign out error: {e}")
            auth_failure_counter.add(1, {"operation": "signout", "error": "exception"})
            return False, HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to sign out"
            )
    
    @tracer.start_as_current_span("auth.refresh_token")
    async def refresh_token(self, refresh_token: str) -> Tuple[Optional[AuthResponse], Optional[HTTPException]]:
        """
        Refresh access token using refresh token.
        
        Args:
            refresh_token: Valid refresh token
            
        Returns:
            Tuple of (AuthResponse or None, HTTPException or None)
        """
        # Record metrics
        auth_attempts_counter.add(1, {"operation": "refresh_token", "source": "backend"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("token.provided", bool(refresh_token))
        logging.info("Attempting to refresh token")
        
        try:
            # Refresh session with Supabase Auth
            response = self.supabase.auth.refresh_session(refresh_token)
            
            if not response or not response.user:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Invalid refresh token"))
                logging.warning("Token refresh failed")
                auth_failure_counter.add(1, {"operation": "refresh_token", "error": "invalid_token"})
                return None, HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid refresh token"
                )
            
            user = response.user
            session = response.session
            
            # Log the successful token refresh
            logging.info(f"Token refreshed successfully for user: {user.id}")
            current_span.set_attribute("user.id", str(user.id))
            auth_success_counter.add(1, {"operation": "refresh_token"})
            
            # Get user profile from metadata
            user_metadata = user.user_metadata or {}
            profile = UserProfile(
                id=user.id,
                email=user.email,
                first_name=user_metadata.get("first_name", ""),
                last_name=user_metadata.get("last_name", ""),
                is_verified=user.email_confirmed_at is not None,
                created_at=user.created_at
            )
            
            # Create auth response
            auth_response = AuthResponse(
                user=profile,
                access_token=session.access_token if session else None,
                refresh_token=session.refresh_token if session else None
            )
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return auth_response, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            logging.error(f"Token refresh error: {e}")
            auth_failure_counter.add(1, {"operation": "refresh_token", "error": "exception"})
            return None, HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error during token refresh"
            )
    
    @tracer.start_as_current_span("auth.get_user")
    async def get_user(self, access_token: str) -> Tuple[Optional[UserProfile], Optional[HTTPException]]:
        """
        Get current user profile.
        
        Args:
            access_token: User's access token
            
        Returns:
            Tuple of (UserProfile or None, HTTPException or None)
        """
        # Record metrics
        auth_attempts_counter.add(1, {"operation": "get_user", "source": "backend"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("token.provided", bool(access_token))
        logging.info("Attempting to get user profile")
        
        try:
            # Set auth session for Supabase client
            self.supabase.auth.set_session(access_token, None)
            
            # Get current user from Supabase Auth
            user = self.supabase.auth.get_user().user
            
            if not user:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Invalid token"))
                logging.warning("Failed to get user - invalid token")
                auth_failure_counter.add(1, {"operation": "get_user", "error": "invalid_token"})
                return None, HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token"
                )
            
            # Log the successful user retrieval
            logging.info(f"Retrieved user profile: {user.id}")
            current_span.set_attribute("user.id", str(user.id))
            auth_success_counter.add(1, {"operation": "get_user"})
            
            # Get user profile from metadata
            user_metadata = user.user_metadata or {}
            profile = UserProfile(
                id=user.id,
                email=user.email,
                first_name=user_metadata.get("first_name", ""),
                last_name=user_metadata.get("last_name", ""),
                is_verified=user.email_confirmed_at is not None,
                created_at=user.created_at
            )
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return profile, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            logging.error(f"Get user error: {e}")
            auth_failure_counter.add(1, {"operation": "get_user", "error": "exception"})
            return None, HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error while fetching user profile"
            )


# Global auth service instance
auth_service = AuthService()