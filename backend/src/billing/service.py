"""
Core billing service for subscription and credit management.
"""

from typing import Optional, Any
from uuid import UUID
from datetime import datetime, timedelta
import logging

from config.supabase import supabase_config
from .models import (
    SubscriptionPlan, SubscriptionPlanCreate, SubscriptionPlanUpdate,
    OrganizationSubscription, OrganizationSubscriptionCreate, OrganizationSubscriptionUpdate,
    OrganizationSubscriptionWithPlan, CreditEvent, CreditEventCreate, CreditEventUpdate,
    CreditTransaction, CreditTransactionCreate, CreditTransactionWithEvent,
    CreditProduct, CreditProductCreate, CreditProductUpdate,
    BillingHistory, BillingHistoryCreate,
    OrganizationBillingSummary, CreditBalance, UsageStats,
    CreditConsumptionRequest, CreditConsumptionResponse,
    SubscriptionStatus, TransactionType, TransactionSource, BillingStatus,
    TransactionSourceMapping
)
from .stripe_service import stripe_service

logger = logging.getLogger(__name__)


class BillingService:
    """Service for managing billing, subscriptions, and credits."""
    
    def __init__(self):
        """Initialize billing service."""
        self.supabase = supabase_config.client
    
    # Subscription Plan Management
    async def create_subscription_plan(self, plan_data: SubscriptionPlanCreate) -> SubscriptionPlan:
        """Create a new subscription plan."""
        try:
            result = self.supabase.table("subscription_plans").insert(
                plan_data.model_dump()
            ).execute()
            
            if result.data:
                logger.info(f"Created subscription plan: {result.data[0]['id']}")
                return SubscriptionPlan(**result.data[0])
            
            raise Exception("Failed to create subscription plan")
            
        except Exception as e:
            logger.error(f"Error creating subscription plan: {e}")
            raise
    
    async def get_subscription_plans(self, active_only: bool = True) -> list[SubscriptionPlan]:
        """Get all subscription plans."""
        try:
            query = self.supabase.table("subscription_plans").select("*")
            
            if active_only:
                query = query.eq("is_active", True)
            
            result = query.execute()
            
            return [SubscriptionPlan(**plan) for plan in result.data]
            
        except Exception as e:
            logger.error(f"Error fetching subscription plans: {e}")
            raise
    
    async def get_subscription_plan(self, plan_id: UUID) -> Optional[SubscriptionPlan]:
        """Get a subscription plan by ID."""
        try:
            result = self.supabase.table("subscription_plans").select("*").eq(
                "id", str(plan_id)
            ).execute()
            
            if result.data:
                return SubscriptionPlan(**result.data[0])
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching subscription plan {plan_id}: {e}")
            raise
    
    async def update_subscription_plan(
        self, 
        plan_id: UUID, 
        plan_data: SubscriptionPlanUpdate
    ) -> Optional[SubscriptionPlan]:
        """Update a subscription plan."""
        try:
            update_data = {k: v for k, v in plan_data.model_dump().items() if v is not None}
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            result = self.supabase.table("subscription_plans").update(
                update_data
            ).eq("id", str(plan_id)).execute()
            
            if result.data:
                return SubscriptionPlan(**result.data[0])
            
            return None
            
        except Exception as e:
            logger.error(f"Error updating subscription plan {plan_id}: {e}")
            raise
    
    # Organization Subscription Management
    async def create_organization_subscription(
        self, 
        subscription_data: OrganizationSubscriptionCreate
    ) -> OrganizationSubscription:
        """Create an organization subscription."""
        try:
            # Get the subscription plan
            plan = await self.get_subscription_plan(subscription_data.subscription_plan_id)
            if not plan:
                raise ValueError(f"Subscription plan {subscription_data.subscription_plan_id} not found")
            
            # Create Stripe customer if not provided
            stripe_customer_id = subscription_data.stripe_customer_id
            if not stripe_customer_id:
                # Get organization details for customer creation
                org_result = self.supabase.table("organizations").select("*").eq(
                    "id", str(subscription_data.organization_id)
                ).execute()
                
                if not org_result.data:
                    raise ValueError(f"Organization {subscription_data.organization_id} not found")
                
                org = org_result.data[0]
                
                # Create Stripe customer
                customer = await stripe_service.create_customer(
                    email=f"billing@{org['slug']}.example.com",  # Replace with actual email
                    name=org['name'],
                    organization_id=str(subscription_data.organization_id)
                )
                stripe_customer_id = customer.id
            
            # Prepare subscription data
            sub_data = {
                "organization_id": str(subscription_data.organization_id),
                "subscription_plan_id": str(subscription_data.subscription_plan_id),
                "stripe_customer_id": stripe_customer_id,
                "status": SubscriptionStatus.TRIAL.value if plan.trial_period_days else SubscriptionStatus.ACTIVE.value
            }
            
            # Set trial period if applicable
            if plan.trial_period_days:
                trial_start = datetime.utcnow()
                trial_end = trial_start + timedelta(days=plan.trial_period_days)
                sub_data.update({
                    "trial_start": trial_start.isoformat(),
                    "trial_end": trial_end.isoformat()
                })
            
            result = self.supabase.table("organization_subscriptions").insert(
                sub_data
            ).execute()
            
            if result.data:
                subscription = OrganizationSubscription(**result.data[0])
                
                # Allocate initial credits if any
                if plan.included_credits > 0:
                    await self.add_subscription_credits(
                        subscription.organization_id,
                        plan.included_credits,
                        subscription.id,
                        subscription.current_period_end
                    )
                
                logger.info(f"Created organization subscription: {subscription.id}")
                return subscription
            
            raise Exception("Failed to create organization subscription")
            
        except Exception as e:
            logger.error(f"Error creating organization subscription: {e}")
            raise
    
    async def get_organization_subscription(
        self, 
        organization_id: UUID
    ) -> Optional[OrganizationSubscriptionWithPlan]:
        """Get organization subscription with plan details."""
        try:
            result = self.supabase.table("organization_subscriptions").select(
                "*, subscription_plans(*)"
            ).eq("organization_id", str(organization_id)).execute()
            
            if result.data:
                data = result.data[0]
                subscription = OrganizationSubscription(**{
                    k: v for k, v in data.items() 
                    if k != "subscription_plans"
                })
                
                plan = None
                if data.get("subscription_plans"):
                    plan = SubscriptionPlan(**data["subscription_plans"])
                
                return OrganizationSubscriptionWithPlan(
                    **subscription.model_dump(),
                    plan=plan
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching organization subscription for {organization_id}: {e}")
            raise
    
    async def update_organization_subscription(
        self,
        organization_id: UUID,
        subscription_data: OrganizationSubscriptionUpdate
    ) -> Optional[OrganizationSubscription]:
        """Update organization subscription."""
        try:
            update_data = {k: v for k, v in subscription_data.model_dump().items() if v is not None}

            # Convert any UUID objects to strings for JSON serialization
            for key, value in update_data.items():
                if isinstance(value, UUID):
                    update_data[key] = str(value)

            update_data["updated_at"] = datetime.utcnow().isoformat()

            result = self.supabase.table("organization_subscriptions").update(
                update_data
            ).eq("organization_id", str(organization_id)).execute()

            if result.data:
                updated_subscription = OrganizationSubscription(**result.data[0])

                # Handle credit reset for plan changes
                if subscription_data.subscription_plan_id:
                    new_plan = await self.get_subscription_plan(subscription_data.subscription_plan_id)
                    if new_plan:
                        # Reset credits to the new plan amount (not add to existing)
                        await self.reset_subscription_credits(
                            organization_id=organization_id,
                            credits=new_plan.included_credits,
                            subscription_id=updated_subscription.id,
                            expires_at=updated_subscription.current_period_end
                        )
                        logger.info(f"Reset credits to {new_plan.included_credits} for plan change to {new_plan.id}")

                return updated_subscription

            return None

        except Exception as e:
            logger.error(f"Error updating organization subscription for {organization_id}: {e}")
            raise
    
    # Credit Management
    async def get_credit_balance(self, organization_id: UUID) -> CreditBalance:
        """Get detailed credit balance for an organization."""
        try:
            # Get organization's current credit balance
            org_result = self.supabase.table("organizations").select(
                "credit_balance"
            ).eq("id", str(organization_id)).execute()
            
            if not org_result.data:
                raise ValueError(f"Organization {organization_id} not found")
            
            total_credits = org_result.data[0]["credit_balance"]
            
            # Get breakdown of subscription vs purchased credits
            thirty_days_from_now = (datetime.utcnow() + timedelta(days=30)).isoformat()
            
            # Subscription credits (with expiry)
            subscription_credits_result = self.supabase.table("credit_transactions").select(
                "amount"
            ).eq("organization_id", str(organization_id)).eq(
                "source", TransactionSource.SUBSCRIPTION.value
            ).eq("transaction_type", TransactionType.EARNED.value).not_.is_(
                "expires_at", "null"
            ).gte("expires_at", datetime.utcnow().isoformat()).execute()
            
            subscription_credits = sum(
                tx["amount"] for tx in subscription_credits_result.data
            )
            
            # Purchased credits (no expiry)
            purchased_credits_result = self.supabase.table("credit_transactions").select(
                "amount"
            ).eq("organization_id", str(organization_id)).eq(
                "source", TransactionSource.PURCHASE.value
            ).eq("transaction_type", TransactionType.PURCHASED.value).is_(
                "expires_at", "null"
            ).execute()
            
            purchased_credits = sum(
                tx["amount"] for tx in purchased_credits_result.data
            )
            
            # Credits expiring soon
            expiring_soon_result = self.supabase.table("credit_transactions").select(
                "amount, expires_at"
            ).eq("organization_id", str(organization_id)).not_.is_(
                "expires_at", "null"
            ).lte("expires_at", thirty_days_from_now).gte(
                "expires_at", datetime.utcnow().isoformat()
            ).order("expires_at").execute()
            
            expiring_soon = sum(tx["amount"] for tx in expiring_soon_result.data)
            next_expiry = None
            if expiring_soon_result.data:
                next_expiry = datetime.fromisoformat(
                    expiring_soon_result.data[0]["expires_at"].replace("Z", "+00:00")
                )
            
            return CreditBalance(
                total_credits=total_credits,
                subscription_credits=subscription_credits,
                purchased_credits=purchased_credits,
                expiring_soon=expiring_soon,
                expires_at=next_expiry
            )
            
        except Exception as e:
            logger.error(f"Error getting credit balance for {organization_id}: {e}")
            raise
    
    async def add_subscription_credits(
        self,
        organization_id: UUID,
        credits: int,
        subscription_id: UUID,
        expires_at: Optional[datetime] = None
    ) -> CreditTransaction:
        """Add subscription credits to an organization."""
        return await self._add_credits(
            organization_id=organization_id,
            credits=credits,
            source=TransactionSource.SUBSCRIPTION,
            source_id=subscription_id,
            expires_at=expires_at,
            description=f"Subscription credits allocation"
        )

    async def reset_subscription_credits(
        self,
        organization_id: UUID,
        credits: int,
        subscription_id: UUID,
        expires_at: Optional[datetime] = None
    ) -> CreditTransaction:
        """Reset subscription credits to a specific amount (for plan changes)."""
        try:
            # Get current balance
            org_result = self.supabase.table("organizations").select(
                "credit_balance"
            ).eq("id", str(organization_id)).execute()

            if not org_result.data:
                raise ValueError(f"Organization {organization_id} not found")

            current_balance = org_result.data[0]["credit_balance"]

            # Calculate the difference needed to reach the target credit amount
            # If current balance is 100 and we want 500, we need to add 400
            # If current balance is 600 and we want 100, we need to subtract 500
            credit_difference = credits - current_balance

            if credit_difference == 0:
                # No change needed
                logger.info(f"Credits already at target amount {credits} for organization {organization_id}")
                return None

            # Update organization balance to the exact target amount
            self.supabase.table("organizations").update({
                "credit_balance": credits,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", str(organization_id)).execute()

            # Create transaction record for the adjustment
            transaction_data = CreditTransactionCreate(
                organization_id=organization_id,
                transaction_type=TransactionType.EARNED if credit_difference > 0 else TransactionType.CONSUMED,
                amount=credit_difference,
                source=TransactionSource.SUBSCRIPTION,
                source_id=subscription_id,
                expires_at=expires_at,
                description=f"Plan change: credits reset to {credits}"
            )

            # Convert UUID objects to strings for JSON serialization
            transaction_dict = transaction_data.model_dump()
            if 'organization_id' in transaction_dict and transaction_dict['organization_id']:
                transaction_dict['organization_id'] = str(transaction_dict['organization_id'])
            if 'source_id' in transaction_dict and transaction_dict['source_id']:
                transaction_dict['source_id'] = str(transaction_dict['source_id'])

            # Set balance_after field (required by database)
            transaction_dict['balance_after'] = credits

            # Convert datetime objects to ISO strings
            if 'expires_at' in transaction_dict and transaction_dict['expires_at']:
                if isinstance(transaction_dict['expires_at'], datetime):
                    transaction_dict['expires_at'] = transaction_dict['expires_at'].isoformat()

            result = self.supabase.table("credit_transactions").insert(
                transaction_dict
            ).execute()

            if result.data:
                logger.info(f"Reset credits to {credits} for organization {organization_id} (was {current_balance})")
                return CreditTransaction(**result.data[0])

            raise Exception("Failed to create credit reset transaction")

        except Exception as e:
            logger.error(f"Error resetting credits to {credits} for {organization_id}: {e}")
            raise
    
    async def add_purchased_credits(
        self,
        organization_id: UUID,
        credits: int,
        stripe_payment_intent_id: str,
        description: Optional[str] = None
    ) -> CreditTransaction:
        """Add purchased credits to an organization."""
        return await self._add_credits(
            organization_id=organization_id,
            credits=credits,
            source=TransactionSource.PURCHASE,
            stripe_payment_intent_id=stripe_payment_intent_id,
            description=description or "Credit purchase"
        )
    
    async def _add_credits(
        self,
        organization_id: UUID,
        credits: int,
        source: TransactionSource,
        source_id: Optional[UUID] = None,
        expires_at: Optional[datetime] = None,
        stripe_payment_intent_id: Optional[str] = None,
        description: Optional[str] = None
    ) -> CreditTransaction:
        """Internal method to add credits."""
        try:
            # Get current balance
            org_result = self.supabase.table("organizations").select(
                "credit_balance"
            ).eq("id", str(organization_id)).execute()
            
            if not org_result.data:
                raise ValueError(f"Organization {organization_id} not found")
            
            current_balance = org_result.data[0]["credit_balance"]
            new_balance = current_balance + credits
            
            # Update organization balance
            self.supabase.table("organizations").update({
                "credit_balance": new_balance,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", str(organization_id)).execute()
            
            # Create transaction record using the validated model
            transaction_data = CreditTransactionCreate(
                organization_id=organization_id,
                transaction_type=TransactionType.EARNED if source == TransactionSource.SUBSCRIPTION else TransactionType.PURCHASED,
                amount=credits,
                source=source,
                source_id=source_id,
                expires_at=expires_at,
                stripe_payment_intent_id=stripe_payment_intent_id,
                description=description
            )

            # Convert UUID objects to strings for JSON serialization
            transaction_dict = transaction_data.model_dump()
            if 'organization_id' in transaction_dict and transaction_dict['organization_id']:
                transaction_dict['organization_id'] = str(transaction_dict['organization_id'])
            if 'source_id' in transaction_dict and transaction_dict['source_id']:
                transaction_dict['source_id'] = str(transaction_dict['source_id'])
            if 'credit_event_id' in transaction_dict and transaction_dict['credit_event_id']:
                transaction_dict['credit_event_id'] = str(transaction_dict['credit_event_id'])

            # Set balance_after field (required by database)
            transaction_dict['balance_after'] = new_balance

            # Log the polymorphic relationship for debugging
            table_name = TransactionSourceMapping.get_source_table(source)
            logger.debug(f"Creating credit transaction: source={source.value}, source_id={source_id}, references_table={table_name}")

            result = self.supabase.table("credit_transactions").insert(
                transaction_dict
            ).execute()
            
            if result.data:
                logger.info(f"Added {credits} credits to organization {organization_id} (source: {source.value})")
                return CreditTransaction(**result.data[0])
            
            raise Exception("Failed to create credit transaction")
            
        except Exception as e:
            logger.error(f"Error adding credits to {organization_id}: {e}")
            raise
    
    async def consume_credits(
        self, 
        consumption_request: CreditConsumptionRequest
    ) -> CreditConsumptionResponse:
        """Consume credits for an event."""
        try:
            # Get credit event details
            event_result = self.supabase.table("credit_events").select("*").eq(
                "name", consumption_request.event_name
            ).eq("is_active", True).execute()
            
            if not event_result.data:
                raise ValueError(f"Credit event '{consumption_request.event_name}' not found or inactive")
            
            credit_event = CreditEvent(**event_result.data[0])
            credits_needed = credit_event.credit_cost * consumption_request.quantity
            
            # Get current balance
            org_result = self.supabase.table("organizations").select(
                "credit_balance"
            ).eq("id", str(consumption_request.organization_id)).execute()
            
            if not org_result.data:
                raise ValueError(f"Organization {consumption_request.organization_id} not found")
            
            current_balance = int(org_result.data[0]["credit_balance"])
            
            if current_balance < credits_needed:
                return CreditConsumptionResponse(
                    success=False,
                    credits_consumed=0,
                    balance_after=current_balance,
                    transaction_id=UUID("00000000-0000-0000-0000-000000000000")
                )
            
            new_balance = current_balance - credits_needed
            
            # Update organization balance
            self.supabase.table("organizations").update({
                "credit_balance": new_balance,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", str(consumption_request.organization_id)).execute()
            
            # Create consumption transaction using validated model
            transaction_data = CreditTransactionCreate(
                organization_id=consumption_request.organization_id,
                transaction_type=TransactionType.CONSUMED,
                amount=-credits_needed,
                source=TransactionSource.EVENT_CONSUMPTION,
                source_id=credit_event.id,  # References credit_events table
                credit_event_id=credit_event.id,
                description=f"Consumed {consumption_request.quantity}x {consumption_request.event_name}",
                metadata=consumption_request.metadata
            )
            
            # Log the polymorphic relationship
            table_name = TransactionSourceMapping.get_source_table(TransactionSource.EVENT_CONSUMPTION)
            logger.debug(f"Creating consumption transaction: source_id={credit_event.id} references {table_name}")
            
            # Manually set balance_after since it's not in the create model
            transaction_dict = transaction_data.model_dump()
            transaction_dict["balance_after"] = new_balance

            # Convert UUID objects to strings for JSON serialization
            if 'organization_id' in transaction_dict and transaction_dict['organization_id']:
                transaction_dict['organization_id'] = str(transaction_dict['organization_id'])
            if 'source_id' in transaction_dict and transaction_dict['source_id']:
                transaction_dict['source_id'] = str(transaction_dict['source_id'])
            if 'credit_event_id' in transaction_dict and transaction_dict['credit_event_id']:
                transaction_dict['credit_event_id'] = str(transaction_dict['credit_event_id'])

            # Convert datetime objects to ISO strings
            if 'expires_at' in transaction_dict and transaction_dict['expires_at']:
                if isinstance(transaction_dict['expires_at'], datetime):
                    transaction_dict['expires_at'] = transaction_dict['expires_at'].isoformat()

            result = self.supabase.table("credit_transactions").insert(
                transaction_dict
            ).execute()
            
            if result.data:
                transaction = CreditTransaction(**result.data[0])
                logger.info(f"Consumed {credits_needed} credits for {consumption_request.event_name}")
                
                return CreditConsumptionResponse(
                    success=True,
                    credits_consumed=credits_needed,
                    balance_after=new_balance,
                    transaction_id=transaction.id
                )
            
            raise Exception("Failed to create consumption transaction")
            
        except Exception as e:
            logger.error(f"Error consuming credits: {e}")
            raise
    
    # Credit Events Management
    async def get_credit_events(self, active_only: bool = True) -> list[CreditEvent]:
        """Get all credit events."""
        try:
            query = self.supabase.table("credit_events").select("*")
            
            if active_only:
                query = query.eq("is_active", True)
            
            result = query.execute()
            
            return [CreditEvent(**event) for event in result.data]
            
        except Exception as e:
            logger.error(f"Error fetching credit events: {e}")
            raise
    
    # Credit Products Management
    async def get_credit_products(self, active_only: bool = True) -> list[CreditProduct]:
        """Get all credit products."""
        try:
            query = self.supabase.table("credit_products").select("*")
            
            if active_only:
                query = query.eq("is_active", True)
            
            result = query.order("credit_amount").execute()
            
            return [CreditProduct(**product) for product in result.data]
            
        except Exception as e:
            logger.error(f"Error fetching credit products: {e}")
            raise
    
    # Billing History
    async def create_billing_history(self, billing_data: BillingHistoryCreate) -> BillingHistory:
        """Create a billing history entry."""
        try:
            # Convert UUID objects to strings for JSON serialization
            billing_dict = billing_data.model_dump()
            if 'organization_id' in billing_dict and billing_dict['organization_id']:
                billing_dict['organization_id'] = str(billing_dict['organization_id'])

            # Convert datetime objects to ISO strings
            if 'paid_at' in billing_dict and billing_dict['paid_at']:
                if isinstance(billing_dict['paid_at'], datetime):
                    billing_dict['paid_at'] = billing_dict['paid_at'].isoformat()

            result = self.supabase.table("billing_history").insert(
                billing_dict
            ).execute()

            if result.data:
                return BillingHistory(**result.data[0])

            raise Exception("Failed to create billing history")

        except Exception as e:
            logger.error(f"Error creating billing history: {e}")
            raise
    
    async def get_billing_history(
        self, 
        organization_id: UUID,
        limit: int = 10
    ) -> list[BillingHistory]:
        """Get billing history for an organization."""
        try:
            result = self.supabase.table("billing_history").select("*").eq(
                "organization_id", str(organization_id)
            ).order("created_at", desc=True).limit(limit).execute()
            
            return [BillingHistory(**record) for record in result.data]
            
        except Exception as e:
            logger.error(f"Error fetching billing history for {organization_id}: {e}")
            raise
    
    # Billing Summary
    async def get_organization_billing_summary(
        self, 
        organization_id: UUID
    ) -> OrganizationBillingSummary:
        """Get comprehensive billing summary for an organization."""
        try:
            # Get subscription details
            subscription = await self.get_organization_subscription(organization_id)
            
            # Get credit balance
            credit_balance_info = await self.get_credit_balance(organization_id)
            
            # Calculate current period usage
            current_period_usage = 0
            if subscription and subscription.current_period_start:
                usage_result = self.supabase.table("credit_transactions").select(
                    "amount"
                ).eq("organization_id", str(organization_id)).eq(
                    "transaction_type", TransactionType.CONSUMED.value
                ).gte("created_at", subscription.current_period_start.isoformat()).execute()
                
                current_period_usage = abs(sum(
                    tx["amount"] for tx in usage_result.data
                ))
            
            # Determine next billing date and amount
            next_billing_date = None
            amount_due = None
            
            if subscription and subscription.current_period_end:
                next_billing_date = subscription.current_period_end
                if subscription.plan:
                    amount_due = subscription.plan.price_amount
            
            return OrganizationBillingSummary(
                organization_id=organization_id,
                subscription=subscription,
                credit_balance=credit_balance_info.total_credits,
                current_period_usage=current_period_usage,
                next_billing_date=next_billing_date,
                amount_due=amount_due
            )
            
        except Exception as e:
            logger.error(f"Error getting billing summary for {organization_id}: {e}")
            raise
    
    # Polymorphic Relationship Utilities
    async def validate_transaction_references(self, organization_id: Optional[UUID] = None) -> dict[str, list[dict[str, Any]]]:
        """Validate polymorphic references in credit transactions.
        
        Returns a report of invalid or orphaned references.
        """
        try:
            # Get transactions to validate
            query = self.supabase.table("credit_transactions").select("*")
            if organization_id:
                query = query.eq("organization_id", str(organization_id))
            
            result = query.execute()
            transactions = result.data
            
            validation_report = {
                "invalid_source_relationships": [],
                "orphaned_references": [],
                "valid_transactions": 0,
                "total_transactions": len(transactions)
            }
            
            for tx in transactions:
                source = TransactionSource(tx["source"])
                source_id = tx.get("source_id")
                
                # Check source/source_id relationship validity
                if not TransactionSourceMapping.validate_source_relationship(source, source_id):
                    validation_report["invalid_source_relationships"].append({
                        "transaction_id": tx["id"],
                        "source": tx["source"],
                        "source_id": source_id,
                        "error": TransactionSourceMapping.get_validation_error(source, source_id)
                    })
                    continue
                
                # Check if referenced record exists (for sources that require it)
                if source_id and TransactionSourceMapping.requires_source_id(source):
                    table_name = TransactionSourceMapping.get_source_table(source)
                    if table_name:
                        ref_result = self.supabase.table(table_name).select("id").eq(
                            "id", str(source_id)
                        ).execute()
                        
                        if not ref_result.data:
                            validation_report["orphaned_references"].append({
                                "transaction_id": tx["id"],
                                "source": tx["source"],
                                "source_id": source_id,
                                "referenced_table": table_name,
                                "error": f"Referenced {table_name} record {source_id} does not exist"
                            })
                            continue
                
                validation_report["valid_transactions"] += 1
            
            logger.info(f"Transaction validation complete. Valid: {validation_report['valid_transactions']}/{validation_report['total_transactions']}")
            return validation_report
            
        except Exception as e:
            logger.error(f"Error validating transaction references: {e}")
            raise
    
    async def get_transaction_source_details(self, transaction_id: UUID) -> dict[str, Any]:
        """Get detailed information about a transaction's source reference.
        
        This is useful for debugging polymorphic relationships.
        """
        try:
            # Get the transaction
            result = self.supabase.table("credit_transactions").select("*").eq(
                "id", str(transaction_id)
            ).execute()
            
            if not result.data:
                raise ValueError(f"Transaction {transaction_id} not found")
            
            tx = result.data[0]
            source = TransactionSource(tx["source"])
            source_id = tx.get("source_id")
            
            details = {
                "transaction_id": str(transaction_id),
                "source": tx["source"],
                "source_id": source_id,
                "expected_table": TransactionSourceMapping.get_source_table(source),
                "requires_source_id": TransactionSourceMapping.requires_source_id(source),
                "relationship_valid": TransactionSourceMapping.validate_source_relationship(source, source_id),
                "referenced_record": None
            }
            
            # Fetch referenced record if it exists
            if source_id and details["expected_table"]:
                ref_result = self.supabase.table(details["expected_table"]).select("*").eq(
                    "id", str(source_id)
                ).execute()
                
                if ref_result.data:
                    details["referenced_record"] = ref_result.data[0]
                else:
                    details["reference_exists"] = False
            
            return details
            
        except Exception as e:
            logger.error(f"Error getting transaction source details for {transaction_id}: {e}")
            raise


# Global instance
billing_service = BillingService()