"""
Pydantic models for Organization functionality.
"""

from typing import Optional
from pydantic import BaseModel, Field, HttpUrl
from uuid import UUID
from datetime import datetime


class OrganizationBase(BaseModel):
    """Base model for Organization."""
    name: str = Field(..., min_length=1, max_length=100, description="Organization name")
    description: Optional[str] = Field(None, max_length=500, description="Organization description")
    slug: str = Field(..., min_length=1, max_length=100, description="Organization slug (unique identifier)")
    website: Optional[HttpUrl] = Field(None, description="Organization website URL")
    is_active: bool = Field(default=True, description="Whether the organization is active")


class OrganizationCreate(OrganizationBase):
    """Model for creating a new organization."""
    pass


class OrganizationUpdate(BaseModel):
    """Model for updating an organization."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Organization name")
    description: Optional[str] = Field(None, max_length=500, description="Organization description")
    slug: Optional[str] = Field(None, min_length=1, max_length=100, description="Organization slug (unique identifier)")
    website: Optional[HttpUrl] = Field(None, description="Organization website URL")
    is_active: Optional[bool] = Field(None, description="Whether the organization is active")


class Organization(OrganizationBase):
    """Model for an organization with all attributes."""
    id: UUID = Field(..., description="Organization ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")