"""
Role-Based Access Control (RBAC) service for managing roles, permissions, and access control.
"""

from typing import List, Optional, Tuple, Dict, Any
from uuid import UUID
import asyncio
from config import supabase_config
from .rbac_models import (
    Organization, OrganizationCreate, OrganizationUpdate,
    Role, RoleCreate, RoleUpdate,
    Permission, PermissionCreate, PermissionUpdate,
    RolePermission,
    UserRole, UserRoleCreate, UserRoleUpdate,
    RoleWithPermissions, UserWithRoles
)


class RBACService:
    """Service for handling Role-Based Access Control operations."""
    
    def __init__(self):
        self.supabase_config = supabase_config
    
    @property
    def supabase(self):
        """Get Supabase client, raise error if not configured."""
        if not self.supabase_config.is_configured():
            raise ValueError("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
        return self.supabase_config.client
    
    # Organization operations
    
    async def create_organization(self, org_data: OrganizationCreate) -> Tuple[Optional[Organization], Optional[str]]:
        """Create a new organization."""
        try:
            response = self.supabase.table("organizations").insert({
                "name": org_data.name,
                "description": org_data.description,
                "slug": org_data.slug,
                "is_active": org_data.is_active
            }).execute()
            
            if not response.data:
                return None, "Failed to create organization"
            
            org_dict = response.data[0]
            return Organization(
                id=org_dict["id"],
                name=org_dict["name"],
                description=org_dict["description"],
                slug=org_dict["slug"],
                is_active=org_dict["is_active"],
                created_at=org_dict["created_at"],
                updated_at=org_dict["updated_at"]
            ), None
            
        except Exception as e:
            return None, str(e)
    
    async def get_organization_by_id(self, org_id: UUID) -> Tuple[Optional[Organization], Optional[str]]:
        """Get an organization by its ID."""
        try:
            response = self.supabase.table("organizations").select("*").eq("id", str(org_id)).execute()
            
            if not response.data:
                return None, "Organization not found"
            
            org_dict = response.data[0]
            return Organization(
                id=org_dict["id"],
                name=org_dict["name"],
                description=org_dict["description"],
                slug=org_dict["slug"],
                is_active=org_dict["is_active"],
                created_at=org_dict["created_at"],
                updated_at=org_dict["updated_at"]
            ), None
            
        except Exception as e:
            return None, str(e)
    
    async def get_organization_by_slug(self, slug: str) -> Tuple[Optional[Organization], Optional[str]]:
        """Get an organization by its slug."""
        try:
            response = self.supabase.table("organizations").select("*").eq("slug", slug).execute()
            
            if not response.data:
                return None, "Organization not found"
            
            org_dict = response.data[0]
            return Organization(
                id=org_dict["id"],
                name=org_dict["name"],
                description=org_dict["description"],
                slug=org_dict["slug"],
                is_active=org_dict["is_active"],
                created_at=org_dict["created_at"],
                updated_at=org_dict["updated_at"]
            ), None
            
        except Exception as e:
            return None, str(e)
    
    async def get_all_organizations(self) -> Tuple[List[Organization], Optional[str]]:
        """Get all organizations."""
        try:
            response = self.supabase.table("organizations").select("*").execute()
            
            organizations = []
            for org_dict in response.data:
                organizations.append(Organization(
                    id=org_dict["id"],
                    name=org_dict["name"],
                    description=org_dict["description"],
                    slug=org_dict["slug"],
                    is_active=org_dict["is_active"],
                    created_at=org_dict["created_at"],
                    updated_at=org_dict["updated_at"]
                ))
            
            return organizations, None
            
        except Exception as e:
            return [], str(e)
    
    async def update_organization(self, org_id: UUID, org_data: OrganizationUpdate) -> Tuple[Optional[Organization], Optional[str]]:
        """Update an organization."""
        try:
            update_data = {}
            if org_data.name is not None:
                update_data["name"] = org_data.name
            if org_data.description is not None:
                update_data["description"] = org_data.description
            if org_data.slug is not None:
                update_data["slug"] = org_data.slug
            if org_data.is_active is not None:
                update_data["is_active"] = org_data.is_active
            
            if not update_data:
                return await self.get_organization_by_id(org_id)
            
            response = self.supabase.table("organizations").update(update_data).eq("id", str(org_id)).execute()
            
            if not response.data:
                return None, "Organization not found or update failed"
            
            org_dict = response.data[0]
            return Organization(
                id=org_dict["id"],
                name=org_dict["name"],
                description=org_dict["description"],
                slug=org_dict["slug"],
                is_active=org_dict["is_active"],
                created_at=org_dict["created_at"],
                updated_at=org_dict["updated_at"]
            ), None
            
        except Exception as e:
            return None, str(e)
    
    async def delete_organization(self, org_id: UUID) -> Tuple[bool, Optional[str]]:
        """Delete an organization."""
        try:
            response = self.supabase.table("organizations").delete().eq("id", str(org_id)).execute()
            
            if not response.data:
                return False, "Organization not found or delete failed"
            
            return True, None
            
        except Exception as e:
            return False, str(e)
    
    # Role operations
    
    async def create_role(self, role_data: RoleCreate) -> Tuple[Optional[Role], Optional[str]]:
        """Create a new role."""
        try:
            response = self.supabase.table("roles").insert({
                "name": role_data.name,
                "description": role_data.description,
                "is_system_role": False  # Only system can create system roles
            }).execute()
            
            if not response.data:
                return None, "Failed to create role"
            
            role_dict = response.data[0]
            return Role(
                id=role_dict["id"],
                name=role_dict["name"],
                description=role_dict["description"],
                is_system_role=role_dict["is_system_role"],
                created_at=role_dict["created_at"],
                updated_at=role_dict["updated_at"]
            ), None
            
        except Exception as e:
            return None, str(e)
    
    async def get_role_by_id(self, role_id: UUID) -> Tuple[Optional[Role], Optional[str]]:
        """Get a role by its ID."""
        try:
            response = self.supabase.table("roles").select("*").eq("id", str(role_id)).execute()
            
            if not response.data:
                return None, "Role not found"
            
            role_dict = response.data[0]
            return Role(
                id=role_dict["id"],
                name=role_dict["name"],
                description=role_dict["description"],
                is_system_role=role_dict["is_system_role"],
                created_at=role_dict["created_at"],
                updated_at=role_dict["updated_at"]
            ), None
            
        except Exception as e:
            return None, str(e)
    
    async def get_role_by_name(self, name: str) -> Tuple[Optional[Role], Optional[str]]:
        """Get a role by its name."""
        try:
            response = self.supabase.table("roles").select("*").eq("name", name).execute()
            
            if not response.data:
                return None, "Role not found"
            
            role_dict = response.data[0]
            return Role(
                id=role_dict["id"],
                name=role_dict["name"],
                description=role_dict["description"],
                is_system_role=role_dict["is_system_role"],
                created_at=role_dict["created_at"],
                updated_at=role_dict["updated_at"]
            ), None
            
        except Exception as e:
            return None, str(e)
    
    async def get_all_roles(self) -> Tuple[List[Role], Optional[str]]:
        """Get all roles."""
        try:
            response = self.supabase.table("roles").select("*").execute()
            
            roles = []
            for role_dict in response.data:
                roles.append(Role(
                    id=role_dict["id"],
                    name=role_dict["name"],
                    description=role_dict["description"],
                    is_system_role=role_dict["is_system_role"],
                    created_at=role_dict["created_at"],
                    updated_at=role_dict["updated_at"]
                ))
            
            return roles, None
            
        except Exception as e:
            return [], str(e)
    
    async def update_role(self, role_id: UUID, role_data: RoleUpdate) -> Tuple[Optional[Role], Optional[str]]:
        """Update a role."""
        try:
            update_data = {}
            if role_data.name is not None:
                update_data["name"] = role_data.name
            if role_data.description is not None:
                update_data["description"] = role_data.description
            
            if not update_data:
                return await self.get_role_by_id(role_id)
            
            response = self.supabase.table("roles").update(update_data).eq("id", str(role_id)).execute()
            
            if not response.data:
                return None, "Role not found or update failed"
            
            role_dict = response.data[0]
            return Role(
                id=role_dict["id"],
                name=role_dict["name"],
                description=role_dict["description"],
                is_system_role=role_dict["is_system_role"],
                created_at=role_dict["created_at"],
                updated_at=role_dict["updated_at"]
            ), None
            
        except Exception as e:
            return None, str(e)
    
    async def delete_role(self, role_id: UUID) -> Tuple[bool, Optional[str]]:
        """Delete a role (only if it's not a system role)."""
        try:
            # Check if it's a system role
            role, error = await self.get_role_by_id(role_id)
            if error:
                return False, error
            
            if role.is_system_role:
                return False, "Cannot delete system roles"
            
            response = self.supabase.table("roles").delete().eq("id", str(role_id)).execute()
            
            if not response.data:
                return False, "Role not found or delete failed"
            
            return True, None
            
        except Exception as e:
            return False, str(e)
    
    # Permission operations
    
    async def create_permission(self, permission_data: PermissionCreate) -> Tuple[Optional[Permission], Optional[str]]:
        """Create a new permission."""
        try:
            response = self.supabase.table("permissions").insert({
                "name": permission_data.name,
                "description": permission_data.description,
                "resource": permission_data.resource,
                "action": permission_data.action
            }).execute()
            
            if not response.data:
                return None, "Failed to create permission"
            
            permission_dict = response.data[0]
            return Permission(
                id=permission_dict["id"],
                name=permission_dict["name"],
                description=permission_dict["description"],
                resource=permission_dict["resource"],
                action=permission_dict["action"],
                created_at=permission_dict["created_at"],
                updated_at=permission_dict["updated_at"]
            ), None
            
        except Exception as e:
            return None, str(e)
    
    async def get_permission_by_id(self, permission_id: UUID) -> Tuple[Optional[Permission], Optional[str]]:
        """Get a permission by its ID."""
        try:
            response = self.supabase.table("permissions").select("*").eq("id", str(permission_id)).execute()
            
            if not response.data:
                return None, "Permission not found"
            
            permission_dict = response.data[0]
            return Permission(
                id=permission_dict["id"],
                name=permission_dict["name"],
                description=permission_dict["description"],
                resource=permission_dict["resource"],
                action=permission_dict["action"],
                created_at=permission_dict["created_at"],
                updated_at=permission_dict["updated_at"]
            ), None
            
        except Exception as e:
            return None, str(e)
    
    async def get_permission_by_name(self, name: str) -> Tuple[Optional[Permission], Optional[str]]:
        """Get a permission by its name."""
        try:
            response = self.supabase.table("permissions").select("*").eq("name", name).execute()
            
            if not response.data:
                return None, "Permission not found"
            
            permission_dict = response.data[0]
            return Permission(
                id=permission_dict["id"],
                name=permission_dict["name"],
                description=permission_dict["description"],
                resource=permission_dict["resource"],
                action=permission_dict["action"],
                created_at=permission_dict["created_at"],
                updated_at=permission_dict["updated_at"]
            ), None
            
        except Exception as e:
            return None, str(e)
    
    async def get_all_permissions(self) -> Tuple[List[Permission], Optional[str]]:
        """Get all permissions."""
        try:
            response = self.supabase.table("permissions").select("*").execute()
            
            permissions = []
            for permission_dict in response.data:
                permissions.append(Permission(
                    id=permission_dict["id"],
                    name=permission_dict["name"],
                    description=permission_dict["description"],
                    resource=permission_dict["resource"],
                    action=permission_dict["action"],
                    created_at=permission_dict["created_at"],
                    updated_at=permission_dict["updated_at"]
                ))
            
            return permissions, None
            
        except Exception as e:
            return [], str(e)
    
    async def update_permission(self, permission_id: UUID, permission_data: PermissionUpdate) -> Tuple[Optional[Permission], Optional[str]]:
        """Update a permission."""
        try:
            update_data = {}
            if permission_data.name is not None:
                update_data["name"] = permission_data.name
            if permission_data.description is not None:
                update_data["description"] = permission_data.description
            if permission_data.resource is not None:
                update_data["resource"] = permission_data.resource
            if permission_data.action is not None:
                update_data["action"] = permission_data.action
            
            if not update_data:
                return await self.get_permission_by_id(permission_id)
            
            response = self.supabase.table("permissions").update(update_data).eq("id", str(permission_id)).execute()
            
            if not response.data:
                return None, "Permission not found or update failed"
            
            permission_dict = response.data[0]
            return Permission(
                id=permission_dict["id"],
                name=permission_dict["name"],
                description=permission_dict["description"],
                resource=permission_dict["resource"],
                action=permission_dict["action"],
                created_at=permission_dict["created_at"],
                updated_at=permission_dict["updated_at"]
            ), None
            
        except Exception as e:
            return None, str(e)
    
    async def delete_permission(self, permission_id: UUID) -> Tuple[bool, Optional[str]]:
        """Delete a permission."""
        try:
            response = self.supabase.table("permissions").delete().eq("id", str(permission_id)).execute()
            
            if not response.data:
                return False, "Permission not found or delete failed"
            
            return True, None
            
        except Exception as e:
            return False, str(e)
    
    # Role-Permission operations
    
    async def assign_permission_to_role(self, role_id: UUID, permission_id: UUID) -> Tuple[Optional[RolePermission], Optional[str]]:
        """Assign a permission to a role."""
        try:
            # Check if role exists
            role, error = await self.get_role_by_id(role_id)
            if error:
                return None, f"Role not found: {error}"
            
            # Check if permission exists
            permission, error = await self.get_permission_by_id(permission_id)
            if error:
                return None, f"Permission not found: {error}"
            
            response = self.supabase.table("role_permissions").insert({
                "role_id": str(role_id),
                "permission_id": str(permission_id)
            }).execute()
            
            if not response.data:
                return None, "Failed to assign permission to role"
            
            rp_dict = response.data[0]
            return RolePermission(
                id=rp_dict["id"],
                role_id=rp_dict["role_id"],
                permission_id=rp_dict["permission_id"],
                created_at=rp_dict["created_at"]
            ), None
            
        except Exception as e:
            return None, str(e)
    
    async def remove_permission_from_role(self, role_id: UUID, permission_id: UUID) -> Tuple[bool, Optional[str]]:
        """Remove a permission from a role."""
        try:
            response = self.supabase.table("role_permissions").delete().eq("role_id", str(role_id)).eq("permission_id", str(permission_id)).execute()
            
            if not response.data:
                return False, "Permission assignment not found"
            
            return True, None
            
        except Exception as e:
            return False, str(e)
    
    async def get_permissions_for_role(self, role_id: UUID) -> Tuple[List[Permission], Optional[str]]:
        """Get all permissions assigned to a role."""
        try:
            response = self.supabase.table("role_permissions").select("permission_id").eq("role_id", str(role_id)).execute()
            
            if not response.data:
                return [], None
            
            permission_ids = [item["permission_id"] for item in response.data]
            
            if not permission_ids:
                return [], None
            
            # Get the actual permission objects
            permissions_response = self.supabase.table("permissions").select("*").in_("id", permission_ids).execute()
            
            permissions = []
            for permission_dict in permissions_response.data:
                permissions.append(Permission(
                    id=permission_dict["id"],
                    name=permission_dict["name"],
                    description=permission_dict["description"],
                    resource=permission_dict["resource"],
                    action=permission_dict["action"],
                    created_at=permission_dict["created_at"],
                    updated_at=permission_dict["updated_at"]
                ))
            
            return permissions, None
            
        except Exception as e:
            return [], str(e)
    
    # User-Role operations
    
    async def assign_role_to_user(self, user_role_data: UserRoleCreate) -> Tuple[Optional[UserRole], Optional[str]]:
        """Assign a role to a user, replacing any existing role for the same organization."""
        try:
            # Check if user exists (this would require checking with Supabase Auth)
            # For now, we'll assume the user exists since we're using Supabase Auth user IDs
            
            # Check if role exists
            role, error = await self.get_role_by_id(user_role_data.role_id)
            if error:
                return None, f"Role not found: {error}"
            
            # Check if user already has a role for this organization
            existing_roles_query = self.supabase.table("user_roles").select("id").eq("user_id", str(user_role_data.user_id))
            
            if user_role_data.organization_id:
                existing_roles_query = existing_roles_query.eq("organization_id", str(user_role_data.organization_id))
            else:
                existing_roles_query = existing_roles_query.is_("organization_id", "null")
            
            existing_roles_response = existing_roles_query.execute()
            
            if existing_roles_response.data:
                # User already has a role for this organization, update it
                existing_role_id = existing_roles_response.data[0]["id"]
                response = self.supabase.table("user_roles").update({
                    "role_id": str(user_role_data.role_id)
                }).eq("id", existing_role_id).execute()
            else:
                # No existing role for this organization, insert new one
                response = self.supabase.table("user_roles").insert({
                    "user_id": str(user_role_data.user_id),
                    "role_id": str(user_role_data.role_id),
                    "organization_id": str(user_role_data.organization_id) if user_role_data.organization_id else None
                }).execute()
            
            if not response.data:
                return None, "Failed to assign role to user"
            
            ur_dict = response.data[0]
            return UserRole(
                id=ur_dict["id"],
                user_id=ur_dict["user_id"],
                role_id=ur_dict["role_id"],
                organization_id=ur_dict["organization_id"] if ur_dict["organization_id"] else None,
                created_at=ur_dict["created_at"],
                updated_at=ur_dict["updated_at"]
            ), None
            
        except Exception as e:
            return None, str(e)
    
    async def update_user_role(self, user_role_id: UUID, user_role_data: UserRoleUpdate) -> Tuple[Optional[UserRole], Optional[str]]:
        """Update a user-role assignment."""
        try:
            update_data = {}
            if user_role_data.role_id is not None:
                update_data["role_id"] = str(user_role_data.role_id)
            if user_role_data.organization_id is not None:
                update_data["organization_id"] = str(user_role_data.organization_id) if user_role_data.organization_id else None
            
            if not update_data:
                # Get the existing user role
                response = self.supabase.table("user_roles").select("*").eq("id", str(user_role_id)).execute()
                if not response.data:
                    return None, "User role not found"
                
                ur_dict = response.data[0]
                return UserRole(
                    id=ur_dict["id"],
                    user_id=ur_dict["user_id"],
                    role_id=ur_dict["role_id"],
                    organization_id=ur_dict["organization_id"] if ur_dict["organization_id"] else None,
                    created_at=ur_dict["created_at"],
                    updated_at=ur_dict["updated_at"]
                ), None
            
            response = self.supabase.table("user_roles").update(update_data).eq("id", str(user_role_id)).execute()
            
            if not response.data:
                return None, "User role not found or update failed"
            
            ur_dict = response.data[0]
            return UserRole(
                id=ur_dict["id"],
                user_id=ur_dict["user_id"],
                role_id=ur_dict["role_id"],
                organization_id=ur_dict["organization_id"] if ur_dict["organization_id"] else None,
                created_at=ur_dict["created_at"],
                updated_at=ur_dict["updated_at"]
            ), None
            
        except Exception as e:
            return None, str(e)
    
    async def remove_role_from_user(self, user_role_id: UUID) -> Tuple[bool, Optional[str]]:
        """Remove a role from a user."""
        try:
            response = self.supabase.table("user_roles").delete().eq("id", str(user_role_id)).execute()
            
            if not response.data:
                return False, "User role assignment not found"
            
            return True, None
            
        except Exception as e:
            return False, str(e)
    
    async def get_roles_for_user(self, user_id: UUID, organization_id: Optional[UUID] = None) -> Tuple[List[Role], Optional[str]]:
        """Get all roles assigned to a user, optionally filtered by organization."""
        try:
            # Build the query
            query = self.supabase.table("user_roles").select("role_id").eq("user_id", str(user_id))
            
            if organization_id:
                query = query.eq("organization_id", str(organization_id))
            else:
                query = query.is_("organization_id", "null")
            
            response = query.execute()
            
            if not response.data:
                return [], None
            
            role_ids = [item["role_id"] for item in response.data]
            
            if not role_ids:
                return [], None
            
            # Get the actual role objects
            roles_response = self.supabase.table("roles").select("*").in_("id", role_ids).execute()
            
            roles = []
            for role_dict in roles_response.data:
                roles.append(Role(
                    id=role_dict["id"],
                    name=role_dict["name"],
                    description=role_dict["description"],
                    is_system_role=role_dict["is_system_role"],
                    created_at=role_dict["created_at"],
                    updated_at=role_dict["updated_at"]
                ))
            
            return roles, None
            
        except Exception as e:
            return [], str(e)
    
    async def get_user_roles_with_permissions(self, user_id: UUID, organization_id: Optional[UUID] = None) -> Tuple[List[RoleWithPermissions], Optional[str]]:
        """Get all roles with their permissions for a user."""
        try:
            # Get user roles
            roles, error = await self.get_roles_for_user(user_id, organization_id)
            if error:
                return [], error
            
            # Get permissions for each role
            roles_with_permissions = []
            for role in roles:
                permissions, error = await self.get_permissions_for_role(role.id)
                if error:
                    return [], error
                
                roles_with_permissions.append(RoleWithPermissions(
                    id=role.id,
                    name=role.name,
                    description=role.description,
                    is_system_role=role.is_system_role,
                    created_at=role.created_at,
                    updated_at=role.updated_at,
                    permissions=permissions
                ))
            
            return roles_with_permissions, None
            
        except Exception as e:
            return [], str(e)
    
    # Permission checking
    
    async def user_has_permission(self, user_id: UUID, permission_name: str, organization_id: Optional[UUID] = None) -> Tuple[bool, Optional[str]]:
        """Check if a user has a specific permission."""
        try:
            # Get the permission
            permission, error = await self.get_permission_by_name(permission_name)
            if error:
                return False, f"Permission not found: {error}"
            
            # Get user roles with permissions
            roles_with_permissions, error = await self.get_user_roles_with_permissions(user_id, organization_id)
            if error:
                return False, error
            
            # Check if any role has this permission
            for role in roles_with_permissions:
                for perm in role.permissions:
                    if perm.id == permission.id:
                        return True, None
            
            return False, None
            
        except Exception as e:
            return False, str(e)
    
    async def user_has_role(self, user_id: UUID, role_name: str, organization_id: Optional[UUID] = None) -> Tuple[bool, Optional[str]]:
        """Check if a user has a specific role."""
        try:
            # Get user roles
            roles, error = await self.get_roles_for_user(user_id, organization_id)
            if error:
                return False, error
            
            # Check if user has the specified role
            for role in roles:
                if role.name == role_name:
                    return True, None
            
            return False, None
            
        except Exception as e:
            return False, str(e)


# Global RBAC service instance
rbac_service = RBACService()