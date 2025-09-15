# Billing System Implementation Guide

## Overview

This document outlines the comprehensive billing system implementation for the multi-tenant SaaS platform, including Stripe integration, subscription management, and credit-based usage tracking.

## Architecture

### Database Schema

The billing system uses the following database tables:

#### Core Tables
- **subscription_plans**: Available subscription tiers with pricing and features
- **organization_subscriptions**: Organization subscription status and details
- **credit_events**: Configurable events that consume credits
- **credit_transactions**: All credit movements (earned, consumed, purchased)
- **credit_products**: Standalone credit packages for purchase
- **billing_history**: Payment history and invoices

#### Key Features
- Multi-tiered subscription plans (monthly/annual)
- Credit-based usage system with configurable events
- Independent credit purchases with no expiry
- Subscription credits that expire per billing period
- Comprehensive audit trail for all transactions

### Backend Implementation

#### Services
1. **StripeService** (`backend/src/billing/stripe_service.py`)
   - Stripe API integration
   - Customer management
   - Subscription lifecycle
   - Payment processing
   - Webhook verification

2. **BillingService** (`backend/src/billing/service.py`)
   - Core business logic
   - Credit management
   - Subscription handling
   - Usage tracking
   - Billing summaries

3. **WebhookHandler** (`backend/src/billing/webhook_handler.py`)
   - Stripe webhook processing
   - Event-driven subscription updates
   - Automatic credit allocation
   - Payment status synchronization

#### API Endpoints (`backend/src/billing/routes.py`)
- Subscription plan management
- Organization subscription operations
- Credit balance and consumption
- Billing history retrieval
- Stripe checkout sessions
- Customer portal access

### Frontend Implementation

#### Components
1. **Billing Page** (`frontend/src/app/(dashboard)/billing/page.tsx`)
   - Comprehensive billing dashboard
   - Subscription management interface
   - Credit purchase and tracking
   - Billing history display

2. **Billing Service** (`frontend/src/services/billing-service.ts`)
   - API integration layer
   - Stripe checkout handling
   - Data formatting utilities

3. **Type Definitions** (`frontend/src/types/billing.ts`)
   - TypeScript interfaces
   - Utility functions
   - Status enumerations

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Database Migration

Run the billing tables migration:

```bash
cd backend
alembic upgrade head
```

## Stripe Setup

### 1. Create Stripe Products and Prices

Create products and prices in Stripe Dashboard or via API:

```bash
# Example: Create a subscription plan
stripe products create \
  --name "Professional Plan" \
  --description "Perfect for growing teams"

stripe prices create \
  --product prod_xxx \
  --unit_amount 4900 \
  --currency usd \
  --recurring[interval]=month
```

### 2. Configure Webhooks

Set up webhook endpoint in Stripe Dashboard:
- URL: `https://yourapp.com/api/billing/webhook/stripe`
- Events to listen for:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`

### 3. Update Subscription Plans

Update the default plans in the migration file with your actual Stripe price IDs.

## Usage Examples

### Backend Usage

#### Create a Subscription
```python
from src.billing.service import billing_service
from src.billing.models import OrganizationSubscriptionCreate

subscription_data = OrganizationSubscriptionCreate(
    organization_id="org-uuid",
    subscription_plan_id="plan-uuid"
)

subscription = await billing_service.create_organization_subscription(subscription_data)
```

#### Consume Credits
```python
from src.billing.models import CreditConsumptionRequest

consumption = CreditConsumptionRequest(
    organization_id="org-uuid",
    event_name="api_call_basic",
    quantity=10
)

result = await billing_service.consume_credits(consumption)
```

### Frontend Usage

#### Initialize Subscription
```typescript
import { billingService } from '@/services/billing-service';

// Redirect to Stripe checkout
await billingService.initializeSubscription(organizationId, planId);
```

#### Purchase Credits
```typescript
// Redirect to Stripe checkout for credit purchase
await billingService.purchaseCredits(organizationId, productId);
```

## Credit System

### Credit Events

Configure events that consume credits:

```sql
INSERT INTO credit_events (name, description, credit_cost, category) VALUES
('api_call_basic', 'Basic API call', 1, 'api_call'),
('api_call_premium', 'Premium API call', 5, 'api_call'),
('storage_gb_month', 'Storage per GB per month', 10, 'storage'),
('ai_inference', 'AI model inference', 25, 'ai');
```

### Credit Precedence

Credits are consumed in the following order:
1. **Purchased Credits** (no expiry) - consumed first
2. **Subscription Credits** (expire at period end) - consumed second

### Credit Allocation

- **Subscription Credits**: Allocated at the start of each billing period
- **Purchased Credits**: Added immediately upon successful payment
- **Expiry**: Only subscription credits expire at the end of billing period

## Subscription Lifecycle

### Status Flow
1. **Trial** → **Active** (when trial ends and payment succeeds)
2. **Active** → **Past Due** (when payment fails)
3. **Past Due** → **Active** (when payment is retried successfully)
4. **Active** → **Cancelled** (when cancelled by user/admin)
5. **Any Status** → **Expired** (when subscription ends without renewal)

### Webhook-Driven Updates

All subscription status changes are handled via Stripe webhooks to ensure data consistency.

## Security Considerations

### Row Level Security (RLS)

All billing tables have RLS enabled with appropriate policies:
- Organizations can only access their own billing data
- Platform admins have full access
- Proper user role validation

### Webhook Security

- Webhook signature verification using Stripe signature
- Idempotency handling for duplicate events
- Error handling and retry logic

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Subscription Health**
   - Active subscriptions
   - Churn rate
   - Trial conversions

2. **Credit Usage**
   - Average credits per organization
   - Credit consumption trends
   - Low balance alerts

3. **Payment Processing**
   - Payment success rates
   - Failed payment recovery
   - Revenue tracking

### Recommended Alerts

- Credit balance below threshold (< 1000 credits)
- Failed payments requiring attention
- Subscription cancellations
- Unusual credit consumption patterns

## Testing

### Test Data

The migration includes sample subscription plans and credit products for testing.

### Test Webhooks

Use Stripe CLI for local webhook testing:

```bash
stripe listen --forward-to localhost:8000/api/billing/webhook/stripe
```

### Test Credit Consumption

```python
# Test API endpoint
POST /api/billing/credits/consume
{
  "organization_id": "uuid",
  "event_name": "api_call_basic",
  "quantity": 1
}
```

## Troubleshooting

### Common Issues

1. **Webhook Failures**
   - Verify webhook secret configuration
   - Check webhook URL accessibility
   - Review webhook event logs in Stripe Dashboard

2. **Credit Consumption Errors**
   - Ensure credit events are properly configured
   - Verify organization has sufficient credit balance
   - Check for inactive credit events

3. **Subscription Sync Issues**
   - Manually trigger webhook replay from Stripe Dashboard
   - Verify customer metadata includes organization_id
   - Check subscription status mapping

### Debug Tools

- Stripe Dashboard webhook logs
- Application logs for billing operations
- Database queries for credit transactions
- Customer portal for subscription management

## Future Enhancements

### Planned Features

1. **Usage Analytics**
   - Detailed usage reports
   - Cost optimization recommendations
   - Predictive analytics

2. **Advanced Billing**
   - Usage-based billing
   - Tiered pricing models
   - Enterprise custom pricing

3. **Credit Management**
   - Credit gifting/transfers
   - Bulk credit operations
   - Credit expiry notifications

4. **Integration Enhancements**
   - Multiple payment methods
   - International payment support
   - Tax calculation integration

## Support

For issues related to the billing system:

1. Check the application logs for error details
2. Review Stripe Dashboard for payment/webhook issues
3. Verify environment variable configuration
4. Consult this documentation for common solutions

## API Reference

### Subscription Management
- `GET /api/billing/plans` - List subscription plans
- `POST /api/billing/subscription/checkout` - Create subscription checkout
- `GET /api/billing/subscription/{org_id}` - Get organization subscription
- `POST /api/billing/subscription/portal` - Access customer portal

### Credit Management
- `GET /api/billing/credits/{org_id}` - Get credit balance
- `POST /api/billing/credits/consume` - Consume credits
- `GET /api/billing/credit-products` - List credit products
- `POST /api/billing/credit-products/checkout` - Purchase credits

### Billing Information
- `GET /api/billing/summary/{org_id}` - Get billing summary
- `GET /api/billing/history/{org_id}` - Get billing history
- `POST /api/billing/webhook/stripe` - Stripe webhook endpoint