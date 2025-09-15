"""
Stripe webhook event handler.
"""

import logging
from datetime import datetime
from uuid import UUID

from .stripe_service import stripe_service
from .service import billing_service
from .models import (
    OrganizationSubscriptionUpdate, BillingHistoryCreate,
    SubscriptionStatus, BillingStatus, TransactionType, TransactionSource
)
from config.settings import settings

logger = logging.getLogger(__name__)


async def handle_stripe_webhook(payload: bytes, signature: str):
    """Process Stripe webhook events."""
    try:
        # Get webhook secret from settings
        webhook_secret = getattr(settings, 'stripe_webhook_secret', None)
        if not webhook_secret:
            logger.error("Stripe webhook secret not configured")
            return
        
        # Construct and verify webhook event
        event = stripe_service.construct_webhook_event(payload, signature, webhook_secret)
        
        logger.info(f"Processing Stripe webhook event: {event['type']}")
        
        # Route event to appropriate handler
        if event['type'] == 'checkout.session.completed':
            await handle_checkout_session_completed(event)
        elif event['type'] == 'customer.subscription.created':
            await handle_subscription_created(event)
        elif event['type'] == 'customer.subscription.updated':
            await handle_subscription_updated(event)
        elif event['type'] == 'customer.subscription.deleted':
            await handle_subscription_deleted(event)
        elif event['type'] == 'invoice.payment_succeeded':
            await handle_invoice_payment_succeeded(event)
        elif event['type'] == 'invoice.payment_failed':
            await handle_invoice_payment_failed(event)
        elif event['type'] == 'payment_intent.succeeded':
            await handle_payment_intent_succeeded(event)
        elif event['type'] == 'payment_intent.payment_failed':
            await handle_payment_intent_failed(event)
        else:
            logger.info(f"Unhandled webhook event type: {event['type']}")
    
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        raise


async def handle_checkout_session_completed(event):
    """Handle successful checkout session completion."""
    try:
        session = event['data']['object']
        metadata = session.get('metadata', {})
        
        organization_id = metadata.get('organization_id')
        if not organization_id:
            logger.warning("No organization_id in checkout session metadata")
            return
        
        logger.info(f"Checkout session completed for organization {organization_id}")
        
        # Handle subscription checkout
        if session['mode'] == 'subscription':
            plan_id = metadata.get('plan_id')
            if plan_id and session.get('subscription'):
                # Subscription will be handled by subscription.created webhook
                logger.info(f"Subscription checkout completed, waiting for subscription.created webhook")
        
        # Handle one-time payment (credit purchase)
        elif session['mode'] == 'payment':
            product_id = metadata.get('product_id')
            credit_amount = metadata.get('credit_amount')
            
            if product_id and credit_amount and session.get('payment_intent'):
                # Add purchased credits
                await billing_service.add_purchased_credits(
                    organization_id=UUID(organization_id),
                    credits=int(credit_amount),
                    stripe_payment_intent_id=session['payment_intent'],
                    description=f"Credit purchase - {credit_amount} credits"
                )
                
                logger.info(f"Added {credit_amount} purchased credits to organization {organization_id}")
    
    except Exception as e:
        logger.error(f"Error handling checkout session completed: {e}")
        raise


async def handle_subscription_created(event):
    """Handle subscription creation."""
    try:
        subscription = event['data']['object']
        customer_id = subscription['customer']

        # Get organization_id from subscription metadata
        organization_id = subscription.get('metadata', {}).get('organization_id')

        if not organization_id:
            logger.warning(f"No organization_id in subscription {subscription['id']} metadata")
            return
        
        # Get subscription plan from price ID
        price_id = subscription['items']['data'][0]['price']['id']
        plans = await billing_service.get_subscription_plans(active_only=False)
        plan = next((p for p in plans if p.stripe_price_id == price_id), None)
        
        if not plan:
            logger.warning(f"No plan found for price ID {price_id}")
            return
        
        # Check if organization already has a subscription
        existing_subscription = await billing_service.get_organization_subscription(UUID(organization_id))

        if existing_subscription:
            # Update existing subscription (plan upgrade/downgrade)
            logger.info(f"Updating existing subscription for organization {organization_id}")

            # Check if this is a downgrade (new plan has fewer credits)
            current_plan_credits = existing_subscription.plan.included_credits if existing_subscription.plan else 0
            is_downgrade = plan.included_credits < current_plan_credits

            update_data = OrganizationSubscriptionUpdate(
                subscription_plan_id=plan.id,
                stripe_subscription_id=subscription['id'],
                status=_map_stripe_status(subscription['status'])
            )

            # Only set period dates if they exist
            if subscription.get('current_period_start'):
                update_data.current_period_start = datetime.fromtimestamp(subscription['current_period_start'])
            if subscription.get('current_period_end'):
                update_data.current_period_end = datetime.fromtimestamp(subscription['current_period_end'])

            if subscription.get('trial_start'):
                update_data.trial_start = datetime.fromtimestamp(subscription['trial_start'])
            if subscription.get('trial_end'):
                update_data.trial_end = datetime.fromtimestamp(subscription['trial_end'])

            # For downgrades, set cancel_at_period_end to give user grace period
            if is_downgrade:
                update_data.cancel_at_period_end = True
                logger.info(f"Downgrade detected for organization {organization_id} - setting cancel_at_period_end")

            await billing_service.update_organization_subscription(
                UUID(organization_id),
                update_data
            )

            if is_downgrade:
                logger.info(f"Downgraded subscription for organization {organization_id} to plan {plan.id} (will cancel at period end)")
            else:
                logger.info(f"Updated subscription for organization {organization_id} to plan {plan.id}")
        else:
            # Create new organization subscription
            logger.info(f"Creating new subscription for organization {organization_id}")

            from .models import OrganizationSubscriptionCreate
            subscription_data = OrganizationSubscriptionCreate(
                organization_id=UUID(organization_id),
                subscription_plan_id=plan.id,
                stripe_customer_id=customer_id
            )

            org_subscription = await billing_service.create_organization_subscription(subscription_data)

            # Update with Stripe subscription details
            update_data = OrganizationSubscriptionUpdate(
                stripe_subscription_id=subscription['id'],
                status=_map_stripe_status(subscription['status'])
            )

            # Only set period dates if they exist
            if subscription.get('current_period_start'):
                update_data.current_period_start = datetime.fromtimestamp(subscription['current_period_start'])
            if subscription.get('current_period_end'):
                update_data.current_period_end = datetime.fromtimestamp(subscription['current_period_end'])

            if subscription.get('trial_start'):
                update_data.trial_start = datetime.fromtimestamp(subscription['trial_start'])
            if subscription.get('trial_end'):
                update_data.trial_end = datetime.fromtimestamp(subscription['trial_end'])

            await billing_service.update_organization_subscription(
                UUID(organization_id),
                update_data
            )

            logger.info(f"Created subscription for organization {organization_id}")
    
    except Exception as e:
        logger.error(f"Error handling subscription created: {e}")
        raise


async def handle_subscription_updated(event):
    """Handle subscription updates."""
    try:
        subscription = event['data']['object']
        customer_id = subscription['customer']

        # Get organization_id from subscription metadata
        organization_id = subscription.get('metadata', {}).get('organization_id')

        if not organization_id:
            logger.warning(f"No organization_id in subscription {subscription['id']} metadata")
            return

        # Get current subscription to check for plan changes
        current_subscription = await billing_service.get_organization_subscription(UUID(organization_id))

        # Check if plan changed (downgrade detection)
        plan_changed = False
        is_downgrade = False
        if current_subscription and current_subscription.plan:
            # Get the new plan from price ID
            price_id = subscription['items']['data'][0]['price']['id']
            plans = await billing_service.get_subscription_plans(active_only=False)
            new_plan = next((p for p in plans if p.stripe_price_id == price_id), None)

            if new_plan and new_plan.id != current_subscription.plan.id:
                plan_changed = True
                is_downgrade = new_plan.included_credits < current_subscription.plan.included_credits
                logger.info(f"Plan change detected for organization {organization_id}: {current_subscription.plan.name} -> {new_plan.name}")

        # Update subscription details
        update_data = OrganizationSubscriptionUpdate(
            status=_map_stripe_status(subscription['status']),
            cancel_at_period_end=subscription.get('cancel_at_period_end', False)
        )

        # Only set period dates if they exist
        if subscription.get('current_period_start'):
            update_data.current_period_start = datetime.fromtimestamp(subscription['current_period_start'])
        if subscription.get('current_period_end'):
            update_data.current_period_end = datetime.fromtimestamp(subscription['current_period_end'])

        if subscription.get('canceled_at'):
            update_data.cancelled_at = datetime.fromtimestamp(subscription['canceled_at'])

        await billing_service.update_organization_subscription(
            UUID(organization_id),
            update_data
        )

        if plan_changed:
            if is_downgrade:
                logger.info(f"Downgrade processed for organization {organization_id} - subscription will cancel at period end")
            else:
                logger.info(f"Upgrade processed for organization {organization_id}")
        else:
            logger.info(f"Updated subscription for organization {organization_id}")

    except Exception as e:
        logger.error(f"Error handling subscription updated: {e}")
        raise


async def handle_subscription_deleted(event):
    """Handle subscription deletion/cancellation."""
    try:
        subscription = event['data']['object']
        customer_id = subscription['customer']

        # Get organization_id from subscription metadata
        organization_id = subscription.get('metadata', {}).get('organization_id')

        if not organization_id:
            logger.warning(f"No organization_id in subscription {subscription['id']} metadata")
            return
        
        # Update subscription status to cancelled
        update_data = OrganizationSubscriptionUpdate(
            status=SubscriptionStatus.CANCELLED,
            cancelled_at=datetime.fromtimestamp(subscription.get('canceled_at', event['created']))
        )
        
        await billing_service.update_organization_subscription(
            UUID(organization_id),
            update_data
        )
        
        logger.info(f"Cancelled subscription for organization {organization_id}")
    
    except Exception as e:
        logger.error(f"Error handling subscription deleted: {e}")
        raise


async def handle_invoice_payment_succeeded(event):
    """Handle successful invoice payment."""
    try:
        invoice = event['data']['object']
        customer_id = invoice['customer']

        # Get organization_id from subscription metadata if it's a subscription invoice
        organization_id = None
        if invoice.get('subscription'):
            subscription = await stripe_service.get_subscription(invoice['subscription'])
            organization_id = subscription.get('metadata', {}).get('organization_id')

        # Fallback to customer metadata
        if not organization_id:
            customer = await stripe_service.get_customer(customer_id)
            organization_id = customer.metadata.get('organization_id')

        if not organization_id:
            logger.warning(f"No organization_id found for invoice {invoice['id']}")
            return
        
        # Create billing history entry
        billing_data = BillingHistoryCreate(
            organization_id=UUID(organization_id),
            stripe_invoice_id=invoice['id'],
            stripe_payment_intent_id=invoice.get('payment_intent'),
            amount=invoice['amount_paid'],
            currency=invoice['currency'],
            status=BillingStatus.PAID,
            description=f"Invoice payment - {invoice.get('description', 'Subscription')}",
            invoice_url=invoice.get('hosted_invoice_url'),
            receipt_url=invoice.get('receipt_url'),
            billing_reason=invoice.get('billing_reason'),
            paid_at=datetime.fromtimestamp(invoice.get('status_transitions', {}).get('paid_at', event['created']))
        )
        
        await billing_service.create_billing_history(billing_data)
        
        # If this is a subscription invoice, allocate credits
        if invoice.get('subscription'):
            subscription = await stripe_service.get_subscription(invoice['subscription'])
            price_id = subscription['items']['data'][0]['price']['id']
            
            # Get plan for credit allocation
            plans = await billing_service.get_subscription_plans(active_only=False)
            plan = next((p for p in plans if p.stripe_price_id == price_id), None)
            
            if plan and plan.included_credits > 0:
                # Calculate credit expiry (end of current period)
                expires_at = None
                if subscription.get('current_period_end'):
                    expires_at = datetime.fromtimestamp(subscription['current_period_end'])

                # Get the actual subscription record to get its ID
                org_subscription = await billing_service.get_organization_subscription(UUID(organization_id))
                subscription_id = org_subscription.id if org_subscription else None

                await billing_service.add_subscription_credits(
                    organization_id=UUID(organization_id),
                    credits=plan.included_credits,
                    subscription_id=subscription_id,
                    expires_at=expires_at
                )
                
                logger.info(f"Allocated {plan.included_credits} subscription credits to organization {organization_id}")
        
        logger.info(f"Processed successful invoice payment for organization {organization_id}")
    
    except Exception as e:
        logger.error(f"Error handling invoice payment succeeded: {e}")
        raise


async def handle_invoice_payment_failed(event):
    """Handle failed invoice payment."""
    try:
        invoice = event['data']['object']
        customer_id = invoice['customer']

        # Get organization_id from subscription metadata if it's a subscription invoice
        organization_id = None
        if invoice.get('subscription'):
            subscription = await stripe_service.get_subscription(invoice['subscription'])
            organization_id = subscription.get('metadata', {}).get('organization_id')

        # Fallback to customer metadata
        if not organization_id:
            customer = await stripe_service.get_customer(customer_id)
            organization_id = customer.metadata.get('organization_id')

        if not organization_id:
            logger.warning(f"No organization_id found for invoice {invoice['id']}")
            return
        
        # Create billing history entry
        billing_data = BillingHistoryCreate(
            organization_id=UUID(organization_id),
            stripe_invoice_id=invoice['id'],
            stripe_payment_intent_id=invoice.get('payment_intent'),
            amount=invoice['amount_due'],
            currency=invoice['currency'],
            status=BillingStatus.FAILED,
            description=f"Failed invoice payment - {invoice.get('description', 'Subscription')}",
            invoice_url=invoice.get('hosted_invoice_url'),
            billing_reason=invoice.get('billing_reason')
        )
        
        await billing_service.create_billing_history(billing_data)
        
        # Update subscription status if applicable
        if invoice.get('subscription'):
            update_data = OrganizationSubscriptionUpdate(
                status=SubscriptionStatus.PAST_DUE
            )
            
            await billing_service.update_organization_subscription(
                UUID(organization_id),
                update_data
            )
        
        logger.info(f"Processed failed invoice payment for organization {organization_id}")
    
    except Exception as e:
        logger.error(f"Error handling invoice payment failed: {e}")
        raise


async def handle_payment_intent_succeeded(event):
    """Handle successful payment intent (one-time payments)."""
    try:
        payment_intent = event['data']['object']
        customer_id = payment_intent.get('customer')

        if not customer_id:
            logger.warning("No customer ID in payment intent")
            return

        # Get organization_id from payment_intent metadata
        organization_id = payment_intent.get('metadata', {}).get('organization_id')

        # Fallback to customer metadata
        if not organization_id:
            customer = await stripe_service.get_customer(customer_id)
            organization_id = customer.metadata.get('organization_id')

        if not organization_id:
            logger.warning(f"No organization_id found for payment intent {payment_intent['id']}")
            return
        
        # Create billing history entry for one-time payment
        billing_data = BillingHistoryCreate(
            organization_id=UUID(organization_id),
            stripe_payment_intent_id=payment_intent['id'],
            amount=payment_intent['amount'],
            currency=payment_intent['currency'],
            status=BillingStatus.PAID,
            description=f"One-time payment - {payment_intent.get('description', 'Credit purchase')}",
            receipt_url=payment_intent.get('receipt_url'),
            billing_reason="manual",
            paid_at=datetime.fromtimestamp(payment_intent.get('created'))
        )
        
        await billing_service.create_billing_history(billing_data)
        
        logger.info(f"Processed successful payment intent for organization {organization_id}")
    
    except Exception as e:
        logger.error(f"Error handling payment intent succeeded: {e}")
        raise


async def handle_payment_intent_failed(event):
    """Handle failed payment intent."""
    try:
        payment_intent = event['data']['object']
        customer_id = payment_intent.get('customer')

        if not customer_id:
            logger.warning("No customer ID in payment intent")
            return

        # Get organization_id from payment_intent metadata
        organization_id = payment_intent.get('metadata', {}).get('organization_id')

        # Fallback to customer metadata
        if not organization_id:
            customer = await stripe_service.get_customer(customer_id)
            organization_id = customer.metadata.get('organization_id')

        if not organization_id:
            logger.warning(f"No organization_id found for payment intent {payment_intent['id']}")
            return
        
        # Create billing history entry for failed payment
        billing_data = BillingHistoryCreate(
            organization_id=UUID(organization_id),
            stripe_payment_intent_id=payment_intent['id'],
            amount=payment_intent['amount'],
            currency=payment_intent['currency'],
            status=BillingStatus.FAILED,
            description=f"Failed payment - {payment_intent.get('description', 'Credit purchase')}",
            billing_reason="manual"
        )
        
        await billing_service.create_billing_history(billing_data)
        
        logger.info(f"Processed failed payment intent for organization {organization_id}")
    
    except Exception as e:
        logger.error(f"Error handling payment intent failed: {e}")
        raise


def _map_stripe_status(stripe_status: str) -> SubscriptionStatus:
    """Map Stripe subscription status to our enum."""
    status_mapping = {
        'trialing': SubscriptionStatus.TRIAL,
        'active': SubscriptionStatus.ACTIVE,
        'past_due': SubscriptionStatus.PAST_DUE,
        'canceled': SubscriptionStatus.CANCELLED,
        'unpaid': SubscriptionStatus.EXPIRED,
        'incomplete': SubscriptionStatus.INCOMPLETE,
        'incomplete_expired': SubscriptionStatus.INCOMPLETE_EXPIRED
    }
    
    return status_mapping.get(stripe_status, SubscriptionStatus.ACTIVE)