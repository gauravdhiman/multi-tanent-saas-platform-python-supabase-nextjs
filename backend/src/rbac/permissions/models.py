"""
Pydantic models for Permission management in RBAC.
"""

from typing import Optional
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class PermissionBase(BaseModel):
    """Base model for Permission."""
    name: str = Field(..., min_length=1, max_length=100, description="Permission name")
    description: Optional[str] = Field(None, max_length=500, description="Permission description")
    resource: str = Field(..., min_length=1, max_length=50, description="Resource this permission applies to")
    action: str = Field(..., min_length=1, max_length=50, description="Action this permission allows")


class PermissionCreate(PermissionBase):
    """Model for creating a new permission."""
    pass


class PermissionUpdate(BaseModel):
    """Model for updating a permission."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Permission name")
    description: Optional[str] = Field(None, max_length=500, description="Permission description")
    resource: Optional[str] = Field(None, min_length=1, max_length=50, description="Resource this permission applies to")
    action: Optional[str] = Field(None, min_length=1, max_length=50, description="Action this permission allows")


class Permission(PermissionBase):
    """Model for a permission with all attributes."""
    id: UUID = Field(..., description="Permission ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class RolePermission(BaseModel):
    """Model for the relationship between roles and permissions."""
    id: UUID = Field(..., description="RolePermission ID")
    role_id: UUID = Field(..., description="Role ID")
    permission_id: UUID = Field(..., description="Permission ID")
    created_at: datetime = Field(..., description="Creation timestamp")