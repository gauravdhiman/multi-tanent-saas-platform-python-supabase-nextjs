"""
Permission checking utilities for the RBAC system.
"""

from typing import Optional
from uuid import UUID
from fastapi import HTTPException, status
from .rbac_service import rbac_service


async def require_permission(user_id: UUID, permission_name: str, organization_id: Optional[UUID] = None):
    """
    Check if a user has a specific permission, raising an HTTPException if not.
    
    Args:
        user_id: The user ID to check permissions for
        permission_name: The name of the permission to check
        organization_id: Optional organization ID for organization-specific permissions
        
    Raises:
        HTTPException: If the user doesn't have the required permission
    """
    has_permission, error = await rbac_service.user_has_permission(user_id, permission_name, organization_id)
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking permissions: {error}"
        )
    
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission '{permission_name}' required"
        )


async def require_role(user_id: UUID, role_name: str, organization_id: Optional[UUID] = None):
    """
    Check if a user has a specific role, raising an HTTPException if not.
    
    Args:
        user_id: The user ID to check roles for
        role_name: The name of the role to check
        organization_id: Optional organization ID for organization-specific roles
        
    Raises:
        HTTPException: If the user doesn't have the required role
    """
    has_role, error = await rbac_service.user_has_role(user_id, role_name, organization_id)
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking roles: {error}"
        )
    
    if not has_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role_name}' required"
        )


async def has_permission(user_id: UUID, permission_name: str, organization_id: Optional[UUID] = None) -> bool:
    """
    Check if a user has a specific permission.
    
    Args:
        user_id: The user ID to check permissions for
        permission_name: The name of the permission to check
        organization_id: Optional organization ID for organization-specific permissions
        
    Returns:
        bool: True if the user has the permission, False otherwise
    """
    has_permission, error = await rbac_service.user_has_permission(user_id, permission_name, organization_id)
    
    if error:
        # Log the error but don't raise an exception
        print(f"Error checking permissions: {error}")
        return False
    
    return has_permission


async def has_role(user_id: UUID, role_name: str, organization_id: Optional[UUID] = None) -> bool:
    """
    Check if a user has a specific role.
    
    Args:
        user_id: The user ID to check roles for
        role_name: The name of the role to check
        organization_id: Optional organization ID for organization-specific roles
        
    Returns:
        bool: True if the user has the role, False otherwise
    """
    has_role, error = await rbac_service.user_has_role(user_id, role_name, organization_id)
    
    if error:
        # Log the error but don't raise an exception
        print(f"Error checking roles: {error}")
        return False
    
    return has_role