"""
User Role API routes for RBAC.
"""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Depends
from opentelemetry import trace

from src.rbac.user_roles.models import UserRole, UserRoleCreate, UserRoleUpdate
from src.rbac.user_roles.service import user_role_service
from src.rbac.roles.models import Role, RoleWithPermissions
from src.auth.middleware import get_current_user_id

# Get tracer for this module
tracer = trace.get_tracer(__name__)

# Create user role router
user_role_router = APIRouter(prefix="", tags=["User Roles"])


@user_role_router.post("/user-roles", response_model=UserRole, status_code=status.HTTP_201_CREATED)
@tracer.start_as_current_span("rbac.user_roles.assign_role_to_user")
async def assign_role_to_user(user_role_data: UserRoleCreate, current_user_id: UUID = Depends(get_current_user_id)):
    """Assign a role to a user (requires platform_admin or org_admin role)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("target_user.id", str(user_role_data.user_id))
    current_span.set_attribute("role.id", str(user_role_data.role_id))
    if user_role_data.organization_id:
        current_span.set_attribute("organization.id", str(user_role_data.organization_id))
    
    # Authorization check
    is_authorized = False
    if user_role_data.organization_id:
        # For organization-specific roles, check platform_admin or org_admin for that organization
        has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
        if has_role and not error:
            is_authorized = True
        else:
            has_role, error = await user_role_service.user_has_role(current_user_id, "org_admin", user_role_data.organization_id)
            if has_role and not error:
                is_authorized = True
    else:
        # For platform-wide roles, only platform_admin can assign
        has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
        if has_role and not error:
            is_authorized = True
    
    if not is_authorized:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Insufficient permissions to assign roles"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to assign roles"
        )
    
    user_role, error = await user_role_service.assign_role_to_user(user_role_data)
    if error:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    current_span.set_attribute("user_role.id", str(user_role.id))
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return user_role


@user_role_router.put("/user-roles/{user_role_id}", response_model=UserRole)
@tracer.start_as_current_span("rbac.user_roles.update_user_role")
async def update_user_role(user_role_id: UUID, user_role_data: UserRoleUpdate, current_user_id: UUID = Depends(get_current_user_id)):
    """Update a user role assignment (requires platform_admin role)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("user_role.id", str(user_role_id))
    
    # Check if user has platform_admin role
    has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Only platform administrators can update user role assignments"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can update user role assignments"
        )
    
    user_role, error = await user_role_service.update_user_role(user_role_id, user_role_data)
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
    return user_role


@user_role_router.delete("/user-roles/{user_role_id}", status_code=status.HTTP_204_NO_CONTENT)
@tracer.start_as_current_span("rbac.user_roles.remove_role_from_user")
async def remove_role_from_user(user_role_id: UUID, current_user_id: UUID = Depends(get_current_user_id)):
    """Remove a role from a user (requires platform_admin role)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("user_role.id", str(user_role_id))
    
    # Check if user has platform_admin role
    has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Only platform administrators can remove user role assignments"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can remove user role assignments"
        )
    
    success, error = await user_role_service.remove_role_from_user(user_role_id)
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


@user_role_router.get("/users/{user_id}/roles", response_model=list[Role])
@tracer.start_as_current_span("rbac.user_roles.get_roles_for_user")
async def get_roles_for_user(
    user_id: UUID, 
    organization_id: Optional[UUID] = None, 
    current_user_id: UUID = Depends(get_current_user_id)
):
    """Get all roles for a user (requires platform_admin or org_admin role)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("target_user.id", str(user_id))
    if organization_id:
        current_span.set_attribute("organization.id", str(organization_id))
    
    # Authorization check
    is_authorized = False
    if organization_id:
        # Check if user is platform_admin or org_admin for the specified organization
        has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
        if has_role and not error:
            is_authorized = True
        else:
            has_role, error = await user_role_service.user_has_role(current_user_id, "org_admin", organization_id)
            if has_role and not error:
                is_authorized = True
    else:
        # For platform-wide roles, only platform_admin can view
        has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
        if has_role and not error:
            is_authorized = True
    
    if not is_authorized:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Insufficient permissions to view user roles"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view user roles"
        )
    
    roles, error = await user_role_service.get_roles_for_user(user_id, organization_id)
    if error:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )
    
    current_span.set_attribute("roles.count", len(roles))
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return roles


@user_role_router.get("/users/{user_id}/roles-with-permissions", response_model=list[RoleWithPermissions])
@tracer.start_as_current_span("rbac.user_roles.get_user_roles_with_permissions")
async def get_user_roles_with_permissions(
    user_id: UUID, 
    organization_id: Optional[UUID] = None, 
    current_user_id: UUID = Depends(get_current_user_id)
):
    """Get all roles with their permissions for a user (requires platform_admin or org_admin role)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("target_user.id", str(user_id))
    if organization_id:
        current_span.set_attribute("organization.id", str(organization_id))
    
    # Authorization check
    is_authorized = False
    if organization_id:
        # Check if user is platform_admin or org_admin for the specified organization
        has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
        if has_role and not error:
            is_authorized = True
        else:
            has_role, error = await user_role_service.user_has_role(current_user_id, "org_admin", organization_id)
            if has_role and not error:
                is_authorized = True
    else:
        # For platform-wide roles, only platform_admin can view
        has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
        if has_role and not error:
            is_authorized = True
    
    if not is_authorized:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Insufficient permissions to view user roles with permissions"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view user roles with permissions"
        )
    
    roles_with_permissions, error = await user_role_service.get_user_roles_with_permissions(user_id, organization_id)
    if error:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )
    
    current_span.set_attribute("roles_with_permissions.count", len(roles_with_permissions))
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return roles_with_permissions


@user_role_router.get("/users/{user_id}/permissions/{permission_name}", response_model=bool)
@tracer.start_as_current_span("rbac.user_roles.check_user_permission")
async def check_user_permission(
    user_id: UUID, 
    permission_name: str, 
    organization_id: Optional[UUID] = None, 
    current_user_id: UUID = Depends(get_current_user_id)
):
    """Check if a user has a specific permission (requires platform_admin or org_admin role)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("target_user.id", str(user_id))
    current_span.set_attribute("permission.name", permission_name)
    if organization_id:
        current_span.set_attribute("organization.id", str(organization_id))
    
    # Authorization check
    is_authorized = False
    if organization_id:
        # Check if user is platform_admin or org_admin for the specified organization
        has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
        if has_role and not error:
            is_authorized = True
        else:
            has_role, error = await user_role_service.user_has_role(current_user_id, "org_admin", organization_id)
            if has_role and not error:
                is_authorized = True
    else:
        # For platform-wide permissions, only platform_admin can check
        has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
        if has_role and not error:
            is_authorized = True
    
    if not is_authorized:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Insufficient permissions to check other users' permissions"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to check other users' permissions"
        )
    
    has_permission, error = await user_role_service.user_has_permission(user_id, permission_name, organization_id)
    if error:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )
    
    current_span.set_attribute("permission.granted", has_permission)
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return has_permission


@user_role_router.get("/users/{user_id}/roles/{role_name}", response_model=bool)
@tracer.start_as_current_span("rbac.user_roles.check_user_role")
async def check_user_role(
    user_id: UUID, 
    role_name: str, 
    organization_id: Optional[UUID] = None, 
    current_user_id: UUID = Depends(get_current_user_id)
):
    """Check if a user has a specific role (requires platform_admin or org_admin role)."""
    current_span = trace.get_current_span()
    current_span.set_attribute("user.id", str(current_user_id))
    current_span.set_attribute("target_user.id", str(user_id))
    current_span.set_attribute("role.name", role_name)
    if organization_id:
        current_span.set_attribute("organization.id", str(organization_id))
    
    # Authorization check
    is_authorized = False
    if organization_id:
        # Check if user is platform_admin or org_admin for the specified organization
        has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
        if has_role and not error:
            is_authorized = True
        else:
            has_role, error = await user_role_service.user_has_role(current_user_id, "org_admin", organization_id)
            if has_role and not error:
                is_authorized = True
    else:
        # For platform-wide roles, only platform_admin can check
        has_role, error = await user_role_service.user_has_role(current_user_id, "platform_admin")
        if has_role and not error:
            is_authorized = True
    
    if not is_authorized:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Insufficient permissions to check other users' roles"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to check other users' roles"
        )
    
    has_role, error = await user_role_service.user_has_role(user_id, role_name, organization_id)
    if error:
        current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )
    
    current_span.set_attribute("role.granted", has_role)
    current_span.set_status(trace.Status(trace.StatusCode.OK))
    return has_role