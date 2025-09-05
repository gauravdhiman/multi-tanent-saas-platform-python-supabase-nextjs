"""
Role-Based Access Control (RBAC) API routes.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Depends, Header
from fastapi.responses import JSONResponse

from .rbac_models import (
    Organization, OrganizationCreate, OrganizationUpdate,
    Role, RoleCreate, RoleUpdate,
    Permission, PermissionCreate, PermissionUpdate,
    RolePermission,
    UserRole, UserRoleCreate, UserRoleUpdate,
    RoleWithPermissions, UserWithRoles
)
from .rbac_service import rbac_service
from .middleware import get_current_user_id


# Create RBAC router
rbac_router = APIRouter(prefix="/rbac", tags=["Role-Based Access Control"])


# Organization endpoints

@rbac_router.post("/organizations", response_model=Organization, status_code=status.HTTP_201_CREATED)
async def create_organization(org_data: OrganizationCreate, current_user_id: UUID = Depends(get_current_user_id)):
    """Create a new organization (requires platform_admin role)."""
    # Check if user has platform_admin role
    has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can create organizations"
        )
    
    organization, error = await rbac_service.create_organization(org_data)
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    return organization


@rbac_router.get("/organizations/{org_id}", response_model=Organization)
async def get_organization(org_id: UUID, current_user_id: UUID = Depends(get_current_user_id)):
    """Get an organization by ID."""
    # Check if user has permission to view organizations
    has_permission, error = await rbac_service.user_has_permission(current_user_id, "organization:read")
    if error or not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view organizations"
        )
    
    # Additionally check if user belongs to this organization
    has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
    if not has_role:
        has_role, error = await rbac_service.user_has_role(current_user_id, "org_admin", org_id)
        if not has_role:
            has_permission, error = await rbac_service.user_has_permission(current_user_id, "organization:read", org_id)
            if error or not has_permission:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this organization"
                )
    
    organization, error = await rbac_service.get_organization_by_id(org_id)
    if error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error
        )
    
    return organization


@rbac_router.get("/organizations", response_model=List[Organization])
async def get_all_organizations(current_user_id: UUID = Depends(get_current_user_id)):
    """Get all organizations the user has access to."""
    # Check if user has platform_admin role
    has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
    if error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )
    
    if has_role:
        # Platform admin can see all organizations
        organizations, error = await rbac_service.get_all_organizations()
        if error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error
            )
        return organizations
    else:
        # Regular users can only see organizations they belong to
        # This would require a more complex query to find organizations where the user has roles
        # For now, we'll return an empty list
        return []


@rbac_router.put("/organizations/{org_id}", response_model=Organization)
async def update_organization(org_id: UUID, org_data: OrganizationUpdate, current_user_id: UUID = Depends(get_current_user_id)):
    """Update an organization (requires platform_admin or org_admin role)."""
    # Check if user has platform_admin or org_admin role for this organization
    has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
    if not has_role:
        has_role, error = await rbac_service.user_has_role(current_user_id, "org_admin", org_id)
        if error or not has_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only platform administrators or organization administrators can update organizations"
            )
    
    organization, error = await rbac_service.update_organization(org_id, org_data)
    if error:
        if "not found" in error.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
    
    return organization


@rbac_router.delete("/organizations/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(org_id: UUID, current_user_id: UUID = Depends(get_current_user_id)):
    """Delete an organization (requires platform_admin role)."""
    # Check if user has platform_admin role
    has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can delete organizations"
        )
    
    success, error = await rbac_service.delete_organization(org_id)
    if error:
        if "not found" in error.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error
            )
    
    return None


# Role endpoints

@rbac_router.post("/roles", response_model=Role, status_code=status.HTTP_201_CREATED)
async def create_role(role_data: RoleCreate, current_user_id: UUID = Depends(get_current_user_id)):
    """Create a new role (requires platform_admin role)."""
    # Check if user has platform_admin role
    has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can create roles"
        )
    
    role, error = await rbac_service.create_role(role_data)
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    return role


@rbac_router.get("/roles/{role_id}", response_model=Role)
async def get_role(role_id: UUID, current_user_id: UUID = Depends(get_current_user_id)):
    """Get a role by ID."""
    # Check if user has permission to view roles
    has_permission, error = await rbac_service.user_has_permission(current_user_id, "role:read")
    if error or not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view roles"
        )
    
    role, error = await rbac_service.get_role_by_id(role_id)
    if error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error
        )
    
    return role


@rbac_router.get("/roles", response_model=List[Role])
async def get_all_roles(current_user_id: UUID = Depends(get_current_user_id)):
    """Get all roles."""
    # Check if user has permission to view roles
    has_permission, error = await rbac_service.user_has_permission(current_user_id, "role:read")
    if error or not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view roles"
        )
    
    roles, error = await rbac_service.get_all_roles()
    if error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )
    
    return roles


@rbac_router.put("/roles/{role_id}", response_model=Role)
async def update_role(role_id: UUID, role_data: RoleUpdate, current_user_id: UUID = Depends(get_current_user_id)):
    """Update a role (requires platform_admin role)."""
    # Check if user has platform_admin role
    has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can update roles"
        )
    
    role, error = await rbac_service.update_role(role_id, role_data)
    if error:
        if "not found" in error.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
    
    return role


@rbac_router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(role_id: UUID, current_user_id: UUID = Depends(get_current_user_id)):
    """Delete a role (requires platform_admin role)."""
    # Check if user has platform_admin role
    has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can delete roles"
        )
    
    success, error = await rbac_service.delete_role(role_id)
    if error:
        if "not found" in error.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error
            )
        elif "system roles" in error.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error
            )
    
    return None


# Permission endpoints

@rbac_router.post("/permissions", response_model=Permission, status_code=status.HTTP_201_CREATED)
async def create_permission(permission_data: PermissionCreate, current_user_id: UUID = Depends(get_current_user_id)):
    """Create a new permission (requires platform_admin role)."""
    # Check if user has platform_admin role
    has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can create permissions"
        )
    
    permission, error = await rbac_service.create_permission(permission_data)
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    return permission


@rbac_router.get("/permissions/{permission_id}", response_model=Permission)
async def get_permission(permission_id: UUID, current_user_id: UUID = Depends(get_current_user_id)):
    """Get a permission by ID."""
    # Check if user has permission to view permissions
    has_permission, error = await rbac_service.user_has_permission(current_user_id, "permission:read")
    if error or not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view permissions"
        )
    
    permission, error = await rbac_service.get_permission_by_id(permission_id)
    if error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error
        )
    
    return permission


@rbac_router.get("/permissions", response_model=List[Permission])
async def get_all_permissions(current_user_id: UUID = Depends(get_current_user_id)):
    """Get all permissions."""
    # Check if user has permission to view permissions
    has_permission, error = await rbac_service.user_has_permission(current_user_id, "permission:read")
    if error or not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view permissions"
        )
    
    permissions, error = await rbac_service.get_all_permissions()
    if error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )
    
    return permissions


@rbac_router.put("/permissions/{permission_id}", response_model=Permission)
async def update_permission(permission_id: UUID, permission_data: PermissionUpdate, current_user_id: UUID = Depends(get_current_user_id)):
    """Update a permission (requires platform_admin role)."""
    # Check if user has platform_admin role
    has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can update permissions"
        )
    
    permission, error = await rbac_service.update_permission(permission_id, permission_data)
    if error:
        if "not found" in error.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
    
    return permission


@rbac_router.delete("/permissions/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_permission(permission_id: UUID, current_user_id: UUID = Depends(get_current_user_id)):
    """Delete a permission (requires platform_admin role)."""
    # Check if user has platform_admin role
    has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can delete permissions"
        )
    
    success, error = await rbac_service.delete_permission(permission_id)
    if error:
        if "not found" in error.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error
            )
    
    return None


# Role-Permission endpoints

@rbac_router.post("/role-permissions", response_model=RolePermission, status_code=status.HTTP_201_CREATED)
async def assign_permission_to_role(
    role_id: UUID, 
    permission_id: UUID, 
    current_user_id: UUID = Depends(get_current_user_id)
):
    """Assign a permission to a role (requires platform_admin role)."""
    # Check if user has platform_admin role
    has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can assign permissions to roles"
        )
    
    role_permission, error = await rbac_service.assign_permission_to_role(role_id, permission_id)
    if error:
        if "not found" in error.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
    
    return role_permission


@rbac_router.delete("/role-permissions", status_code=status.HTTP_204_NO_CONTENT)
async def remove_permission_from_role(
    role_id: UUID, 
    permission_id: UUID, 
    current_user_id: UUID = Depends(get_current_user_id)
):
    """Remove a permission from a role (requires platform_admin role)."""
    # Check if user has platform_admin role
    has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can remove permissions from roles"
        )
    
    success, error = await rbac_service.remove_permission_from_role(role_id, permission_id)
    if error:
        if "not found" in error.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error
            )
    
    return None


@rbac_router.get("/roles/{role_id}/permissions", response_model=List[Permission])
async def get_permissions_for_role(role_id: UUID, current_user_id: UUID = Depends(get_current_user_id)):
    """Get all permissions assigned to a role."""
    # Check if user has permission to view permissions
    has_permission, error = await rbac_service.user_has_permission(current_user_id, "permission:read")
    if error or not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view role permissions"
        )
    
    permissions, error = await rbac_service.get_permissions_for_role(role_id)
    if error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )
    
    return permissions


# User-Role endpoints

@rbac_router.post("/user-roles", response_model=UserRole, status_code=status.HTTP_201_CREATED)
async def assign_role_to_user(user_role_data: UserRoleCreate, current_user_id: UUID = Depends(get_current_user_id)):
    """Assign a role to a user."""
    # Check if user has permission to assign roles
    # For platform-wide roles, need platform_admin
    # For organization-specific roles, need org_admin for that organization
    if user_role_data.organization_id is None:
        # Platform-wide role assignment
        has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
        if error or not has_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only platform administrators can assign platform-wide roles"
            )
    else:
        # Organization-specific role assignment
        has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
        if not has_role:
            has_role, error = await rbac_service.user_has_role(current_user_id, "org_admin", user_role_data.organization_id)
            if error or not has_role:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only platform administrators or organization administrators can assign organization roles"
                )
    
    user_role, error = await rbac_service.assign_role_to_user(user_role_data)
    if error:
        if "not found" in error.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
    
    return user_role


@rbac_router.put("/user-roles/{user_role_id}", response_model=UserRole)
async def update_user_role(user_role_id: UUID, user_role_data: UserRoleUpdate, current_user_id: UUID = Depends(get_current_user_id)):
    """Update a user-role assignment."""
    # Get the existing user-role to check permissions
    # This would require additional logic to check the existing assignment
    # For simplicity, we'll require platform_admin for now
    has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can update user-role assignments"
        )
    
    user_role, error = await rbac_service.update_user_role(user_role_id, user_role_data)
    if error:
        if "not found" in error.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
    
    return user_role


@rbac_router.delete("/user-roles/{user_role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_role_from_user(user_role_id: UUID, current_user_id: UUID = Depends(get_current_user_id)):
    """Remove a role from a user."""
    # Get the existing user-role to check permissions
    # This would require additional logic to check the existing assignment
    # For simplicity, we'll require platform_admin for now
    has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
    if error or not has_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can remove user-role assignments"
        )
    
    success, error = await rbac_service.remove_role_from_user(user_role_id)
    if error:
        if "not found" in error.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error
            )
    
    return None


@rbac_router.get("/users/{user_id}/roles", response_model=List[Role])
async def get_roles_for_user(user_id: UUID, organization_id: Optional[UUID] = None, current_user_id: UUID = Depends(get_current_user_id)):
    """Get all roles assigned to a user."""
    # Users can view their own roles, or admins can view any user's roles
    if current_user_id != user_id:
        # Check if current user is platform admin or org admin for the specified org
        is_authorized = False
        
        # Check platform admin
        has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
        if has_role and not error:
            is_authorized = True
        elif organization_id:
            # Check org admin for the specified organization
            has_role, error = await rbac_service.user_has_role(current_user_id, "org_admin", organization_id)
            if has_role and not error:
                is_authorized = True
        
        if not is_authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view other users' roles"
            )
    
    roles, error = await rbac_service.get_roles_for_user(user_id, organization_id)
    if error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )
    
    return roles


@rbac_router.get("/users/{user_id}/roles-with-permissions", response_model=List[RoleWithPermissions])
async def get_user_roles_with_permissions(user_id: UUID, organization_id: Optional[UUID] = None, current_user_id: UUID = Depends(get_current_user_id)):
    """Get all roles with their permissions for a user."""
    # Users can view their own roles, or admins can view any user's roles
    if current_user_id != user_id:
        # Check if current user is platform admin or org admin for the specified org
        is_authorized = False
        
        # Check platform admin
        has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
        if has_role and not error:
            is_authorized = True
        elif organization_id:
            # Check org admin for the specified organization
            has_role, error = await rbac_service.user_has_role(current_user_id, "org_admin", organization_id)
            if has_role and not error:
                is_authorized = True
        
        if not is_authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view other users' roles"
            )
    
    roles_with_permissions, error = await rbac_service.get_user_roles_with_permissions(user_id, organization_id)
    if error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )
    
    return roles_with_permissions


# Permission checking endpoints

@rbac_router.get("/users/{user_id}/has-permission/{permission_name}", response_model=bool)
async def check_user_permission(user_id: UUID, permission_name: str, organization_id: Optional[UUID] = None, current_user_id: UUID = Depends(get_current_user_id)):
    """Check if a user has a specific permission."""
    # Users can check their own permissions, or admins can check any user's permissions
    if current_user_id != user_id:
        # Check if current user is platform admin or org admin for the specified org
        is_authorized = False
        
        # Check platform admin
        has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
        if has_role and not error:
            is_authorized = True
        elif organization_id:
            # Check org admin for the specified organization
            has_role, error = await rbac_service.user_has_role(current_user_id, "org_admin", organization_id)
            if has_role and not error:
                is_authorized = True
        
        if not is_authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to check other users' permissions"
            )
    
    has_permission, error = await rbac_service.user_has_permission(user_id, permission_name, organization_id)
    if error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )
    
    return has_permission


@rbac_router.get("/users/{user_id}/has-role/{role_name}", response_model=bool)
async def check_user_role(user_id: UUID, role_name: str, organization_id: Optional[UUID] = None, current_user_id: UUID = Depends(get_current_user_id)):
    """Check if a user has a specific role."""
    # Users can check their own roles, or admins can check any user's roles
    if current_user_id != user_id:
        # Check if current user is platform admin or org admin for the specified org
        is_authorized = False
        
        # Check platform admin
        has_role, error = await rbac_service.user_has_role(current_user_id, "platform_admin")
        if has_role and not error:
            is_authorized = True
        elif organization_id:
            # Check org admin for the specified organization
            has_role, error = await rbac_service.user_has_role(current_user_id, "org_admin", organization_id)
            if has_role and not error:
                is_authorized = True
        
        if not is_authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to check other users' roles"
            )
    
    has_role, error = await rbac_service.user_has_role(user_id, role_name, organization_id)
    if error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )
    
    return has_role