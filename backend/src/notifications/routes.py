"""
API routes for notification management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from uuid import UUID
import logging

from src.auth.middleware import get_authenticated_user
from src.auth.models import UserProfile
from .models import (
    NotificationEvent,
    NotificationEventCreate,
    NotificationEventUpdate,
    NotificationTemplate,
    NotificationTemplateCreate,
    NotificationTemplateUpdate,
    NotificationLog,
    NotificationStats,
    SendNotificationRequest,
    SendNotificationResponse,
    NotificationCategory
)
from pydantic import BaseModel
from .service import notification_service
from config.settings import settings

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/notifications", tags=["notifications"])






# ============================================================================
# PUBLIC ROUTES - Specialized Notification Requests
# ============================================================================




# ============================================================================
# ADMIN ROUTES - Notification Events Management
# ============================================================================

@router.post("/admin/events", response_model=NotificationEvent, status_code=status.HTTP_201_CREATED)
async def create_notification_event(
    event_data: NotificationEventCreate,
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """
    Create a new notification event.
    Requires platform_admin role.
    """
    try:
        user_id, user_profile = user_auth
        
        # Check if user has platform_admin role
        if not user_profile.has_role("platform_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only platform administrators can create notification events"
            )
        
        return await notification_service.create_notification_event(event_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating notification event: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create notification event: {str(e)}"
        )


@router.get("/admin/events", response_model=List[NotificationEvent])
async def list_notification_events(
    category: Optional[NotificationCategory] = None,
    is_enabled: Optional[bool] = None,
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """
    List all notification events with optional filters.
    Requires platform_admin role.
    """
    user_id, user_profile = user_auth
    
    # Check if user has platform_admin role
    if not user_profile.has_role("platform_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can list notification events"
        )
    
    category_str = category.value if category else None
    return await notification_service.list_notification_events(category_str, is_enabled)


@router.get("/admin/events/{event_id}", response_model=NotificationEvent)
async def get_notification_event(
    event_id: UUID,
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """
    Get a specific notification event by ID.
    Requires platform_admin role.
    """
    user_id, user_profile = user_auth
    
    # Check if user has platform_admin role
    if not user_profile.has_role("platform_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can view notification events"
        )
    
    event = await notification_service.get_notification_event(event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification event not found"
        )
    return event


@router.put("/admin/events/{event_id}", response_model=NotificationEvent)
async def update_notification_event(
    event_id: UUID,
    event_data: NotificationEventUpdate,
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """
    Update a notification event.
    Requires platform_admin role.
    """
    try:
        user_id, user_profile = user_auth
        
        # Check if user has platform_admin role
        if not user_profile.has_role("platform_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only platform administrators can update notification events"
            )
        
        event = await notification_service.update_notification_event(event_id, event_data)
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification event not found"
            )
        return event
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating notification event: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update notification event: {str(e)}"
        )


@router.delete("/admin/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification_event(
    event_id: UUID,
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """
    Delete a notification event.
    Requires platform_admin role.
    """
    user_id, user_profile = user_auth
    
    # Check if user has platform_admin role
    if not user_profile.has_role("platform_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can delete notification events"
        )
    
    success = await notification_service.delete_notification_event(event_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification event not found"
        )


# ============================================================================
# ADMIN ROUTES - Notification Templates Management
# ============================================================================

@router.post("/admin/templates", response_model=NotificationTemplate, status_code=status.HTTP_201_CREATED)
async def create_notification_template(
    template_data: NotificationTemplateCreate,
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """
    Create a new notification template.
    Requires platform_admin role.
    """
    try:
        user_id, user_profile = user_auth
        
        # Check if user has platform_admin role
        if not user_profile.has_role("platform_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only platform administrators can create notification templates"
            )
        
        return await notification_service.create_notification_template(template_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating notification template: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create notification template: {str(e)}"
        )


@router.get("/admin/templates", response_model=List[NotificationTemplate])
async def list_notification_templates(
    is_active: Optional[bool] = None,
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """
    List all notification templates with optional filters.
    Requires platform_admin role.
    """
    user_id, user_profile = user_auth
    
    # Check if user has platform_admin role
    if not user_profile.has_role("platform_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can list notification templates"
        )
    
    return await notification_service.list_notification_templates(is_active)


@router.get("/admin/templates/{template_id}", response_model=NotificationTemplate)
async def get_notification_template(
    template_id: UUID,
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """
    Get a specific notification template by ID.
    Requires platform_admin role.
    """
    user_id, user_profile = user_auth
    
    # Check if user has platform_admin role
    if not user_profile.has_role("platform_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can view notification templates"
        )
    
    template = await notification_service.get_notification_template(template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification template not found"
        )
    return template


@router.put("/admin/templates/{template_id}", response_model=NotificationTemplate)
async def update_notification_template(
    template_id: UUID,
    template_data: NotificationTemplateUpdate,
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """
    Update a notification template.
    Requires platform_admin role.
    """
    try:
        user_id, user_profile = user_auth
        
        # Check if user has platform_admin role
        if not user_profile.has_role("platform_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only platform administrators can update notification templates"
            )
        
        template = await notification_service.update_notification_template(template_id, template_data)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification template not found"
            )
        return template
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating notification template: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update notification template: {str(e)}"
        )


@router.delete("/admin/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification_template(
    template_id: UUID,
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """
    Delete a notification template.
    Requires platform_admin role.
    """
    user_id, user_profile = user_auth
    
    # Check if user has platform_admin role
    if not user_profile.has_role("platform_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can delete notification templates"
        )
    
    success = await notification_service.delete_notification_template(template_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification template not found"
        )




# ============================================================================
# ROUTES - Notification Logs
# ============================================================================

@router.get("/logs", response_model=List[NotificationLog])
async def get_notification_logs(
    organization_id: Optional[UUID] = None,
    user_id: Optional[UUID] = None,
    status_filter: Optional[str] = None,
    limit: int = 100,
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """
    Get notification logs with optional filters.
    Users can see their own logs or their organization's logs.
    Platform admins can see all logs.
    """
    current_user_id, user_profile = user_auth
    
    from .models import NotificationStatus as NS
    
    # Parse status filter
    status = None
    if status_filter:
        try:
            status = NS(status_filter)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status filter: {status_filter}"
            )
    
    # Platform admins can see all logs
    if not user_profile.has_role("platform_admin"):
        # If organization_id is provided, check user has access
        if organization_id:
            has_org_access = any(
                str(user_role.organization_id) == str(organization_id)
                for user_role in user_profile.roles
            )
            if not has_org_access:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have access to logs for this organization"
                )
        # If user_id is provided, users can only see their own logs
        elif user_id and user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own notification logs"
            )
        # If neither is provided, default to current user's logs
        elif not user_id and not organization_id:
            user_id = current_user_id
    
    return await notification_service.get_notification_logs(
        organization_id=organization_id,
        user_id=user_id,
        status=status,
        limit=limit
    )


@router.get("/stats", response_model=NotificationStats)
async def get_notification_stats(
    organization_id: Optional[UUID] = None,
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """
    Get notification statistics.
    Platform admins can see global stats.
    Organization members can see their organization's stats.
    """
    user_id, user_profile = user_auth
    
    # Platform admins can see all stats
    if not user_profile.has_role("platform_admin"):
        # If organization_id is provided, check user has access
        if organization_id:
            has_org_access = any(
                str(user_role.organization_id) == str(organization_id)
                for user_role in user_profile.roles
            )
            if not has_org_access:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have access to stats for this organization"
                )
        else:
            # Non-admin users must specify an organization_id
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="organization_id is required for non-admin users"
            )
    
    return await notification_service.get_notification_stats(organization_id)


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def notification_health_check():
    """Health check endpoint for notification service."""
    from config.settings import settings
    
    return {
        "status": "healthy",
        "resend_configured": bool(settings.resend_api_key),
        "from_email": settings.resend_from_email
    }
