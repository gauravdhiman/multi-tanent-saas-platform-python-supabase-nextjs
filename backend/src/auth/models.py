"""
Pydantic models for authentication requests and responses.
"""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from uuid import UUID
import re
from src.rbac.roles.models import UserRoleWithPermissions


class SignUpRequest(BaseModel):
    """User registration request model."""
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=128, description="User password")
    password_confirm: str = Field(..., description="Password confirmation")
    first_name: str = Field(..., min_length=1, max_length=50, description="User first name")
    last_name: str = Field(..., min_length=1, max_length=50, description="User last name")
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        # Check for at least one uppercase letter
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        
        # Check for at least one lowercase letter
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        
        # Check for at least one digit
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        
        # Check for at least one special character
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)')
        
        return v
    
    def model_post_init(self, __context) -> None:
        """Validate that passwords match."""
        if self.password != self.password_confirm:
            raise ValueError('Passwords do not match')


class SignInRequest(BaseModel):
    """User login request model."""
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=1, description="User password")


class AuthResponse(BaseModel):
    """Authentication response model."""
    
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration in seconds")
    refresh_token: Optional[str] = Field(None, description="Refresh token")
    user: "UserProfile" = Field(..., description="User profile information")


class UserProfile(BaseModel):
    """User profile information."""

    id: UUID = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    first_name: str = Field(..., description="User first name")
    last_name: str = Field(..., description="User last name")
    email_confirmed_at: Optional[str] = Field(None, description="Email confirmation timestamp")
    created_at: str = Field(..., description="Account creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    has_organizations: Optional[bool] = Field(None, description="Whether the user has organizations")
    roles: list[UserRoleWithPermissions] = Field(default=[], description="User's roles with organization context")

    def has_role(self, role_name: str, organization_id: Optional[str] = None) -> bool:
        """Check if user has a specific role."""
        for user_role in self.roles:
            if user_role.role.name == role_name:
                # If organization_id is specified, check if role is for that organization
                if organization_id:
                    # Check if this role is assigned to the user for the specific organization
                    if str(user_role.organization_id) == organization_id:
                        return True
                else:
                    # For platform-wide roles (organization_id is None)
                    if role_name == "platform_admin" and user_role.organization_id is None:
                        return True
        return False

    def has_permission(self, permission_name: str, organization_id: Optional[str] = None) -> bool:
        """Check if user has a specific permission."""
        for user_role in self.roles:
            for permission in user_role.role.permissions:
                if permission.name == permission_name:
                    # If organization_id is specified, check if role is for that organization
                    if organization_id:
                        if str(user_role.organization_id) == organization_id:
                            return True
                    else:
                        # For platform-wide permissions
                        if user_role.role.name == "platform_admin" and user_role.organization_id is None:
                            return True
        return False


class ErrorResponse(BaseModel):
    """Error response model."""
    
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[dict] = Field(None, description="Additional error details")


# Update forward references
AuthResponse.model_rebuild()