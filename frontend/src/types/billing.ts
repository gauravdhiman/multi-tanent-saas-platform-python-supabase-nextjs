/**
 * Billing-related type definitions
 */

// Enums
export type SubscriptionStatus = 
  | 'trial'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'incomplete'
  | 'incomplete_expired';

export type TransactionType = 
  | 'earned'
  | 'purchased'
  | 'consumed'
  | 'expired'
  | 'refunded';

export type TransactionSource = 
  | 'subscription'
  | 'purchase'
  | 'event_consumption'
  | 'expiry'
  | 'refund'
  | 'admin_adjustment';

export type BillingStatus = 
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export type PlanInterval = 'monthly' | 'annual';

// Subscription Plan interfaces
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  stripe_price_id: string;
  stripe_product_id: string;
  price_amount: number; // in cents
  currency: string;
  interval: PlanInterval;
  interval_count: number;
  included_credits: number;
  max_users: number | null;
  features: Record<string, unknown> | null;
  is_active: boolean;
  trial_period_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlanCreate {
  name: string;
  description?: string;
  stripe_price_id: string;
  stripe_product_id: string;
  price_amount: number;
  currency?: string;
  interval: PlanInterval;
  interval_count?: number;
  included_credits?: number;
  max_users?: number;
  features?: Record<string, unknown>;
  is_active?: boolean;
  trial_period_days?: number;
}

export interface SubscriptionPlanUpdate {
  name?: string;
  description?: string;
  price_amount?: number;
  included_credits?: number;
  max_users?: number;
  features?: Record<string, unknown>;
  is_active?: boolean;
  trial_period_days?: number;
}

// Organization Subscription interfaces
export interface OrganizationSubscription {
  id: string;
  organization_id: string;
  subscription_plan_id: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSubscriptionWithPlan extends OrganizationSubscription {
  plan: SubscriptionPlan | null;
}

export interface OrganizationSubscriptionCreate {
  organization_id: string;
  subscription_plan_id: string;
  stripe_customer_id?: string;
}

// Credit Event interfaces
export interface CreditEvent {
  id: string;
  name: string;
  description: string | null;
  credit_cost: number;
  category: string;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreditEventCreate {
  name: string;
  description?: string;
  credit_cost: number;
  category: string;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

// Credit Transaction interfaces
export interface CreditTransaction {
  id: string;
  organization_id: string;
  transaction_type: TransactionType;
  amount: number;
  balance_after: number;
  source: TransactionSource;
  source_id: string | null;
  credit_event_id: string | null;
  expires_at: string | null;
  stripe_payment_intent_id: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CreditTransactionWithEvent extends CreditTransaction {
  credit_event: CreditEvent | null;
}

// Credit Product interfaces
export interface CreditProduct {
  id: string;
  name: string;
  description: string | null;
  stripe_price_id: string;
  stripe_product_id: string;
  credit_amount: number;
  price_amount: number; // in cents
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditProductCreate {
  name: string;
  description?: string;
  stripe_price_id: string;
  stripe_product_id: string;
  credit_amount: number;
  price_amount: number;
  currency?: string;
  is_active?: boolean;
}

// Billing History interfaces
export interface BillingHistory {
  id: string;
  organization_id: string;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  amount: number; // in cents
  currency: string;
  status: BillingStatus;
  description: string | null;
  invoice_url: string | null;
  receipt_url: string | null;
  billing_reason: string | null;
  metadata: Record<string, unknown> | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingHistoryCreate {
  organization_id: string;
  stripe_invoice_id?: string;
  stripe_payment_intent_id?: string;
  amount: number;
  currency?: string;
  status: BillingStatus;
  description?: string;
  invoice_url?: string;
  receipt_url?: string;
  billing_reason?: string;
  metadata?: Record<string, unknown>;
  paid_at?: string;
}

// API Response interfaces
export interface SubscriptionCheckoutResponse {
  checkout_url: string;
  session_id: string;
}

export interface CreditPurchaseResponse {
  checkout_url: string;
  session_id: string;
}

export interface OrganizationBillingSummary {
  organization_id: string;
  subscription: OrganizationSubscriptionWithPlan | null;
  credit_balance: number;
  current_period_usage: number;
  next_billing_date: string | null;
  amount_due: number | null;
}

export interface CreditBalance {
  total_credits: number;
  subscription_credits: number;
  purchased_credits: number;
  expiring_soon: number;
  expires_at: string | null;
}

export interface UsageStats {
  period_start: string;
  period_end: string;
  total_events: number;
  credits_consumed: number;
  events_by_category: Record<string, number>;
  credits_by_category: Record<string, number>;
}

// Credit Consumption interfaces
export interface CreditConsumptionRequest {
  organization_id: string;
  event_name: string;
  quantity?: number;
  metadata?: Record<string, unknown>;
}

export interface CreditConsumptionResponse {
  success: boolean;
  credits_consumed: number;
  balance_after: number;
  transaction_id: string;
}

// UI Helper interfaces
export interface PlanFeature {
  name: string;
  included: boolean;
  value?: string | number;
  description?: string;
}

export interface PlanComparison {
  plans: SubscriptionPlan[];
  features: string[];
  recommended?: string; // plan id
}

export interface BillingAlert {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  action?: {
    label: string;
    url: string;
  };
}

// Utility functions for billing
export const formatPrice = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

export const formatCredits = (credits: number): string => {
  return new Intl.NumberFormat('en-US').format(credits);
};

export const getSubscriptionStatusColor = (status: SubscriptionStatus): string => {
  switch (status) {
    case 'active':
      return 'green';
    case 'trial':
      return 'blue';
    case 'past_due':
      return 'yellow';
    case 'cancelled':
    case 'expired':
      return 'red';
    default:
      return 'gray';
  }
};

export const getSubscriptionStatusLabel = (status: SubscriptionStatus): string => {
  switch (status) {
    case 'trial':
      return 'Trial';
    case 'active':
      return 'Active';
    case 'past_due':
      return 'Past Due';
    case 'cancelled':
      return 'Cancelled';
    case 'expired':
      return 'Expired';
    case 'incomplete':
      return 'Incomplete';
    case 'incomplete_expired':
      return 'Incomplete Expired';
    default:
      return 'Unknown';
  }
};

export const getBillingStatusColor = (status: BillingStatus): string => {
  switch (status) {
    case 'paid':
      return 'green';
    case 'pending':
      return 'yellow';
    case 'failed':
      return 'red';
    case 'refunded':
      return 'blue';
    case 'cancelled':
      return 'gray';
    default:
      return 'gray';
  }
};

export const getBillingStatusLabel = (status: BillingStatus): string => {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'paid':
      return 'Paid';
    case 'failed':
      return 'Failed';
    case 'refunded':
      return 'Refunded';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
};