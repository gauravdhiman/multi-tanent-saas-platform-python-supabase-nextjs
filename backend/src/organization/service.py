"""
Organization service for managing organizations in a multi-tenant SaaS platform.
"""

import logging
from typing import List, Optional, Tuple
from uuid import UUID
from opentelemetry import trace, metrics
from config import supabase_config
from src.organization.models import Organization, OrganizationCreate, OrganizationUpdate

logger = logging.getLogger(__name__)

# Get tracer for this module
tracer = trace.get_tracer(__name__)

# Get meter for this module
meter = metrics.get_meter(__name__)

# Create metrics
organization_operations_counter = meter.create_counter(
    "organization.operations",
    description="Number of organization operations"
)

organization_errors_counter = meter.create_counter(
    "organization.errors",
    description="Number of organization operation errors"
)


class OrganizationService:
    """Service for handling organization operations."""
    
    def __init__(self):
        self.supabase_config = supabase_config
    
    @property
    def supabase(self):
        """Get Supabase client, raise error if not configured."""
        if not self.supabase_config.is_configured():
            logger.error("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
            raise ValueError("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
        return self.supabase_config.client
    
    @tracer.start_as_current_span("organization.create_organization")
    async def create_organization(self, org_data: OrganizationCreate) -> Tuple[Optional[Organization], Optional[str]]:
        """Create a new organization."""
        organization_operations_counter.add(1, {"operation": "create_organization"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("organization.name", org_data.name)
        try:
            response = self.supabase.table("organizations").insert({
                "name": org_data.name,
                "description": org_data.description,
                "slug": org_data.slug,
                "is_active": org_data.is_active
            }).execute()
            
            if not response.data:
                logger.error(f"Failed to create organization: {org_data.name}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Failed to create organization"))
                organization_errors_counter.add(1, {"operation": "create_organization", "error": "no_data_returned"})
                return None, "Failed to create organization"
            
            org_dict = response.data[0]
            organization = Organization(
                id=org_dict["id"],
                name=org_dict["name"],
                description=org_dict["description"],
                slug=org_dict["slug"],
                is_active=org_dict["is_active"],
                created_at=org_dict["created_at"],
                updated_at=org_dict["updated_at"]
            )
            current_span.set_attribute("organization.id", str(organization.id))
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return organization, None
            
        except Exception as e:
            logger.error(f"Exception while creating organization '{org_data.name}': {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            organization_errors_counter.add(1, {"operation": "create_organization", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("organization.get_organization_by_id")
    async def get_organization_by_id(self, org_id: UUID) -> Tuple[Optional[Organization], Optional[str]]:
        """Get an organization by its ID."""
        organization_operations_counter.add(1, {"operation": "get_organization_by_id"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("organization.id", str(org_id))
        try:
            response = self.supabase.table("organizations").select("*").eq("id", str(org_id)).execute()
            
            if not response.data:
                logger.warning(f"Organization not found: {org_id}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Organization not found"))
                organization_errors_counter.add(1, {"operation": "get_organization_by_id", "error": "not_found"})
                return None, "Organization not found"
            
            org_dict = response.data[0]
            organization = Organization(
                id=org_dict["id"],
                name=org_dict["name"],
                description=org_dict["description"],
                slug=org_dict["slug"],
                is_active=org_dict["is_active"],
                created_at=org_dict["created_at"],
                updated_at=org_dict["updated_at"]
            )
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return organization, None
            
        except Exception as e:
            logger.error(f"Exception while getting organization {org_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            organization_errors_counter.add(1, {"operation": "get_organization_by_id", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("organization.get_organization_by_slug")
    async def get_organization_by_slug(self, slug: str) -> Tuple[Optional[Organization], Optional[str]]:
        """Get an organization by its slug."""
        organization_operations_counter.add(1, {"operation": "get_organization_by_slug"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("organization.slug", slug)
        try:
            response = self.supabase.table("organizations").select("*").eq("slug", slug).execute()
            
            if not response.data:
                logger.warning(f"Organization not found with slug: {slug}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Organization not found"))
                organization_errors_counter.add(1, {"operation": "get_organization_by_slug", "error": "not_found"})
                return None, "Organization not found"
            
            org_dict = response.data[0]
            organization = Organization(
                id=org_dict["id"],
                name=org_dict["name"],
                description=org_dict["description"],
                slug=org_dict["slug"],
                is_active=org_dict["is_active"],
                created_at=org_dict["created_at"],
                updated_at=org_dict["updated_at"]
            )
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return organization, None
            
        except Exception as e:
            logger.error(f"Exception while getting organization with slug '{slug}': {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            organization_errors_counter.add(1, {"operation": "get_organization_by_slug", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("organization.get_all_organizations")
    async def get_all_organizations(self) -> Tuple[List[Organization], Optional[str]]:
        """Get all organizations."""
        organization_operations_counter.add(1, {"operation": "get_all_organizations"})
        
        try:
            response = self.supabase.table("organizations").select("*").execute()
            
            organizations = []
            for org_dict in response.data:
                organizations.append(Organization(
                    id=org_dict["id"],
                    name=org_dict["name"],
                    description=org_dict["description"],
                    slug=org_dict["slug"],
                    is_active=org_dict["is_active"],
                    created_at=org_dict["created_at"],
                    updated_at=org_dict["updated_at"]
                ))
            
            return organizations, None
            
        except Exception as e:
            logger.error(f"Exception while getting all organizations: {e}", exc_info=True)
            organization_errors_counter.add(1, {"operation": "get_all_organizations", "error": "exception"})
            return [], str(e)
    
    @tracer.start_as_current_span("organization.update_organization")
    async def update_organization(self, org_id: UUID, org_data: OrganizationUpdate) -> Tuple[Optional[Organization], Optional[str]]:
        """Update an organization."""
        organization_operations_counter.add(1, {"operation": "update_organization"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("organization.id", str(org_id))
        try:
            update_data = {}
            if org_data.name is not None:
                update_data["name"] = org_data.name
                current_span.set_attribute("organization.name.updated", True)
            if org_data.description is not None:
                update_data["description"] = org_data.description
            if org_data.slug is not None:
                update_data["slug"] = org_data.slug
                current_span.set_attribute("organization.slug.updated", True)
            if org_data.is_active is not None:
                update_data["is_active"] = org_data.is_active
            
            if not update_data:
                return await self.get_organization_by_id(org_id)
            
            response = self.supabase.table("organizations").update(update_data).eq("id", str(org_id)).execute()
            
            if not response.data:
                logger.error(f"Organization not found or update failed: {org_id}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Organization not found or update failed"))
                organization_errors_counter.add(1, {"operation": "update_organization", "error": "not_found_or_failed"})
                return None, "Organization not found or update failed"
            
            org_dict = response.data[0]
            organization = Organization(
                id=org_dict["id"],
                name=org_dict["name"],
                description=org_dict["description"],
                slug=org_dict["slug"],
                is_active=org_dict["is_active"],
                created_at=org_dict["created_at"],
                updated_at=org_dict["updated_at"]
            )
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return organization, None
            
        except Exception as e:
            logger.error(f"Exception while updating organization {org_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            organization_errors_counter.add(1, {"operation": "update_organization", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("organization.delete_organization")
    async def delete_organization(self, org_id: UUID) -> Tuple[bool, Optional[str]]:
        """Delete an organization."""
        organization_operations_counter.add(1, {"operation": "delete_organization"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("organization.id", str(org_id))
        try:
            response = self.supabase.table("organizations").delete().eq("id", str(org_id)).execute()
            
            if not response.data:
                logger.warning(f"Organization not found for deletion: {org_id}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Organization not found"))
                organization_errors_counter.add(1, {"operation": "delete_organization", "error": "not_found"})
                return False, "Organization not found"
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return True, None
            
        except Exception as e:
            logger.error(f"Exception while deleting organization {org_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            organization_errors_counter.add(1, {"operation": "delete_organization", "error": "exception"})
            return False, str(e)


# Global organization service instance
organization_service = OrganizationService()