"""
Permission API routes for RBAC.
"""

from typing import List
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Depends
from opentelemetry import trace

from src.rbac.permissions.models import Permission, PermissionCreate, PermissionUpdate, RolePermission
from src.rbac.permissions.service import permission_service
from src.auth.middleware import get_current_user_id
from src.rbac.user_roles.service import user_role_service

# Get tracer for this module
tracer = trace.get_tracer(__name__)

# Create permission router
permission_router = APIRouter(prefix="/permissions", tags=["Permissions"])


@permission_router.post("/", response_model=Permission, status_code=status.HTTP_201_CREATED)
@tracer.start_as_current_span("rbac.permissions.create_permission")
async def create_permission(permission_data: PermissionCreate, current_user_id: UUID = Depends(get_current_user_id)):
    """Create a new permission (requires platform_admin role)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("permission.name", permission_data.name)
    
    # Check if user has platform_admin role
    has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Only platform administrators can create permissions"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can create permissions"
        )
    
    permission, error = await permission_service.create_permission(permission_data)
    if error:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    current_span.set_attribute("permission.id", str(permission.id))
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return permission


@permission_router.get("/{permission_id}", response_model=Permission)
@tracer.start_as_current_span("rbac.permissions.get_permission")
async def get_permission(permission_id: UUID, current_user_id: UUID = Depends(get_current_user_id)):
    """Get a permission by ID (requires permission:read permission)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("permission.id", str(permission_id))
    
    # Check if user has permission to read permissions
    has_permission, error = await user_role_service.user_has_permission(current_user_id, "permission:read")
    if error or not has_permission:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Insufficient permissions to view permissions"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view permissions"
        )
    
    permission, error = await permission_service.get_permission_by_id(permission_id)
    if error:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error
        )
    
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return permission


@permission_router.get("/", response_model=List[Permission])
@tracer.start_as_current_span("rbac.permissions.get_all_permissions")
async def get_all_permissions(current_user_id: UUID = Depends(get_current_user_id)):
    """Get all permissions (requires permission:read permission)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    
    # Check if user has permission to read permissions
    has_permission, error = await user_role_service.user_has_permission(current_user_id, "permission:read")
    if error or not has_permission:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Insufficient permissions to view permissions"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view permissions"
        )
    
    permissions, error = await permission_service.get_all_permissions()
    if error:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )
    
    current_span.set_attribute("permissions.count", len(permissions))
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return permissions


@permission_router.put("/{permission_id}", response_model=Permission)
@tracer.start_as_current_span("rbac.permissions.update_permission")
async def update_permission(permission_id: UUID, permission_data: PermissionUpdate, current_user_id: UUID = Depends(get_current_user_id)):
    """Update a permission (requires platform_admin role)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("permission.id", str(permission_id))
    
    # Check if user has platform_admin role
    has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Only platform administrators can update permissions"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can update permissions"
        )
    
    permission, error = await permission_service.update_permission(permission_id, permission_data)
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
    return permission


@permission_router.delete("/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
@tracer.start_as_current_span("rbac.permissions.delete_permission")
async def delete_permission(permission_id: UUID, current_user_id: UUID = Depends(get_current_user_id)):
    """Delete a permission (requires platform_admin role)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("permission.id", str(permission_id))
    
    # Check if user has platform_admin role
    has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Only platform administrators can delete permissions"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can delete permissions"
        )
    
    success, error = await permission_service.delete_permission(permission_id)
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


# Role-Permission relationship endpoints

@permission_router.post("/roles/{role_id}/permissions/{permission_id}", response_model=RolePermission, status_code=status.HTTP_201_CREATED)
@tracer.start_as_current_span("rbac.permissions.assign_permission_to_role")
async def assign_permission_to_role(role_id: UUID, permission_id: UUID, current_user_id: UUID = Depends(get_current_user_id)):
    """Assign a permission to a role (requires platform_admin role)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("role.id", str(role_id))
    current_span.set_attribute("permission.id", str(permission_id))
    
    # Check if user has platform_admin role
    has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Only platform administrators can assign permissions to roles"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can assign permissions to roles"
        )
    
    role_permission, error = await permission_service.assign_permission_to_role(role_id, permission_id)
    if error:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    current_span.set_attribute("role_permission.id", str(role_permission.id))
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return role_permission


@permission_router.delete("/roles/{role_id}/permissions/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
@tracer.start_as_current_span("rbac.permissions.remove_permission_from_role")
async def remove_permission_from_role(role_id: UUID, permission_id: UUID, current_user_id: UUID = Depends(get_current_user_id)):
    """Remove a permission from a role (requires platform_admin role)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("role.id", str(role_id))
    current_span.set_attribute("permission.id", str(permission_id))
    
    # Check if user has platform_admin role
    has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Only platform administrators can remove permissions from roles"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can remove permissions from roles"
        )
    
    success, error = await permission_service.remove_permission_from_role(role_id, permission_id)
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


@permission_router.get("/roles/{role_id}/permissions", response_model=List[Permission])
@tracer.start_as_current_span("rbac.permissions.get_permissions_for_role")
async def get_permissions_for_role(role_id: UUID, current_user_id: UUID = Depends(get_current_user_id)):
    """Get all permissions for a role (requires permission:read permission)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("role.id", str(role_id))
    
    # Check if user has permission to read permissions
    has_permission, error = await user_role_service.user_has_permission(current_user_id, "permission:read")
    if error or not has_permission:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Insufficient permissions to view permissions"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view permissions"
        )
    
    permissions, error = await permission_service.get_permissions_for_role(role_id)
    if error:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )
    
    current_span.set_attribute("permissions.count", len(permissions))
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return permissions