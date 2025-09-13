"""
Organization API routes for the multi-tenant SaaS platform.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Depends
from opentelemetry import trace

from src.organization.models import Organization, OrganizationCreate, OrganizationUpdate
from src.organization.service import organization_service
from src.auth.middleware import get_current_user_id
from src.rbac.roles.service import role_service
from src.rbac.user_roles.service import user_role_service

# Get tracer for this module
tracer = trace.get_tracer(__name__)

# Create organization router
organization_router = APIRouter(prefix="/organizations", tags=["Organizations"])


@organization_router.post("/", response_model=Organization, status_code=status.HTTP_201_CREATED)
@tracer.start_as_current_span("organization.routes.create_organization")
async def create_organization(org_data: OrganizationCreate, current_user_id: UUID = Depends(get_current_user_id)):
    """Create a new organization (requires platform_admin role)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("organization.name", org_data.name)
    
    # Check if user has platform_admin role
    has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Only platform administrators can create organizations"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can create organizations"
        )
    
    organization, error = await organization_service.create_organization(org_data)
    if error:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    current_span.set_attribute("organization.id", str(organization.id))
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return organization


@organization_router.post("/self", response_model=Organization, status_code=status.HTTP_201_CREATED)
@tracer.start_as_current_span("organization.routes.create_self_organization")
async def create_self_organization(org_data: OrganizationCreate, current_user_id: UUID = Depends(get_current_user_id)):
    """Create a new organization for the current user and assign them as org_admin."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("organization.name", org_data.name)
    
    try:
        # Create the organization
        organization, error = await organization_service.create_organization(org_data)
        if error:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
        
        # Get the org_admin role
        org_admin_role, role_error = await role_service.get_role_by_name("org_admin")
        if role_error or not org_admin_role:
            # If org_admin role doesn't exist, we should still return the organization
            # but log the issue
            current_span.add_event("org_admin_role_not_found", {"error": str(role_error)})
        else:
            # Assign org_admin role to user for their organization
            from src.rbac.user_roles.models import UserRoleCreate
            user_role_data = UserRoleCreate(
                user_id=current_user_id,
                role_id=org_admin_role.id,
                organization_id=organization.id
            )
            
            user_role, role_assign_error = await user_role_service.assign_role_to_user(user_role_data)
            if role_assign_error or not user_role:
                # Log the error but don't fail the organization creation
                current_span.add_event("role_assignment_failed", {"error": str(role_assign_error)})
            else:
                current_span.add_event("role_assigned", {"role_id": str(org_admin_role.id), "organization_id": str(organization.id)})
        
        current_span.set_attribute("organization.id", str(organization.id))
        current_span.set_status(trace.Status(trace.StatusCode.OK))
        return organization
        
    except Exception as e:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create organization: {str(e)}"
        )


@organization_router.get("/{org_id}", response_model=Organization)
@tracer.start_as_current_span("organization.routes.get_organization")
async def get_organization(org_id: UUID, current_user_id: UUID = Depends(get_current_user_id)):
    """Get an organization by ID."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("organization.id", str(org_id))
    
    # Check if user has permission to view organizations
    has_permission, error = await user_role_service.user_has_permission(current_user_id, "organization:read")
    if error or not has_permission:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Insufficient permissions to view organizations"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view organizations"
        )
    
    # Additionally check if user belongs to this organization
    has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
    if not has_role:
        has_role, error = await user_role_service.user_has_role(current_user_id, "org_admin", org_id)
        if not has_role:
            has_permission, error = await user_role_service.user_has_permission(current_user_id, "organization:read", org_id)
            if error or not has_permission:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "You don't have access to this organization"))
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this organization"
                )
    
    organization, error = await organization_service.get_organization_by_id(org_id)
    if error:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error
        )
    
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return organization


@organization_router.get("/", response_model=List[Organization])
@tracer.start_as_current_span("organization.routes.get_all_organizations")
async def get_all_organizations(current_user_id: UUID = Depends(get_current_user_id)):
    """Get all organizations the user has access to."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    
    # Check if user has platform_admin role
    has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
    if error:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )
    
    if has_role:
        # Platform admin can see all organizations
        organizations, error = await organization_service.get_all_organizations()
        if error:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error
            )
        current_span.set_attribute("organizations.count", len(organizations))
        current_span.set_status(trace.Status(trace.StatusCode.OK))
        return organizations
    else:
        # Regular users and org admins can only see organizations they belong to
        organizations, error = await user_role_service.get_organizations_for_user(current_user_id)
        if error:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error
            )
        current_span.set_attribute("organizations.count", len(organizations))
        current_span.set_status(trace.Status(trace.StatusCode.OK))
        return organizations


@organization_router.put("/{org_id}", response_model=Organization)
@tracer.start_as_current_span("organization.routes.update_organization")
async def update_organization(org_id: UUID, org_data: OrganizationUpdate, current_user_id: UUID = Depends(get_current_user_id)):
    """Update an organization (requires platform_admin or org_admin role)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("organization.id", str(org_id))
    
    # Check if user has platform_admin or org_admin role for this organization
    has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
    if not has_role:
        has_role, error = await user_role_service.user_has_role(current_user_id, "org_admin", org_id)
        if error or not has_role:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Only platform administrators or organization administrators can update organizations"))
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only platform administrators or organization administrators can update organizations"
            )
    
    organization, error = await organization_service.update_organization(org_id, org_data)
    if error:
        if "not found" in error.lower():
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error
            )
        else:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
    
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return organization


@organization_router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
@tracer.start_as_current_span("organization.routes.delete_organization")
async def delete_organization(org_id: UUID, current_user_id: UUID = Depends(get_current_user_id)):
    """Delete an organization (requires platform_admin role)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("organization.id", str(org_id))
    
    # Check if user has platform_admin role
    has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Only platform administrators can delete organizations"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can delete organizations"
        )
    
    success, error = await organization_service.delete_organization(org_id)
    if error:
        if "not found" in error.lower():
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error
            )
        else:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error
            )
    
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return None