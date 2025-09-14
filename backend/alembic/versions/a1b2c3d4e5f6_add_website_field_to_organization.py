"""add website field to organization

Revision ID: a1b2c3d4e5f6
Revises: 91759229c32b
Create Date: 2024-12-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '91759229c32b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add website column to organizations table."""
    op.add_column('organizations', sa.Column('website', sa.String(length=500), nullable=True))


def downgrade() -> None:
    """Remove website column from organizations table."""
    op.drop_column('organizations', 'website')