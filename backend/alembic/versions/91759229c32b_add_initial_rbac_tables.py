"""Add initial RBAC tables

Revision ID: 91759229c32b
Revises: 
Create Date: 2025-09-02 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '91759229c32b'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Organizations table - defines tenant organizations
    op.create_table('organizations',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.VARCHAR(length=100), nullable=False),
        sa.Column('description', sa.TEXT(), nullable=True),
        sa.Column('slug', sa.VARCHAR(length=100), nullable=False),
        sa.Column('is_active', sa.BOOLEAN(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('slug')
    )
    
    # Roles table - defines available roles in the system
    op.create_table('roles',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.VARCHAR(length=50), nullable=False),
        sa.Column('description', sa.TEXT(), nullable=True),
        sa.Column('is_system_role', sa.BOOLEAN(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Permissions table - defines individual permissions
    op.create_table('permissions',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.VARCHAR(length=100), nullable=False),
        sa.Column('description', sa.TEXT(), nullable=True),
        sa.Column('resource', sa.VARCHAR(length=50), nullable=False),
        sa.Column('action', sa.VARCHAR(length=50), nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Role-Permissions junction table - maps roles to their permissions
    op.create_table('role_permissions',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('role_id', sa.UUID(), nullable=False),
        sa.Column('permission_id', sa.UUID(), nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('role_id', 'permission_id')
    )
    
    # User-Roles junction table - maps users to their roles within organizations
    op.create_table('user_roles',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('role_id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['auth.users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'organization_id')
    )
    
    # Predefined system roles
    op.execute("""
        INSERT INTO roles (name, description, is_system_role) VALUES
            ('platform_admin', 'Full control over the entire platform across all tenants', TRUE),
            ('org_admin', 'Administrator for a specific organization with user management capabilities', TRUE),
            ('regular_user', 'Standard user with no administrative privileges', TRUE)
        ON CONFLICT (name) DO NOTHING
    """)
    
    # Common permissions
    op.execute("""
        INSERT INTO permissions (name, description, resource, action) VALUES
            -- User management permissions
            ('user:create', 'Create new users', 'user', 'create'),
            ('user:read', 'View user information', 'user', 'read'),
            ('user:update', 'Update user information', 'user', 'update'),
            ('user:delete', 'Delete users', 'user', 'delete'),
            
            -- Organization management permissions
            ('organization:create', 'Create new organizations', 'organization', 'create'),
            ('organization:read', 'View organization information', 'organization', 'read'),
            ('organization:update', 'Update organization information', 'organization', 'update'),
            ('organization:delete', 'Delete organizations', 'organization', 'delete'),
            
            -- Role management permissions
            ('role:create', 'Create new roles', 'role', 'create'),
            ('role:read', 'View role information', 'role', 'read'),
            ('role:update', 'Update role information', 'role', 'update'),
            ('role:delete', 'Delete roles', 'role', 'delete'),
            
            -- Permission management permissions
            ('permission:read', 'View permission information', 'permission', 'read'),
            ('permission:assign', 'Assign permissions to roles', 'permission', 'assign'),
            
            -- Billing management permissions
            ('billing:read', 'View billing information', 'billing', 'read'),
            ('billing:update', 'Update billing information', 'billing', 'update'),
            ('billing:subscribe', 'Manage subscriptions', 'billing', 'subscribe'),
            
            -- Platform administration permissions
            ('platform:settings', 'Manage platform settings', 'platform', 'settings'),
            ('platform:audit', 'View audit logs', 'platform', 'audit')
        ON CONFLICT (name) DO NOTHING
    """)
    
    # Assign permissions to system roles
    # Platform Admin - full access to everything
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r, permissions p
        WHERE r.name = 'platform_admin'
        ON CONFLICT DO NOTHING
    """)
    
    # Organization Admin - can manage users and organization within their org
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        CROSS JOIN (
            SELECT id FROM permissions 
            WHERE name IN (
                'user:create', 'user:read', 'user:update', 'user:delete',
                'organization:read', 'organization:update'
            )
        ) p
        WHERE r.name = 'org_admin'
        ON CONFLICT DO NOTHING
    """)
    
    # Regular User - basic read access to their own information
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        CROSS JOIN (
            SELECT id FROM permissions 
            WHERE name IN ('user:read', 'organization:read')
        ) p
        WHERE r.name = 'regular_user'
        ON CONFLICT DO NOTHING
    """)
    
    # Enable Row Level Security (RLS) on RBAC tables
    op.execute("ALTER TABLE organizations ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE roles ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE permissions ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    # Drop RLS policies
    op.execute("DROP POLICY IF EXISTS \"Org admins can manage user roles within their organization\" ON user_roles")
    op.execute("DROP POLICY IF EXISTS \"Platform admins can manage all user roles\" ON user_roles")
    op.execute("DROP POLICY IF EXISTS \"Users can view their own roles\" ON user_roles")
    op.execute("DROP POLICY IF EXISTS \"Platform admins can manage role permissions\" ON role_permissions")
    op.execute("DROP POLICY IF EXISTS \"Authenticated users can view permissions\" ON permissions")
    op.execute("DROP POLICY IF EXISTS \"Platform admins can view all permissions\" ON permissions")
    op.execute("DROP POLICY IF EXISTS \"Authenticated users can view roles\" ON roles")
    op.execute("DROP POLICY IF EXISTS \"Platform admins can view all roles\" ON roles")
    op.execute("DROP POLICY IF EXISTS \"Org admins can manage organizations\" ON organizations")
    op.execute("DROP POLICY IF EXISTS \"Platform admins can manage all organizations\" ON organizations")
    op.execute("DROP POLICY IF EXISTS \"Users can view organizations they belong to\" ON organizations")
    
    # Drop tables in reverse order
    op.drop_table('user_roles')
    op.drop_table('role_permissions')
    op.drop_table('permissions')
    op.drop_table('roles')
    op.drop_table('organizations')