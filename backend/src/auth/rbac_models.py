"""
Pydantic models for Role-Based Access Control (RBAC).
"""

from typing import Optional, List
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class OrganizationBase(BaseModel):
    """Base model for Organization."""
    name: str = Field(..., min_length=1, max_length=100, description="Organization name")
    description: Optional[str] = Field(None, max_length=500, description="Organization description")
    slug: str = Field(..., min_length=1, max_length=100, description="Organization slug (unique identifier)")
    is_active: bool = Field(default=True, description="Whether the organization is active")


class OrganizationCreate(OrganizationBase):
    """Model for creating a new organization."""
    pass


class OrganizationUpdate(BaseModel):
    """Model for updating an organization."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Organization name")
    description: Optional[str] = Field(None, max_length=500, description="Organization description")
    slug: Optional[str] = Field(None, min_length=1, max_length=100, description="Organization slug (unique identifier)")
    is_active: Optional[bool] = Field(None, description="Whether the organization is active")


class Organization(OrganizationBase):
    """Model for an organization with all attributes."""
    id: UUID = Field(..., description="Organization ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


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


class RoleWithPermissions(Role):
    """Model for a role with its associated permissions."""
    permissions: List[Permission] = Field(default=[], description="List of permissions assigned to this role")


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