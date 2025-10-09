"""Add email verification tokens table

Revision ID: d1e2f3g4h5i6
Revises: c1d2e3f4g5h6
Create Date: 2025-10-04 01:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd1e2f3g4h5i6'
down_revision: Union[str, None] = 'c1d2e3f4g5h6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Email Verification Tokens table
    op.create_table('email_verification_tokens',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False, comment='Reference to auth.users.id'),
        sa.Column('token', sa.VARCHAR(length=255), nullable=False, comment='Verification token'),
        sa.Column('expires_at', postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('used_at', postgresql.TIMESTAMP(timezone=True), nullable=True, comment='When token was used'),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token'),
        sa.UniqueConstraint('user_id', name='uq_email_verification_tokens_user_id')  # One token per user
    )

    # Create indexes
    op.create_index('idx_email_verification_tokens_user_id', 'email_verification_tokens', ['user_id'])
    op.create_index('idx_email_verification_tokens_token', 'email_verification_tokens', ['token'])
    op.create_index('idx_email_verification_tokens_expires_at', 'email_verification_tokens', ['expires_at'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_email_verification_tokens_expires_at')
    op.drop_index('idx_email_verification_tokens_token')
    op.drop_index('idx_email_verification_tokens_user_id')

    # Drop table
    op.drop_table('email_verification_tokens')