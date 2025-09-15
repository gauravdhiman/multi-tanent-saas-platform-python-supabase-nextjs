"""Add billing and subscription tables

Revision ID: b1c2d3e4f5g6
Revises: a1b2c3d4e5f6
Create Date: 2025-01-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5g6'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Subscription Plans table - defines available subscription tiers
    op.create_table('subscription_plans',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.VARCHAR(length=100), nullable=False),
        sa.Column('description', sa.TEXT(), nullable=True),
        sa.Column('stripe_price_id', sa.VARCHAR(length=255), nullable=False),
        sa.Column('stripe_product_id', sa.VARCHAR(length=255), nullable=False),
        sa.Column('price_amount', sa.INTEGER(), nullable=False, comment='Price in cents'),
        sa.Column('currency', sa.VARCHAR(length=3), nullable=False, server_default='USD'),
        sa.Column('interval', sa.VARCHAR(length=20), nullable=False),  # monthly, annual
        sa.Column('interval_count', sa.INTEGER(), nullable=False, server_default='1'),
        sa.Column('included_credits', sa.INTEGER(), nullable=False, server_default='0'),
        sa.Column('max_users', sa.INTEGER(), nullable=True),
        sa.Column('features', postgresql.JSONB(), nullable=True),
        sa.Column('is_active', sa.BOOLEAN(), server_default=sa.text('true'), nullable=False),
        sa.Column('trial_period_days', sa.INTEGER(), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('stripe_price_id')
    )

    # Organization Subscriptions table - tracks organization subscription status
    op.create_table('organization_subscriptions',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('subscription_plan_id', sa.UUID(), nullable=True),
        sa.Column('stripe_subscription_id', sa.VARCHAR(length=255), nullable=True),
        sa.Column('stripe_customer_id', sa.VARCHAR(length=255), nullable=False),
        sa.Column('status', sa.VARCHAR(length=50), nullable=False),  # trial, active, past_due, cancelled, expired
        sa.Column('current_period_start', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('current_period_end', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('trial_start', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('trial_end', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('cancel_at_period_end', sa.BOOLEAN(), server_default=sa.text('false'), nullable=False),
        sa.Column('cancelled_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('metadata', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subscription_plan_id'], ['subscription_plans.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id'),
        sa.UniqueConstraint('stripe_subscription_id')
    )

    # Credit Events table - defines events and their credit costs
    op.create_table('credit_events',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.VARCHAR(length=100), nullable=False),
        sa.Column('description', sa.TEXT(), nullable=True),
        sa.Column('credit_cost', sa.INTEGER(), nullable=False),
        sa.Column('category', sa.VARCHAR(length=50), nullable=False),  # api_call, storage, compute, etc.
        sa.Column('is_active', sa.BOOLEAN(), server_default=sa.text('true'), nullable=False),
        sa.Column('metadata', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # Credit Transactions table - tracks all credit movements
    op.create_table('credit_transactions',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('transaction_type', sa.VARCHAR(length=50), nullable=False),  # earned, purchased, consumed, expired
        sa.Column('amount', sa.INTEGER(), nullable=False),  # positive for credits added, negative for consumed
        sa.Column('balance_after', sa.INTEGER(), nullable=False),
        sa.Column('source', sa.VARCHAR(length=50), nullable=False),  # subscription, purchase, event_consumption, expiry
        sa.Column('source_id', sa.UUID(), nullable=True),  # reference to subscription, purchase, or event
        sa.Column('credit_event_id', sa.UUID(), nullable=True),  # for consumption transactions
        sa.Column('expires_at', postgresql.TIMESTAMP(timezone=True), nullable=True),  # for subscription credits
        sa.Column('stripe_payment_intent_id', sa.VARCHAR(length=255), nullable=True),
        sa.Column('description', sa.TEXT(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['credit_event_id'], ['credit_events.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # Credit Products table - for standalone credit purchases
    op.create_table('credit_products',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.VARCHAR(length=100), nullable=False),
        sa.Column('description', sa.TEXT(), nullable=True),
        sa.Column('stripe_price_id', sa.VARCHAR(length=255), nullable=False),
        sa.Column('stripe_product_id', sa.VARCHAR(length=255), nullable=False),
        sa.Column('credit_amount', sa.INTEGER(), nullable=False),
        sa.Column('price_amount', sa.INTEGER(), nullable=False, comment='Price in cents'),
        sa.Column('currency', sa.VARCHAR(length=3), nullable=False, server_default='USD'),
        sa.Column('is_active', sa.BOOLEAN(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('stripe_price_id')
    )

    # Billing History table - tracks payment history and invoices
    op.create_table('billing_history',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('stripe_invoice_id', sa.VARCHAR(length=255), nullable=True),
        sa.Column('stripe_payment_intent_id', sa.VARCHAR(length=255), nullable=True),
        sa.Column('amount', sa.INTEGER(), nullable=False, comment='Amount in cents'),
        sa.Column('currency', sa.VARCHAR(length=3), nullable=False, server_default='USD'),
        sa.Column('status', sa.VARCHAR(length=50), nullable=False),  # pending, paid, failed, refunded
        sa.Column('description', sa.TEXT(), nullable=True),
        sa.Column('invoice_url', sa.TEXT(), nullable=True),
        sa.Column('receipt_url', sa.TEXT(), nullable=True),
        sa.Column('billing_reason', sa.VARCHAR(length=50), nullable=True),  # subscription_create, subscription_cycle, manual
        sa.Column('metadata', postgresql.JSONB(), nullable=True),
        sa.Column('paid_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stripe_invoice_id')
    )

    # Add credit balance column to organizations
    op.add_column('organizations', sa.Column('credit_balance', sa.INTEGER(), server_default='0', nullable=False))

    # Enable Row Level Security (RLS) on billing tables
    op.execute("ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE credit_events ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE credit_products ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY")

    # Create indexes for performance
    op.create_index('idx_org_subscriptions_org_id', 'organization_subscriptions', ['organization_id'])
    op.create_index('idx_org_subscriptions_stripe_sub_id', 'organization_subscriptions', ['stripe_subscription_id'])
    op.create_index('idx_credit_transactions_org_id', 'credit_transactions', ['organization_id'])
    op.create_index('idx_credit_transactions_created_at', 'credit_transactions', ['created_at'])
    op.create_index('idx_billing_history_org_id', 'billing_history', ['organization_id'])
    op.create_index('idx_billing_history_stripe_invoice_id', 'billing_history', ['stripe_invoice_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_billing_history_stripe_invoice_id')
    op.drop_index('idx_billing_history_org_id')
    op.drop_index('idx_credit_transactions_created_at')
    op.drop_index('idx_credit_transactions_org_id')
    op.drop_index('idx_org_subscriptions_stripe_sub_id')
    op.drop_index('idx_org_subscriptions_org_id')
    
    # Drop column from organizations
    op.drop_column('organizations', 'credit_balance')
    
    # Drop tables in reverse order
    op.drop_table('billing_history')
    op.drop_table('credit_products')
    op.drop_table('credit_transactions')
    op.drop_table('credit_events')
    op.drop_table('organization_subscriptions')
    op.drop_table('subscription_plans')