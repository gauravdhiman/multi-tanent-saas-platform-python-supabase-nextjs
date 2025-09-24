"""
API routes for billing functionality.
"""

from typing import Any
from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks, status
from fastapi.responses import JSONResponse
import logging

from src.auth.models import UserProfile

from src.billing.models import (
    SubscriptionPlan, SubscriptionPlanCreate, SubscriptionPlanUpdate,
    OrganizationSubscriptionUpdate,
    OrganizationSubscriptionWithPlan, CreditEvent, CreditProduct,
    BillingHistory, OrganizationBillingSummary, CreditBalance,
    CreditConsumptionRequest, CreditConsumptionResponse,
    SubscriptionCheckoutResponse, CreditPurchaseResponse
)
from src.billing.service import billing_service
from src.billing.stripe_service import stripe_service
from src.billing.webhook_handler import handle_stripe_webhook
from src.organization.service import organization_service
from src.auth.middleware import get_authenticated_user, check_billing_permissions
from src.rbac.user_roles.service import user_role_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/billing", tags=["billing"])


# Subscription Plans
@router.get("/plans", response_model=list[SubscriptionPlan])
async def get_subscription_plans(
    active_only: bool = True
):
    """Get all available subscription plans."""
    try:
        return await billing_service.get_subscription_plans(active_only=active_only)
    except Exception as e:
        logger.error(f"Error fetching subscription plans: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch subscription plans")


@router.post("/plans", response_model=SubscriptionPlan)
async def create_subscription_plan(
    plan_data: SubscriptionPlanCreate,
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """Create a new subscription plan. (Platform Admin only)"""
    try:
        user_id, user_profile = user_auth

        # Check if user has platform admin role
        if not user_profile.has_role("platform_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have permission to create subscription plans"
            )
        
        return await billing_service.create_subscription_plan(plan_data)
    except Exception as e:
        logger.error(f"Error creating subscription plan: {e}")
        raise HTTPException(status_code=500, detail="Failed to create subscription plan")


@router.get("/plans/{plan_id}", response_model=SubscriptionPlan)
async def get_subscription_plan(
    plan_id: UUID
):
    """Get a specific subscription plan."""
    try:
        plan = await billing_service.get_subscription_plan(plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Subscription plan not found")
        return plan
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching subscription plan {plan_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch subscription plan")


@router.put("/plans/{plan_id}", response_model=SubscriptionPlan)
async def update_subscription_plan(
    plan_id: UUID,
    plan_data: SubscriptionPlanUpdate,
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """Update a subscription plan. (Platform Admin only)"""
    try:
        user_id, user_profile = user_auth

        # Check if user has platform admin role
        if not user_profile.has_role("platform_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Platform admin access required to update subscription plans"
            )
        
        plan = await billing_service.update_subscription_plan(plan_id, plan_data)
        if not plan:
            raise HTTPException(status_code=404, detail="Subscription plan not found")
        return plan
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating subscription plan {plan_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update subscription plan")


# Organization Subscriptions
@router.get("/subscription/{organization_id}", response_model=OrganizationSubscriptionWithPlan)
async def get_organization_subscription(
    organization_id: UUID,
    _: tuple[UUID, UserProfile] = Depends(check_billing_permissions)
):
    """Get organization subscription details."""
    try:
        subscription = await billing_service.get_organization_subscription(organization_id)
        if not subscription:
            raise HTTPException(status_code=404, detail="Organization subscription not found")
        return subscription
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching organization subscription for {organization_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch organization subscription")


@router.post("/subscription/checkout", response_model=SubscriptionCheckoutResponse)
async def create_subscription_checkout(
    organization_id: UUID,
    plan_id: UUID,
    success_url: str,
    cancel_url: str,
    user_auth: tuple[UUID, UserProfile] = Depends(check_billing_permissions)
):
    """Create a Stripe checkout session for subscription."""
    try:
        # Get subscription plan
        plan = await billing_service.get_subscription_plan(plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Subscription plan not found")
        
        # Check if organization already has a subscription
        existing_subscription = await billing_service.get_organization_subscription(organization_id)
        if existing_subscription:
            raise HTTPException(status_code=400, detail="Organization already has a subscription")
        
        # Get organization details
        organization, error = await organization_service.get_organization_by_id(organization_id)
        if error:
            raise HTTPException(status_code=500, detail="Failed to fetch organization")
        
        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Create or get Stripe customer
        customer = await stripe_service.create_customer(
            email=f"billing@{organization.slug}.example.com",  # TODO: Replace with actual email
            name=organization.name,
            organization_id=str(organization_id),
            metadata={"plan_id": str(plan_id)}
        )
        
        # Create checkout session
        session = await stripe_service.create_checkout_session(
            customer_id=customer.id,
            price_id=plan.stripe_price_id,
            success_url=success_url,
            cancel_url=cancel_url,
            mode="subscription",
            metadata={
                "organization_id": str(organization_id),
                "plan_id": str(plan_id)
            },
            trial_period_days=plan.trial_period_days
        )
        
        return SubscriptionCheckoutResponse(
            checkout_url=session.url,
            session_id=session.id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating subscription checkout: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


@router.post("/subscription/portal")
async def create_customer_portal(
    request: dict[str, Any],
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """Create a Stripe customer portal session."""
    try:
        user_id, user_profile = user_auth
        
        # Extract organization_id from request and validate access
        organization_id = request.get("organization_id")
        if not organization_id:
            raise HTTPException(status_code=400, detail="organization_id is required")

        # Check organization access permissions
        org_id = UUID(organization_id)
        if not user_profile.has_role("platform_admin"):
            if not user_profile.has_permission("billing:subscribe", str(org_id)):
                if not user_profile.has_role("org_admin", str(org_id)):
                    raise HTTPException(
                        status_code=403,
                        detail="Insufficient permissions for billing operations in this organization"
                    )
        # Extract parameters from request body  
        return_url = request.get("return_url")

        if not organization_id:
            raise HTTPException(status_code=400, detail="organization_id is required")
        if not return_url:
            raise HTTPException(status_code=400, detail="return_url is required")

        # Convert organization_id to UUID
        try:
            organization_uuid = UUID(organization_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid organization_id format")

        logger.info(f"Creating customer portal for organization {organization_uuid}")

        # Get organization subscription
        subscription = await billing_service.get_organization_subscription(organization_uuid)
        if not subscription:
            logger.error(f"No subscription found for organization {organization_uuid}")
            raise HTTPException(status_code=404, detail="Organization subscription not found")

        logger.info(f"Found subscription {subscription.id} with customer {subscription.stripe_customer_id}")

        # Validate customer exists in Stripe
        try:
            customer = await stripe_service.get_customer(subscription.stripe_customer_id)
            logger.info(f"Validated customer {customer.id} exists in Stripe")
        except Exception as e:
            logger.error(f"Customer {subscription.stripe_customer_id} not found in Stripe: {e}")
            raise HTTPException(status_code=400, detail="Customer not found in Stripe")

        # Create portal session
        portal_session = await stripe_service.create_portal_session(
            customer_id=subscription.stripe_customer_id,
            return_url=return_url
        )

        logger.info(f"Created portal session: {portal_session.url}")
        return {"portal_url": portal_session.url}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating customer portal: {e}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create customer portal: {str(e)}")


# Credits
@router.get("/credits/{organization_id}", response_model=CreditBalance)
async def get_credit_balance(
    organization_id: UUID,
    _: tuple[UUID, UserProfile] = Depends(check_billing_permissions)
):
    """Get organization credit balance."""
    try:
        return await billing_service.get_credit_balance(organization_id)
    except Exception as e:
        logger.error(f"Error fetching credit balance for {organization_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch credit balance")


@router.post("/credits/consume", response_model=CreditConsumptionResponse)
async def consume_credits(
    consumption_request: CreditConsumptionRequest,
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """Consume credits for an event."""
    try:
        user_id, user_profile = user_auth
        
        # Check billing permissions for the organization in the request
        try:
            # Check if user has platform admin role (bypasses organization checks)
            if not user_profile.has_role("platform_admin"):
                if not user_profile.has_permission("billing:subscribe", str(consumption_request.organization_id)):
                    if not user_profile.has_role("org_admin", str(consumption_request.organization_id)):
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Insufficient permissions for billing operations in this organization"
                        )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Authorization error: {str(e)}"
            )
        
        return await billing_service.consume_credits(consumption_request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error consuming credits: {e}")
        raise HTTPException(status_code=500, detail="Failed to consume credits")


@router.get("/credit-events", response_model=list[CreditEvent])
async def get_credit_events(
    active_only: bool = True
):
    """Get all credit events."""
    try:
        return await billing_service.get_credit_events(active_only=active_only)
    except Exception as e:
        logger.error(f"Error fetching credit events: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch credit events")


@router.get("/credit-products", response_model=list[CreditProduct])
async def get_credit_products(
    active_only: bool = True
):
    """Get all credit products."""
    try:
        return await billing_service.get_credit_products(active_only=active_only)
    except Exception as e:
        logger.error(f"Error fetching credit products: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch credit products")


@router.post("/credit-products/checkout", response_model=CreditPurchaseResponse)
async def create_credit_purchase_checkout(
    organization_id: UUID,
    product_id: UUID,
    success_url: str,
    cancel_url: str,
    user_auth: tuple[UUID, UserProfile] = Depends(check_billing_permissions)
):
    """Create a Stripe checkout session for credit purchase."""
    try:
        current_user_id, user_profile = user_auth
        
        # Get credit product
        products = await billing_service.get_credit_products(active_only=True)
        product = next((p for p in products if p.id == product_id), None)
        if not product:
            raise HTTPException(status_code=404, detail="Credit product not found")
        
        # Get organization subscription for customer ID
        subscription = await billing_service.get_organization_subscription(organization_id)
        if not subscription:
            raise HTTPException(status_code=404, detail="Organization subscription not found")
        
        # Create checkout session
        session = await stripe_service.create_checkout_session(
            customer_id=subscription.stripe_customer_id,
            price_id=product.stripe_price_id,
            success_url=success_url,
            cancel_url=cancel_url,
            mode="payment",
            metadata={
                "organization_id": str(organization_id),
                "product_id": str(product_id),
                "credit_amount": str(product.credit_amount)
            }
        )
        
        return CreditPurchaseResponse(
            checkout_url=session.url,
            session_id=session.id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating credit purchase checkout: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


# Billing History
@router.get("/history/{organization_id}", response_model=list[BillingHistory])
async def get_billing_history(
    organization_id: UUID,
    limit: int = 10,
    _: tuple[UUID, UserProfile] = Depends(check_billing_permissions)
):
    """Get billing history for an organization."""
    try:
        return await billing_service.get_billing_history(organization_id, limit=limit)
    except Exception as e:
        logger.error(f"Error fetching billing history for {organization_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch billing history")


# Billing Summary
@router.get("/summary/{organization_id}", response_model=OrganizationBillingSummary)
async def get_billing_summary(
    organization_id: UUID,
    _: tuple[UUID, UserProfile] = Depends(check_billing_permissions)
):
    """Get comprehensive billing summary for an organization."""
    try:
        return await billing_service.get_organization_billing_summary(organization_id)
    except Exception as e:
        logger.error(f"Error fetching billing summary for {organization_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch billing summary")


# Webhooks
@router.post("/webhook/stripe")
async def stripe_webhook(
    request: Request,
    background_tasks: BackgroundTasks
):
    """Handle Stripe webhook events."""
    try:
        logger.info("Stripe webhook endpoint hit")

        # Get webhook payload and signature
        payload = await request.body()
        signature = request.headers.get("stripe-signature")

        logger.info(f"Webhook payload size: {len(payload)} bytes")
        logger.info(f"Stripe signature present: {signature is not None}")

        if not signature:
            logger.error("Missing Stripe signature")
            raise HTTPException(status_code=400, detail="Missing Stripe signature")

        # Add webhook processing to background tasks
        background_tasks.add_task(handle_stripe_webhook, payload, signature)

        logger.info("Webhook processing added to background tasks")
        return JSONResponse(content={"status": "success"})

    except Exception as e:
        logger.error(f"Error processing Stripe webhook: {e}")
        raise HTTPException(status_code=400, detail="Webhook processing failed")


# Checkout and Payment Management
@router.post("/checkout/subscription", response_model=dict[str, Any])
async def create_subscription_checkout(
    request: dict[str, Any],
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """Create a Stripe Checkout session for subscription."""
    try:
        user_id, user_profile = user_auth
        
        # Extract and validate organization access
        organization_id = request.get("organization_id")
        if not organization_id:
            raise HTTPException(status_code=400, detail="organization_id is required")
        
        # Check billing permissions for this organization
        org_id = UUID(organization_id)
        if not user_profile.has_role("platform_admin"):
            if not user_profile.has_permission("billing:subscribe", str(org_id)):
                if not user_profile.has_role("org_admin", str(org_id)):
                    raise HTTPException(
                        status_code=403,
                        detail="Insufficient permissions for billing operations in this organization"
                    )
        plan_id = request.get("plan_id")
        
        if not plan_id:
            raise HTTPException(status_code=400, detail="plan_id is required")
        
        # Convert plan_id to UUID and get the subscription plan
        try:
            plan_uuid = UUID(plan_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid plan_id format")
        
        plan = await billing_service.get_subscription_plan(plan_uuid)
        if not plan:
            raise HTTPException(status_code=404, detail="Subscription plan not found")
        
        # Get organization details
        org_result = billing_service.supabase.table("organizations").select("*").eq(
            "id", organization_id
        ).execute()
        
        if not org_result.data:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        org = org_result.data[0]
        
        # Create or get Stripe customer
        existing_subscription = await billing_service.get_organization_subscription(UUID(organization_id))
        
        if existing_subscription and existing_subscription.stripe_customer_id:
            customer_id = existing_subscription.stripe_customer_id
        else:
            # Get user email from auth service 
            from src.auth.service import auth_service
            # We need to get the user email somehow - let's use a placeholder for now
            user_email = f"billing@{org['slug']}.example.com"
            
            # Create new customer
            customer = await stripe_service.create_customer(
                email=user_email,
                name=org["name"],
                organization_id=organization_id
            )
            customer_id = customer.id
        
        # Create checkout session
        checkout_session = await stripe_service.create_subscription_checkout_session(
            price_id=plan.stripe_price_id,
            customer_id=customer_id,
            organization_id=organization_id,
            plan_id=plan_id
        )
        
        return {"session_url": checkout_session.url, "session_id": checkout_session.id}
        
    except Exception as e:
        logger.error(f"Error creating subscription checkout: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


@router.post("/checkout/credits", response_model=dict[str, Any])
async def create_credits_checkout(
    request: dict[str, Any],
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """Create a Stripe Checkout session for credit purchase."""
    try:
        user_id, user_profile = user_auth
        
        # Extract and validate organization access
        product_id = request.get("product_id")
        organization_id = request.get("organization_id")
        
        if not product_id or not organization_id:
            raise HTTPException(status_code=400, detail="product_id and organization_id are required")
        
        # Check billing permissions for this organization
        org_id = UUID(organization_id)
        if not user_profile.has_role("platform_admin"):
            if not user_profile.has_permission("billing:subscribe", str(org_id)):
                if not user_profile.has_role("org_admin", str(org_id)):
                    raise HTTPException(
                        status_code=403,
                        detail="Insufficient permissions for billing operations in this organization"
                    )
        
        # Get the credit product
        products = await billing_service.get_credit_products()
        product = next((p for p in products if str(p.id) == product_id), None)
        
        if not product:
            raise HTTPException(status_code=404, detail="Credit product not found")
        
        # Get organization details
        org_result = billing_service.supabase.table("organizations").select("*").eq(
            "id", organization_id
        ).execute()
        
        if not org_result.data:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        org = org_result.data[0]
        
        # Get or create customer
        existing_subscription = await billing_service.get_organization_subscription(UUID(organization_id))
        
        if existing_subscription and existing_subscription.stripe_customer_id:
            customer_id = existing_subscription.stripe_customer_id
        else:
            customer = await stripe_service.create_customer(
                email=f"billing@{org['slug']}.example.com",
                name=org["name"],
                organization_id=organization_id
            )
            customer_id = customer.id
        
        # Create checkout session for one-time payment
        checkout_session = await stripe_service.create_credits_checkout_session(
            price_id=product.stripe_price_id,
            customer_id=customer_id,
            organization_id=organization_id,
            product_id=product_id
        )
        
        return {"session_url": checkout_session.url, "session_id": checkout_session.id}
        
    except Exception as e:
        logger.error(f"Error creating credits checkout: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


@router.post("/portal", response_model=dict[str, str])
async def create_customer_portal_session(
    request: dict[str, Any],
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """Create a Stripe Customer Portal session for subscription management."""
    try:
        user_id, user_profile = user_auth
        
        # Extract and validate organization access
        organization_id = request.get("organization_id")
        if not organization_id:
            raise HTTPException(status_code=400, detail="organization_id is required")
        
        # Check billing permissions for this organization
        org_id = UUID(organization_id)
        if not user_profile.has_role("platform_admin"):
            if not user_profile.has_permission("billing:subscribe", str(org_id)):
                if not user_profile.has_role("org_admin", str(org_id)):
                    raise HTTPException(
                        status_code=403,
                        detail="Insufficient permissions for billing operations in this organization"
                    )
        
        # Get organization subscription
        subscription = await billing_service.get_organization_subscription(UUID(organization_id))
        
        if not subscription or not subscription.stripe_customer_id:
            raise HTTPException(status_code=404, detail="No subscription found for organization")
        
        # Create customer portal session
        portal_session = await stripe_service.create_customer_portal_session(
            customer_id=subscription.stripe_customer_id,
            organization_id=organization_id
        )
        
        return {"portal_url": portal_session.url}
        
    except Exception as e:
        logger.error(f"Error creating customer portal session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create portal session")


@router.post("/subscription/cancel")
async def cancel_subscription(
    request: dict[str, Any],
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """Cancel subscription at the end of the current period."""
    try:
        user_id, user_profile = user_auth
        
        # Extract and validate organization access
        organization_id = request.get("organization_id")
        if not organization_id:
            raise HTTPException(status_code=400, detail="organization_id is required")
        
        # Check billing permissions for this organization
        org_id = UUID(organization_id)
        if not user_profile.has_role("platform_admin"):
            if not user_profile.has_role("org_admin", str(org_id)):
                raise HTTPException(
                    status_code=403,
                    detail="Insufficient permissions for billing operations in this organization"
                )
        
        # Get organization subscription
        subscription = await billing_service.get_organization_subscription(UUID(organization_id))
        
        if not subscription or not subscription.stripe_subscription_id:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        # Cancel subscription in Stripe
        await stripe_service.cancel_subscription(subscription.stripe_subscription_id)
        
        # Update local subscription record
        await billing_service.update_organization_subscription(
            UUID(organization_id),
            OrganizationSubscriptionUpdate(cancel_at_period_end=True)
        )
        
        return {"message": "Subscription will be cancelled at the end of the current period"}
        
    except Exception as e:
        logger.error(f"Error cancelling subscription: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")


@router.post("/subscription/reactivate")
async def reactivate_subscription(
    request: dict[str, Any],
    user_auth: tuple[UUID, UserProfile] = Depends(get_authenticated_user)
):
    """Reactivate a cancelled subscription."""
    try:
        user_id, user_profile = user_auth
        
        # Extract and validate organization access
        organization_id = request.get("organization_id")
        if not organization_id:
            raise HTTPException(status_code=400, detail="organization_id is required")
        
        # Check billing permissions for this organization
        org_id = UUID(organization_id)
        if not user_profile.has_role("platform_admin"):
            if not user_profile.has_role("org_admin", str(org_id)):
                raise HTTPException(
                    status_code=403,
                    detail="Insufficient permissions for billing operations in this organization"
                )
        
        # Get organization subscription
        subscription = await billing_service.get_organization_subscription(UUID(organization_id))
        
        if not subscription or not subscription.stripe_subscription_id:
            raise HTTPException(status_code=404, detail="No subscription found")
        
        # Reactivate subscription in Stripe
        await stripe_service.reactivate_subscription(subscription.stripe_subscription_id)
        
        # Update local subscription record
        await billing_service.update_organization_subscription(
            UUID(organization_id),
            OrganizationSubscriptionUpdate(cancel_at_period_end=False)
        )
        
        return {"message": "Subscription reactivated successfully"}
        
    except Exception as e:
        logger.error(f"Error reactivating subscription: {e}")
        raise HTTPException(status_code=500, detail="Failed to reactivate subscription")