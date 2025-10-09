"""Add notification system tables

Revision ID: c1d2e3f4g5h6
Revises: b1c2d3e4f5g6
Create Date: 2025-10-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4g5h6'
down_revision: Union[str, None] = 'b1c2d3e4f5g6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Notification Events table - defines events that can trigger notifications
    op.create_table('notification_events',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.VARCHAR(length=100), nullable=False),
        sa.Column('description', sa.TEXT(), nullable=True),
        sa.Column('event_key', sa.VARCHAR(length=100), nullable=False, comment='Unique identifier for the event (e.g., user.signup, subscription.created)'),
        sa.Column('category', sa.VARCHAR(length=50), nullable=False, comment='Event category (e.g., auth, billing, organization)'),
        sa.Column('is_enabled', sa.BOOLEAN(), server_default=sa.text('true'), nullable=False),
        sa.Column('default_template_id', sa.UUID(), nullable=True, comment='Default template to use for this event'),
        sa.Column('metadata', postgresql.JSONB(), nullable=True, comment='Additional configuration (e.g., recipients, conditions)'),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('event_key')
    )

    # Notification Templates table - stores email templates
    op.create_table('notification_templates',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.VARCHAR(length=100), nullable=False),
        sa.Column('description', sa.TEXT(), nullable=True),
        sa.Column('subject', sa.VARCHAR(length=255), nullable=False),
        sa.Column('html_content', sa.TEXT(), nullable=False, comment='HTML email template with placeholders'),
        sa.Column('text_content', sa.TEXT(), nullable=True, comment='Plain text fallback'),
        sa.Column('from_email', sa.VARCHAR(length=255), nullable=True, comment='Override sender email'),
        sa.Column('from_name', sa.VARCHAR(length=100), nullable=True, comment='Override sender name'),
        sa.Column('template_variables', postgresql.JSONB(), nullable=True, comment='List of available template variables'),
        sa.Column('is_active', sa.BOOLEAN(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # Add foreign key constraint for default_template_id in notification_events
    op.create_foreign_key(
        'fk_notification_events_default_template',
        'notification_events',
        'notification_templates',
        ['default_template_id'],
        ['id'],
        ondelete='SET NULL'
    )

    # Notification Logs table - tracks all sent notifications
    op.create_table('notification_logs',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('notification_event_id', sa.UUID(), nullable=False),
        sa.Column('notification_template_id', sa.UUID(), nullable=True),
        sa.Column('organization_id', sa.UUID(), nullable=True, comment='Organization context if applicable'),
        sa.Column('user_id', sa.UUID(), nullable=True, comment='User who triggered or is recipient'),
        sa.Column('recipient_email', sa.VARCHAR(length=255), nullable=False),
        sa.Column('recipient_name', sa.VARCHAR(length=100), nullable=True),
        sa.Column('subject', sa.VARCHAR(length=255), nullable=False),
        sa.Column('status', sa.VARCHAR(length=50), nullable=False, comment='pending, sent, failed, bounced'),
        sa.Column('provider', sa.VARCHAR(length=50), nullable=False, server_default='resend', comment='Email provider used'),
        sa.Column('provider_message_id', sa.VARCHAR(length=255), nullable=True, comment='Provider-specific message ID'),
        sa.Column('error_message', sa.TEXT(), nullable=True),
        sa.Column('sent_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('metadata', postgresql.JSONB(), nullable=True, comment='Additional data (variables used, context)'),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['notification_event_id'], ['notification_events.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['notification_template_id'], ['notification_templates.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Enable Row Level Security (RLS) on notification tables
    op.execute("ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY")

    # Create indexes for performance
    op.create_index('idx_notification_events_event_key', 'notification_events', ['event_key'])
    op.create_index('idx_notification_events_category', 'notification_events', ['category'])
    op.create_index('idx_notification_events_is_enabled', 'notification_events', ['is_enabled'])
    op.create_index('idx_notification_templates_is_active', 'notification_templates', ['is_active'])
    op.create_index('idx_notification_logs_event_id', 'notification_logs', ['notification_event_id'])
    op.create_index('idx_notification_logs_organization_id', 'notification_logs', ['organization_id'])
    op.create_index('idx_notification_logs_user_id', 'notification_logs', ['user_id'])
    op.create_index('idx_notification_logs_status', 'notification_logs', ['status'])
    op.create_index('idx_notification_logs_created_at', 'notification_logs', ['created_at'])
    op.create_index('idx_notification_logs_recipient_email', 'notification_logs', ['recipient_email'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_notification_logs_recipient_email')
    op.drop_index('idx_notification_logs_created_at')
    op.drop_index('idx_notification_logs_status')
    op.drop_index('idx_notification_logs_user_id')
    op.drop_index('idx_notification_logs_organization_id')
    op.drop_index('idx_notification_logs_event_id')
    op.drop_index('idx_notification_templates_is_active')
    op.drop_index('idx_notification_events_is_enabled')
    op.drop_index('idx_notification_events_category')
    op.drop_index('idx_notification_events_event_key')
    
    # Drop tables in reverse order
    op.drop_table('notification_logs')
    op.drop_constraint('fk_notification_events_default_template', 'notification_events', type_='foreignkey')
    op.drop_table('notification_templates')
    op.drop_table('notification_events')
