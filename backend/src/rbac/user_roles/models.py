"""
Pydantic models for User Role management in RBAC.
"""

from typing import Optional, List
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime

from src.rbac.roles.models import RoleWithPermissions


class UserRoleBase(BaseModel):
    """Base model for the relationship between users and roles."""
    user_id: UUID = Field(..., description="User ID")
    role_id: UUID = Field(..., description="Role ID")
    organization_id: Optional[UUID] = Field(None, description="Organization ID (NULL for platform-wide roles)")


class UserRoleCreate(UserRoleBase):
    """Model for creating a new user-role relationship."""
    pass


class UserRoleUpdate(BaseModel):
    """Model for updating a user-role relationship."""
    role_id: Optional[UUID] = Field(None, description="Role ID")
    organization_id: Optional[UUID] = Field(None, description="Organization ID (NULL for platform-wide roles)")


class UserRole(UserRoleBase):
    """Model for a user-role relationship with all attributes."""
    id: UUID = Field(..., description="UserRole ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class UserWithRoles(BaseModel):
    """Model for a user with their assigned roles."""
    id: UUID = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    first_name: Optional[str] = Field(None, description="User first name")
    last_name: Optional[str] = Field(None, description="User last name")
    is_verified: bool = Field(default=False, description="Whether the user's email is verified")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    roles: List[RoleWithPermissions] = Field(default=[], description="List of roles assigned to this user")
