"""
Pydantic models for notification functionality.
"""

from typing import Optional, Any, Dict, List
from pydantic import BaseModel, Field, EmailStr
from uuid import UUID
from datetime import datetime
from enum import Enum


class NotificationStatus(str, Enum):
    """Notification status enumeration."""
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    BOUNCED = "bounced"


class NotificationCategory(str, Enum):
    """Notification category enumeration."""
    AUTH = "auth"
    BILLING = "billing"
    ORGANIZATION = "organization"
    SYSTEM = "system"
    CUSTOM = "custom"


class NotificationProvider(str, Enum):
    """Email provider enumeration."""
    RESEND = "resend"


# Notification Event Models
class NotificationEventBase(BaseModel):
    """Base model for notification events."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    event_key: str = Field(..., min_length=1, max_length=100, description="Unique identifier for the event")
    category: NotificationCategory
    is_enabled: bool = Field(default=True)
    default_template_id: Optional[UUID] = None
    metadata: Optional[Dict[str, Any]] = None


class NotificationEventCreate(NotificationEventBase):
    """Model for creating notification events."""
    pass


class NotificationEventUpdate(BaseModel):
    """Model for updating notification events."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[NotificationCategory] = None
    is_enabled: Optional[bool] = None
    default_template_id: Optional[UUID] = None
    metadata: Optional[Dict[str, Any]] = None


class NotificationEvent(NotificationEventBase):
    """Complete notification event model."""
    id: UUID
    created_at: datetime
    updated_at: datetime


# Notification Template Models
class NotificationTemplateBase(BaseModel):
    """Base model for notification templates."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    subject: str = Field(..., min_length=1, max_length=255)
    html_content: str = Field(..., min_length=1, description="HTML email template with placeholders")
    text_content: Optional[str] = Field(None, description="Plain text fallback")
    from_email: Optional[EmailStr] = Field(None, description="Override sender email")
    from_name: Optional[str] = Field(None, max_length=100, description="Override sender name")
    template_variables: Optional[List[str]] = Field(None, description="List of available template variables")
    is_active: bool = Field(default=True)


class NotificationTemplateCreate(NotificationTemplateBase):
    """Model for creating notification templates."""
    pass


class NotificationTemplateUpdate(BaseModel):
    """Model for updating notification templates."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    subject: Optional[str] = Field(None, min_length=1, max_length=255)
    html_content: Optional[str] = Field(None, min_length=1)
    text_content: Optional[str] = None
    from_email: Optional[EmailStr] = None
    from_name: Optional[str] = Field(None, max_length=100)
    template_variables: Optional[List[str]] = None
    is_active: Optional[bool] = None


class NotificationTemplate(NotificationTemplateBase):
    """Complete notification template model."""
    id: UUID
    created_at: datetime
    updated_at: datetime


# Notification Log Models
class NotificationLogBase(BaseModel):
    """Base model for notification logs."""
    notification_event_id: UUID
    notification_template_id: Optional[UUID] = None
    organization_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    recipient_email: EmailStr
    recipient_name: Optional[str] = Field(None, max_length=100)
    subject: str = Field(..., max_length=255)
    status: NotificationStatus
    provider: NotificationProvider = Field(default=NotificationProvider.RESEND)
    provider_message_id: Optional[str] = Field(None, max_length=255)
    error_message: Optional[str] = None
    sent_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


class NotificationLogCreate(BaseModel):
    """Model for creating notification logs."""
    notification_event_id: UUID
    notification_template_id: Optional[UUID] = None
    organization_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    recipient_email: EmailStr
    recipient_name: Optional[str] = None
    subject: str
    status: NotificationStatus = Field(default=NotificationStatus.PENDING)
    provider: NotificationProvider = Field(default=NotificationProvider.RESEND)
    provider_message_id: Optional[str] = None
    error_message: Optional[str] = None
    sent_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


class NotificationLog(NotificationLogBase):
    """Complete notification log model."""
    id: UUID
    created_at: datetime


# API Request/Response Models
class SendNotificationRequest(BaseModel):
    """Request model for sending a notification."""
    event_key: str = Field(..., description="Event key that triggers the notification")
    recipient_email: EmailStr
    recipient_name: Optional[str] = None
    organization_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    template_variables: Optional[Dict[str, Any]] = Field(None, description="Variables to inject into template")
    template_id: Optional[UUID] = Field(None, description="Override default template")


class SendNotificationResponse(BaseModel):
    """Response model for sending a notification."""
    success: bool
    notification_log_id: UUID
    status: NotificationStatus
    message: str


class NotificationEventWithTemplate(NotificationEvent):
    """Notification event with template details."""
    default_template: Optional[NotificationTemplate] = None


class NotificationStats(BaseModel):
    """Statistics for notifications."""
    total_sent: int
    total_failed: int
    total_pending: int
    by_event: Dict[str, int]
    by_status: Dict[str, int]
    recent_failures: List[NotificationLog]


# Email Verification Token Models
class EmailVerificationTokenBase(BaseModel):
    """Base model for email verification tokens."""
    user_id: UUID
    token: str = Field(..., min_length=1, max_length=255)
    expires_at: datetime


class EmailVerificationTokenCreate(BaseModel):
    """Model for creating email verification tokens."""
    user_id: UUID
    token: str = Field(..., min_length=1, max_length=255)
    expires_at: datetime


class EmailVerificationToken(EmailVerificationTokenBase):
    """Complete email verification token model."""
    id: UUID
    used_at: Optional[datetime] = None
    created_at: datetime
