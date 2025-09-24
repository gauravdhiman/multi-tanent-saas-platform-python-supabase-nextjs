"""
RBAC System Tests
"""

import pytest
from uuid import uuid4
from src.auth.rbac_models import RoleCreate, PermissionCreate, UserRoleCreate
from src.auth.rbac_service import rbac_service


class TestRBAC:
    """Test cases for the RBAC system."""
    
    @pytest.mark.asyncio
    async def test_create_role(self):
        """Test creating a new role."""
        role_data = RoleCreate(
            name="test_role",
            description="A test role"
        )
        
        role, error = await rbac_service.create_role(role_data)
        assert error is None
        assert role is not None
        assert role.name == "test_role"
        assert role.description == "A test role"
    
    @pytest.mark.asyncio
    async def test_create_permission(self):
        """Test creating a new permission."""
        permission_data = PermissionCreate(
            name="test:permission",
            description="A test permission",
            resource="test",
            action="permission"
        )
        
        permission, error = await rbac_service.create_permission(permission_data)
        assert error is None
        assert permission is not None
        assert permission.name == "test:permission"
        assert permission.resource == "test"
        assert permission.action == "permission"
    
    @pytest.mark.asyncio
    async def test_assign_role_to_user(self):
        """Test assigning a role to a user."""
        # Create a test role
        role_data = RoleCreate(
            name="test_user_role",
            description="A test role for users"
        )
        
        role, error = await rbac_service.create_role(role_data)
        assert error is None
        assert role is not None
        
        # Create a test user role assignment
        user_id = uuid4()
        user_role_data = UserRoleCreate(
            user_id=user_id,
            role_id=role.id,
            organization_id=None
        )
        
        user_role, error = await rbac_service.assign_role_to_user(user_role_data)
        assert error is None
        assert user_role is not None
        assert user_role.user_id == user_id
        assert user_role.role_id == role.id
    
    @pytest.mark.asyncio
    async def test_get_user_roles(self):
        """Test getting roles for a user."""
        # Create a test user
        user_id = uuid4()
        
        # Get roles for the user (should be empty initially)
        roles, error = await rbac_service.get_user_roles(user_id)
        assert error is None
        assert roles == []
    
    @pytest.mark.asyncio
    async def test_get_all_roles(self):
        """Test getting all roles."""
        roles, error = await rbac_service.get_all_roles()
        assert error is None
        assert isinstance(roles, list)
        # Should at least have the predefined roles
        assert len(roles) >= 3


if __name__ == "__main__":
    pytest.main([__file__])