"""
Authentication middleware for extracting user information from JWT tokens.
"""

from typing import Optional
from uuid import UUID
import jwt
from fastapi import HTTPException, status, Header
from config import supabase_config


from src.auth.models import UserProfile
from src.auth.service import auth_service
from src.rbac.user_roles.service import user_role_service


async def check_billing_permissions(
    organization_id: UUID,
    authorization: str = Header(None)
) -> tuple[UUID, UserProfile]:
    """
    Check billing permissions for a specific organization.
    This is used as a FastAPI dependency for billing operations.
    
    Args:
        organization_id: The organization ID to check permissions for
        authorization: The Authorization header value (Bearer token)
        
    Returns:
        tuple[UUID, UserProfile]: (user_id, user_profile)
        
    Raises:
        HTTPException: If authentication or authorization fails
    """
    # First, authenticate the user
    user_id, user_profile = await get_authenticated_user(authorization)

    try:
        # Check if user has platform admin role (bypasses organization checks)
        has_platform_admin, error = await user_role_service.user_has_role(user_id, "platform_admin")
        if error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authorization check failed"
            )

        if has_platform_admin:
            # Platform admins have access to everything
            return user_id, user_profile

        # Check if user has billing permissions for this organization
        has_billing_permission, error = await user_role_service.user_has_permission(
            user_id, "billing:subscribe", organization_id
        )

        if error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Permission check failed"
            )

        if not has_billing_permission:
            # Also check if user is org_admin for this organization
            has_org_admin, error = await user_role_service.user_has_role(
                user_id, "org_admin", organization_id
            )

            if error:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Role check failed"
                )

            if not has_org_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions for billing operations in this organization"
                )

        return user_id, user_profile

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authorization error: {str(e)}"
        )

async def get_current_user_id(authorization: str = Header(None)) -> UUID:
    """
    Extract the current user ID from the authorization header.
    
    Args:
        authorization: The Authorization header value (Bearer token)
        
    Returns:
        UUID: The current user's ID
        
    Raises:
        HTTPException: If the token is invalid or missing
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.replace("Bearer ", "")
    
    try:
        # Decode the JWT token using Supabase's public key
        # In a real implementation, you would verify the token properly
        # For now, we'll extract the user ID directly from the token
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: user ID not found"
            )
        
        return UUID(user_id)
        
    except jwt.DecodeError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}"
        )


async def get_authenticated_user(
    authorization: str = Header(None)
) -> tuple[UUID, UserProfile]:
    """
    Comprehensive authentication middleware that validates:
    1. JWT token authenticity
    2. User existence and active status
    3. Returns both user ID and profile

    This is the primary authentication method that should be used
    instead of get_current_user_id for security-critical operations.

    Args:
        authorization: The Authorization header value (Bearer token)

    Returns:
        tuple[UUID, UserProfile]: (user_id, user_profile)

    Raises:
        HTTPException: If authentication fails at any step
    """
    # Step 1: Extract and validate JWT token
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )

    token = authorization.replace("Bearer ", "")

    try:
        # Decode JWT to get user ID
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: user ID not found"
            )

        user_uuid = UUID(user_id)

        # Step 2: Validate user exists and get profile
        user_profile, error = await auth_service.get_user(token)

        if error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )

        if not user_profile:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )

        # Step 3: Additional user status checks could be added here
        # For example, checking if user is banned, email verified, etc.

        return user_uuid, user_profile

    except jwt.DecodeError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format"
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}"
        )




def verify_supabase_token(token: str) -> tuple[Optional[dict], Optional[str]]:
    """
    Verify a Supabase JWT token and return the payload.
    
    Args:
        token: The JWT token to verify
        
    Returns:
        tuple[Optional[dict], Optional[str]]: (payload, error_message)
    """
    try:
        if not supabase_config.is_configured():
            return None, "Supabase not configured"
        
        # In a real implementation, you would verify the token using Supabase's public key
        # This is a simplified version for demonstration
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload, None
        
    except jwt.DecodeError:
        return None, "Invalid token"
    except Exception as e:
        return None, str(e)


async def check_organization_access(
    organization_id: UUID,
    authorization: str = Header(None)
) -> tuple[UUID, UserProfile]:
    """
    Check if user has access to an organization (platform admin or org member).
    This is for organization data access without requiring billing permissions.
    
    Args:
        organization_id: The organization ID to check access for
        authorization: The Authorization header value (Bearer token)
        
    Returns:
        tuple[UUID, UserProfile]: (user_id, user_profile)
        
    Raises:
        HTTPException: If authentication or authorization fails
    """
    # First, authenticate the user
    user_id, user_profile = await get_authenticated_user(authorization)

    try:
        # Check if user has platform admin role (bypasses organization checks)
        has_platform_admin, error = await user_role_service.user_has_role(user_id, "platform_admin")
        if error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authorization check failed"
            )

        if has_platform_admin:
            # Platform admins have access to everything
            return user_id, user_profile

        # Check if user is org_admin for this organization
        has_org_admin, error = await user_role_service.user_has_role(
            user_id, "org_admin", organization_id
        )

        if error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Role check failed"
            )

        if not has_org_admin:
            # Check if user has any role in this organization
            user_orgs, error = await user_role_service.get_user_organizations(user_id)
            if error:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Organization membership check failed"
                )
            
            org_ids = [org.id for org in user_orgs] if user_orgs else []
            if organization_id not in org_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You do not have access to this organization"
                )

        return user_id, user_profile

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authorization error: {str(e)}"
        )
