"""
Role API routes for RBAC.
"""

from typing import List
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Depends
from opentelemetry import trace

from src.rbac.roles.models import Role, RoleCreate, RoleUpdate
from src.rbac.roles.service import role_service
from src.auth.middleware import get_current_user_id
from src.rbac.user_roles.service import user_role_service

# Get tracer for this module
tracer = trace.get_tracer(__name__)

# Create role router
role_router = APIRouter(prefix="/roles", tags=["Roles"])


@role_router.post("/", response_model=Role, status_code=status.HTTP_201_CREATED)
@tracer.start_as_current_span("rbac.roles.create_role")
async def create_role(role_data: RoleCreate, current_user_id: UUID = Depends(get_current_user_id)):
    """Create a new role (requires platform_admin role)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("role.name", role_data.name)
    
    # Check if user has platform_admin role
    has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Only platform administrators can create roles"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can create roles"
        )
    
    role, error = await role_service.create_role(role_data)
    if error:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    current_span.set_attribute("role.id", str(role.id))
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return role


@role_router.get("/{role_id}", response_model=Role)
@tracer.start_as_current_span("rbac.roles.get_role")
async def get_role(role_id: UUID, current_user_id: UUID = Depends(get_current_user_id)):
    """Get a role by ID (requires role:read permission)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("role.id", str(role_id))
    
    # Check if user has permission to read roles
    has_permission, error = await user_role_service.user_has_permission(current_user_id, "role:read")
    if error or not has_permission:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Insufficient permissions to view roles"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view roles"
        )
    
    role, error = await role_service.get_role_by_id(role_id)
    if error:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error
        )
    
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return role


@role_router.get("/", response_model=List[Role])
@tracer.start_as_current_span("rbac.roles.get_all_roles")
async def get_all_roles(current_user_id: UUID = Depends(get_current_user_id)):
    """Get all roles (requires role:read permission)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    
    # Check if user has permission to read roles
    has_permission, error = await user_role_service.user_has_permission(current_user_id, "role:read")
    if error or not has_permission:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Insufficient permissions to view roles"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view roles"
        )
    
    roles, error = await role_service.get_all_roles()
    if error:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )
    
    current_span.set_attribute("roles.count", len(roles))
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return roles


@role_router.put("/{role_id}", response_model=Role)
@tracer.start_as_current_span("rbac.roles.update_role")
async def update_role(role_id: UUID, role_data: RoleUpdate, current_user_id: UUID = Depends(get_current_user_id)):
    """Update a role (requires platform_admin role)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("role.id", str(role_id))
    
    # Check if user has platform_admin role
    has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Only platform administrators can update roles"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can update roles"
        )
    
    role, error = await role_service.update_role(role_id, role_data)
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
    return role


@role_router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
@tracer.start_as_current_span("rbac.roles.delete_role")
async def delete_role(role_id: UUID, current_user_id: UUID = Depends(get_current_user_id)):
    """Delete a role (requires platform_admin role)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("role.id", str(role_id))
    
    # Check if user has platform_admin role
    has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Only platform administrators can delete roles"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can delete roles"
        )
    
    success, error = await role_service.delete_role(role_id)
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