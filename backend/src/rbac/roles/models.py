"""
Pydantic models for Role management in RBAC.
"""

from typing import Optional, List
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime

from src.rbac.permissions.models import Permission


class RoleBase(BaseModel):
    """Base model for Role."""
    name: str = Field(..., min_length=1, max_length=50, description="Role name")
    description: Optional[str] = Field(None, max_length=500, description="Role description")
    is_system_role: bool = Field(default=False, description="Whether this is a system role")


class RoleCreate(RoleBase):
    """Model for creating a new role."""
    pass


class RoleUpdate(BaseModel):
    """Model for updating a role."""
    name: Optional[str] = Field(None, min_length=1, max_length=50, description="Role name")
    description: Optional[str] = Field(None, max_length=500, description="Role description")
    is_system_role: Optional[bool] = Field(None, description="Whether this is a system role")


class Role(RoleBase):
    """Model for a role with all attributes."""
    id: UUID = Field(..., description="Role ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class RoleWithPermissions(Role):
    """Model for a role with its associated permissions."""
    permissions: List[Permission] = Field(default=[], description="List of permissions assigned to this role")
