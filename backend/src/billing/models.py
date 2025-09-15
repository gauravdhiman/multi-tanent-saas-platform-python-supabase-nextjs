"""
Pydantic models for billing functionality.
"""

from typing import Optional, Any
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from enum import Enum


class SubscriptionStatus(str, Enum):
    """Subscription status enumeration."""
    TRIAL = "trial"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"


class TransactionType(str, Enum):
    """Credit transaction type enumeration."""
    EARNED = "earned"
    PURCHASED = "purchased"
    CONSUMED = "consumed"
    EXPIRED = "expired"
    REFUNDED = "refunded"


class TransactionSource(str, Enum):
    """Credit transaction source enumeration.
    
    Maps to the following tables via source_id:
    - SUBSCRIPTION -> organization_subscriptions
    - PURCHASE -> credit_products  
    - EVENT_CONSUMPTION -> credit_events
    - EXPIRY -> None (no source_id needed)
    - REFUND -> billing_history
    - ADMIN_ADJUSTMENT -> None (no source_id needed)
    """
    SUBSCRIPTION = "subscription"
    PURCHASE = "purchase"
    EVENT_CONSUMPTION = "event_consumption"
    EXPIRY = "expiry"
    REFUND = "refund"
    ADMIN_ADJUSTMENT = "admin_adjustment"


class BillingStatus(str, Enum):
    """Billing history status enumeration."""
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class PlanInterval(str, Enum):
    """Subscription plan interval enumeration."""
    MONTHLY = "monthly"
    ANNUAL = "annual"


# Subscription Plan Models
class SubscriptionPlanBase(BaseModel):
    """Base model for subscription plans."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    stripe_price_id: str = Field(..., min_length=1, max_length=255)
    stripe_product_id: str = Field(..., min_length=1, max_length=255)
    price_amount: int = Field(..., ge=0, description="Price in cents")
    currency: str = Field(default="USD", min_length=3, max_length=3)
    interval: PlanInterval
    interval_count: int = Field(default=1, ge=1)
    included_credits: int = Field(default=0, ge=0)
    max_users: Optional[int] = Field(None, ge=1)
    features: Optional[dict[str, Any]] = None
    is_active: bool = Field(default=True)
    trial_period_days: Optional[int] = Field(None, ge=0)


class SubscriptionPlanCreate(SubscriptionPlanBase):
    """Model for creating subscription plans."""
    pass


class SubscriptionPlanUpdate(BaseModel):
    """Model for updating subscription plans."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    price_amount: Optional[int] = Field(None, ge=0)
    included_credits: Optional[int] = Field(None, ge=0)
    max_users: Optional[int] = Field(None, ge=1)
    features: Optional[dict[str, Any]] = None
    is_active: Optional[bool] = None
    trial_period_days: Optional[int] = Field(None, ge=0)


class SubscriptionPlan(SubscriptionPlanBase):
    """Complete subscription plan model."""
    id: UUID
    created_at: datetime
    updated_at: datetime


# Organization Subscription Models
class OrganizationSubscriptionBase(BaseModel):
    """Base model for organization subscriptions."""
    organization_id: UUID
    subscription_plan_id: Optional[UUID] = None
    stripe_subscription_id: Optional[str] = Field(None, max_length=255)
    stripe_customer_id: str = Field(..., max_length=255)
    status: SubscriptionStatus
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    trial_start: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    cancel_at_period_end: bool = Field(default=False)
    cancelled_at: Optional[datetime] = None
    metadata: Optional[dict[str, Any]] = None


class OrganizationSubscriptionCreate(BaseModel):
    """Model for creating organization subscriptions."""
    organization_id: UUID
    subscription_plan_id: UUID
    stripe_customer_id: Optional[str] = None


class OrganizationSubscriptionUpdate(BaseModel):
    """Model for updating organization subscriptions."""
    subscription_plan_id: Optional[UUID] = None
    status: Optional[SubscriptionStatus] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    trial_start: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    cancel_at_period_end: Optional[bool] = None
    cancelled_at: Optional[datetime] = None
    metadata: Optional[dict[str, Any]] = None


class OrganizationSubscription(OrganizationSubscriptionBase):
    """Complete organization subscription model."""
    id: UUID
    created_at: datetime
    updated_at: datetime


class OrganizationSubscriptionWithPlan(OrganizationSubscription):
    """Organization subscription with plan details."""
    plan: Optional[SubscriptionPlan] = None


# Credit Event Models
class CreditEventBase(BaseModel):
    """Base model for credit events."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    credit_cost: int = Field(..., ge=0)
    category: str = Field(..., min_length=1, max_length=50)
    is_active: bool = Field(default=True)
    metadata: Optional[dict[str, Any]] = None


class CreditEventCreate(CreditEventBase):
    """Model for creating credit events."""
    pass


class CreditEventUpdate(BaseModel):
    """Model for updating credit events."""
    description: Optional[str] = Field(None, max_length=500)
    credit_cost: Optional[int] = Field(None, ge=0)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    is_active: Optional[bool] = None
    metadata: Optional[dict[str, Any]] = None


class CreditEvent(CreditEventBase):
    """Complete credit event model."""
    id: UUID
    created_at: datetime
    updated_at: datetime


# Credit Transaction Models
class CreditTransactionBase(BaseModel):
    """Base model for credit transactions."""
    organization_id: UUID
    transaction_type: TransactionType
    amount: int = Field(..., description="Positive for credits added, negative for consumed")
    balance_after: int = Field(..., ge=0)
    source: TransactionSource
    source_id: Optional[UUID] = None
    credit_event_id: Optional[UUID] = None
    expires_at: Optional[datetime] = None
    stripe_payment_intent_id: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


class CreditTransactionCreate(BaseModel):
    """Model for creating credit transactions."""
    organization_id: UUID
    transaction_type: TransactionType
    amount: int
    source: TransactionSource
    source_id: Optional[UUID] = None
    credit_event_id: Optional[UUID] = None
    expires_at: Optional[datetime] = None
    stripe_payment_intent_id: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
    
    def model_post_init(self, __context: Any) -> None:
        """Validate source and source_id relationship after model creation."""
        # Import here to avoid circular imports
        validation_error = TransactionSourceMapping.get_validation_error(self.source, self.source_id)
        if validation_error:
            raise ValueError(validation_error)


class CreditTransaction(CreditTransactionBase):
    """Complete credit transaction model."""
    id: UUID
    created_at: datetime


class CreditTransactionWithEvent(CreditTransaction):
    """Credit transaction with event details."""
    credit_event: Optional[CreditEvent] = None


# Credit Product Models
class CreditProductBase(BaseModel):
    """Base model for credit products."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    stripe_price_id: str = Field(..., min_length=1, max_length=255)
    stripe_product_id: str = Field(..., min_length=1, max_length=255)
    credit_amount: int = Field(..., gt=0)
    price_amount: int = Field(..., ge=0, description="Price in cents")
    currency: str = Field(default="USD", min_length=3, max_length=3)
    is_active: bool = Field(default=True)


class CreditProductCreate(CreditProductBase):
    """Model for creating credit products."""
    pass


class CreditProductUpdate(BaseModel):
    """Model for updating credit products."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    credit_amount: Optional[int] = Field(None, gt=0)
    price_amount: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class CreditProduct(CreditProductBase):
    """Complete credit product model."""
    id: UUID
    created_at: datetime
    updated_at: datetime


# Billing History Models
class BillingHistoryBase(BaseModel):
    """Base model for billing history."""
    organization_id: UUID
    stripe_invoice_id: Optional[str] = Field(None, max_length=255)
    stripe_payment_intent_id: Optional[str] = Field(None, max_length=255)
    amount: int = Field(..., ge=0, description="Amount in cents")
    currency: str = Field(default="USD", min_length=3, max_length=3)
    status: BillingStatus
    description: Optional[str] = None
    invoice_url: Optional[str] = None
    receipt_url: Optional[str] = None
    billing_reason: Optional[str] = Field(None, max_length=50)
    metadata: Optional[dict[str, Any]] = None
    paid_at: Optional[datetime] = None


class BillingHistoryCreate(BaseModel):
    """Model for creating billing history entries."""
    organization_id: UUID
    stripe_invoice_id: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
    amount: int = Field(..., ge=0)
    currency: str = Field(default="USD")
    status: BillingStatus
    description: Optional[str] = None
    invoice_url: Optional[str] = None
    receipt_url: Optional[str] = None
    billing_reason: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
    paid_at: Optional[datetime] = None


class BillingHistory(BillingHistoryBase):
    """Complete billing history model."""
    id: UUID
    created_at: datetime
    updated_at: datetime


# API Response Models
class SubscriptionCheckoutResponse(BaseModel):
    """Response model for subscription checkout."""
    checkout_url: str
    session_id: str


class CreditPurchaseResponse(BaseModel):
    """Response model for credit purchase."""
    checkout_url: str
    session_id: str


class OrganizationBillingSummary(BaseModel):
    """Summary of organization billing information."""
    organization_id: UUID
    subscription: Optional[OrganizationSubscriptionWithPlan] = None
    credit_balance: int
    current_period_usage: int
    next_billing_date: Optional[datetime] = None
    amount_due: Optional[int] = None


class CreditBalance(BaseModel):
    """Credit balance breakdown."""
    total_credits: int
    subscription_credits: int
    purchased_credits: int
    expiring_soon: int  # Credits expiring in next 30 days
    expires_at: Optional[datetime] = None  # Next expiration date


class UsageStats(BaseModel):
    """Usage statistics for the current period."""
    period_start: datetime
    period_end: datetime
    total_events: int
    credits_consumed: int
    events_by_category: dict[str, int]
    credits_by_category: dict[str, int]


# Webhook Models
class StripeWebhookEvent(BaseModel):
    """Stripe webhook event model."""
    id: str
    type: str
    data: dict[str, Any]
    created: int


# Credit Consumption Models
class CreditConsumptionRequest(BaseModel):
    """Request model for credit consumption."""
    organization_id: UUID
    event_name: str
    quantity: int = Field(default=1, ge=1)
    metadata: Optional[dict[str, Any]] = None


class CreditConsumptionResponse(BaseModel):
    """Response model for credit consumption."""
    success: bool
    credits_consumed: int
    balance_after: int
    transaction_id: UUID


# Polymorphic Relationship Utilities
class TransactionSourceMapping:
    """Utility class for managing polymorphic relationships in credit transactions."""
    
    # Maps transaction sources to their corresponding database tables
    SOURCE_TABLE_MAPPING = {
        TransactionSource.SUBSCRIPTION: "organization_subscriptions",
        TransactionSource.PURCHASE: "credit_products",
        TransactionSource.EVENT_CONSUMPTION: "credit_events",
        TransactionSource.REFUND: "billing_history",
        TransactionSource.EXPIRY: None,  # No source_id needed
        TransactionSource.ADMIN_ADJUSTMENT: None,  # No source_id needed
    }
    
    # Sources that require a source_id
    SOURCES_REQUIRING_ID = {
        TransactionSource.SUBSCRIPTION,
        TransactionSource.PURCHASE,
        TransactionSource.EVENT_CONSUMPTION,
        TransactionSource.REFUND,
    }
    
    # Sources that should not have a source_id
    SOURCES_WITHOUT_ID = {
        TransactionSource.EXPIRY,
        TransactionSource.ADMIN_ADJUSTMENT,
    }
    
    @classmethod
    def get_source_table(cls, source: TransactionSource) -> Optional[str]:
        """Get the table name that source_id should reference for a given source."""
        return cls.SOURCE_TABLE_MAPPING.get(source)
    
    @classmethod
    def requires_source_id(cls, source: TransactionSource) -> bool:
        """Check if a transaction source requires a source_id."""
        return source in cls.SOURCES_REQUIRING_ID
    
    @classmethod
    def should_have_source_id(cls, source: TransactionSource) -> bool:
        """Check if a transaction source should have a source_id (inverse of requires for validation)."""
        return source not in cls.SOURCES_WITHOUT_ID
    
    @classmethod
    def validate_source_relationship(cls, source: TransactionSource, source_id: Optional[UUID]) -> bool:
        """Validate that source and source_id relationship is correct."""
        if cls.requires_source_id(source):
            return source_id is not None
        elif source in cls.SOURCES_WITHOUT_ID:
            return source_id is None
        return True  # For flexibility with other sources
    
    @classmethod
    def get_validation_error(cls, source: TransactionSource, source_id: Optional[UUID]) -> Optional[str]:
        """Get validation error message if source/source_id relationship is invalid."""
        if cls.requires_source_id(source) and source_id is None:
            table = cls.get_source_table(source)
            return f"Transaction source '{source.value}' requires source_id to reference {table} table"
        elif source in cls.SOURCES_WITHOUT_ID and source_id is not None:
            return f"Transaction source '{source.value}' should not have a source_id"
        return None