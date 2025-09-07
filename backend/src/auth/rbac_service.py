"""
Role-Based Access Control (RBAC) service for managing roles, permissions, and access control.
"""

from typing import List, Optional, Tuple, Dict, Any
from uuid import UUID
import asyncio
from opentelemetry import trace, metrics
from config import supabase_config
from .rbac_models import (
    Organization, OrganizationCreate, OrganizationUpdate,
    Role, RoleCreate, RoleUpdate,
    Permission, PermissionCreate, PermissionUpdate,
    RolePermission,
    UserRole, UserRoleCreate, UserRoleUpdate,
    RoleWithPermissions, UserWithRoles
)

# Get tracer for this module
tracer = trace.get_tracer(__name__)

# Get meter for this module
meter = metrics.get_meter(__name__)

# Create metrics
rbac_operations_counter = meter.create_counter(
    "rbac.operations",
    description="Number of RBAC operations"
)

rbac_errors_counter = meter.create_counter(
    "rbac.errors",
    description="Number of RBAC operation errors"
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
    
    @tracer.start_as_current_span("rbac.create_organization")
    async def create_organization(self, org_data: OrganizationCreate) -> Tuple[Optional[Organization], Optional[str]]:
        """Create a new organization."""
        rbac_operations_counter.add(1, {"operation": "create_organization", "entity": "organization"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("organization.name", org_data.name)
        try:
            response = self.supabase.table("organizations").insert({
                "name": org_data.name,
                "description": org_data.description,
                "slug": org_data.slug,
                "is_active": org_data.is_active
            }).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Failed to create organization"))
                rbac_errors_counter.add(1, {"operation": "create_organization", "error": "no_data_returned"})
                return None, "Failed to create organization"
            
            org_dict = response.data[0]
            organization = Organization(
                id=org_dict["id"],
                name=org_dict["name"],
                description=org_dict["description"],
                slug=org_dict["slug"],
                is_active=org_dict["is_active"],
                created_at=org_dict["created_at"],
                updated_at=org_dict["updated_at"]
            )
            current_span.set_attribute("organization.id", str(organization.id))
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return organization, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "create_organization", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("rbac.get_organization_by_id")
    async def get_organization_by_id(self, org_id: UUID) -> Tuple[Optional[Organization], Optional[str]]:
        """Get an organization by its ID."""
        rbac_operations_counter.add(1, {"operation": "get_organization_by_id", "entity": "organization"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("organization.id", str(org_id))
        try:
            response = self.supabase.table("organizations").select("*").eq("id", str(org_id)).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Organization not found"))
                rbac_errors_counter.add(1, {"operation": "get_organization_by_id", "error": "not_found"})
                return None, "Organization not found"
            
            org_dict = response.data[0]
            organization = Organization(
                id=org_dict["id"],
                name=org_dict["name"],
                description=org_dict["description"],
                slug=org_dict["slug"],
                is_active=org_dict["is_active"],
                created_at=org_dict["created_at"],
                updated_at=org_dict["updated_at"]
            )
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return organization, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "get_organization_by_id", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("rbac.get_organization_by_slug")
    async def get_organization_by_slug(self, slug: str) -> Tuple[Optional[Organization], Optional[str]]:
        """Get an organization by its slug."""
        rbac_operations_counter.add(1, {"operation": "get_organization_by_slug", "entity": "organization"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("organization.slug", slug)
        try:
            response = self.supabase.table("organizations").select("*").eq("slug", slug).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Organization not found"))
                rbac_errors_counter.add(1, {"operation": "get_organization_by_slug", "error": "not_found"})
                return None, "Organization not found"
            
            org_dict = response.data[0]
            organization = Organization(
                id=org_dict["id"],
                name=org_dict["name"],
                description=org_dict["description"],
                slug=org_dict["slug"],
                is_active=org_dict["is_active"],
                created_at=org_dict["created_at"],
                updated_at=org_dict["updated_at"]
            )
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return organization, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "get_organization_by_slug", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("rbac.get_all_organizations")
    async def get_all_organizations(self) -> Tuple[List[Organization], Optional[str]]:
        """Get all organizations."""
        rbac_operations_counter.add(1, {"operation": "get_all_organizations", "entity": "organization"})
        
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
            rbac_errors_counter.add(1, {"operation": "get_all_organizations", "error": "exception"})
            return [], str(e)
    
    @tracer.start_as_current_span("rbac.update_organization")
    async def update_organization(self, org_id: UUID, org_data: OrganizationUpdate) -> Tuple[Optional[Organization], Optional[str]]:
        """Update an organization."""
        rbac_operations_counter.add(1, {"operation": "update_organization", "entity": "organization"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("organization.id", str(org_id))
        try:
            update_data = {}
            if org_data.name is not None:
                update_data["name"] = org_data.name
                current_span.set_attribute("organization.name.updated", True)
            if org_data.description is not None:
                update_data["description"] = org_data.description
            if org_data.slug is not None:
                update_data["slug"] = org_data.slug
                current_span.set_attribute("organization.slug.updated", True)
            if org_data.is_active is not None:
                update_data["is_active"] = org_data.is_active
            
            if not update_data:
                return await self.get_organization_by_id(org_id)
            
            response = self.supabase.table("organizations").update(update_data).eq("id", str(org_id)).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Organization not found or update failed"))
                rbac_errors_counter.add(1, {"operation": "update_organization", "error": "not_found_or_failed"})
                return None, "Organization not found or update failed"
            
            org_dict = response.data[0]
            organization = Organization(
                id=org_dict["id"],
                name=org_dict["name"],
                description=org_dict["description"],
                slug=org_dict["slug"],
                is_active=org_dict["is_active"],
                created_at=org_dict["created_at"],
                updated_at=org_dict["updated_at"]
            )
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return organization, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "update_organization", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("rbac.delete_organization")
    async def delete_organization(self, org_id: UUID) -> Tuple[bool, Optional[str]]:
        """Delete an organization."""
        rbac_operations_counter.add(1, {"operation": "delete_organization", "entity": "organization"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("organization.id", str(org_id))
        try:
            response = self.supabase.table("organizations").delete().eq("id", str(org_id)).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Organization not found"))
                rbac_errors_counter.add(1, {"operation": "delete_organization", "error": "not_found"})
                return False, "Organization not found"
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return True, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "delete_organization", "error": "exception"})
            return False, str(e)
    
    # Role operations
    
    @tracer.start_as_current_span("rbac.create_role")
    async def create_role(self, role_data: RoleCreate) -> Tuple[Optional[Role], Optional[str]]:
        """Create a new role."""
        rbac_operations_counter.add(1, {"operation": "create_role", "entity": "role"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("role.name", role_data.name)
        try:
            response = self.supabase.table("roles").insert({
                "name": role_data.name,
                "description": role_data.description,
                "is_system_role": role_data.is_system_role
            }).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Failed to create role"))
                rbac_errors_counter.add(1, {"operation": "create_role", "error": "no_data_returned"})
                return None, "Failed to create role"
            
            role_dict = response.data[0]
            role = Role(
                id=role_dict["id"],
                name=role_dict["name"],
                description=role_dict["description"],
                is_system_role=role_dict["is_system_role"],
                created_at=role_dict["created_at"],
                updated_at=role_dict["updated_at"]
            )
            current_span.set_attribute("role.id", str(role.id))
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return role, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "create_role", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("rbac.get_role_by_id")
    async def get_role_by_id(self, role_id: UUID) -> Tuple[Optional[Role], Optional[str]]:
        """Get a role by its ID."""
        rbac_operations_counter.add(1, {"operation": "get_role_by_id", "entity": "role"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("role.id", str(role_id))
        try:
            response = self.supabase.table("roles").select("*").eq("id", str(role_id)).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Role not found"))
                rbac_errors_counter.add(1, {"operation": "get_role_by_id", "error": "not_found"})
                return None, "Role not found"
            
            role_dict = response.data[0]
            role = Role(
                id=role_dict["id"],
                name=role_dict["name"],
                description=role_dict["description"],
                is_system_role=role_dict["is_system_role"],
                created_at=role_dict["created_at"],
                updated_at=role_dict["updated_at"]
            )
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return role, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "get_role_by_id", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("rbac.get_role_by_name")
    async def get_role_by_name(self, name: str) -> Tuple[Optional[Role], Optional[str]]:
        """Get a role by its name."""
        rbac_operations_counter.add(1, {"operation": "get_role_by_name", "entity": "role"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("role.name", name)
        try:
            response = self.supabase.table("roles").select("*").eq("name", name).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Role not found"))
                rbac_errors_counter.add(1, {"operation": "get_role_by_name", "error": "not_found"})
                return None, "Role not found"
            
            role_dict = response.data[0]
            role = Role(
                id=role_dict["id"],
                name=role_dict["name"],
                description=role_dict["description"],
                is_system_role=role_dict["is_system_role"],
                created_at=role_dict["created_at"],
                updated_at=role_dict["updated_at"]
            )
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return role, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "get_role_by_name", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("rbac.get_all_roles")
    async def get_all_roles(self) -> Tuple[List[Role], Optional[str]]:
        """Get all roles."""
        rbac_operations_counter.add(1, {"operation": "get_all_roles", "entity": "role"})
        
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
            rbac_errors_counter.add(1, {"operation": "get_all_roles", "error": "exception"})
            return [], str(e)
    
    @tracer.start_as_current_span("rbac.update_role")
    async def update_role(self, role_id: UUID, role_data: RoleUpdate) -> Tuple[Optional[Role], Optional[str]]:
        """Update a role."""
        rbac_operations_counter.add(1, {"operation": "update_role", "entity": "role"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("role.id", str(role_id))
        try:
            update_data = {}
            if role_data.name is not None:
                update_data["name"] = role_data.name
                current_span.set_attribute("role.name.updated", True)
            if role_data.description is not None:
                update_data["description"] = role_data.description
            
            if not update_data:
                return await self.get_role_by_id(role_id)
            
            response = self.supabase.table("roles").update(update_data).eq("id", str(role_id)).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Role not found or update failed"))
                rbac_errors_counter.add(1, {"operation": "update_role", "error": "not_found_or_failed"})
                return None, "Role not found or update failed"
            
            role_dict = response.data[0]
            role = Role(
                id=role_dict["id"],
                name=role_dict["name"],
                description=role_dict["description"],
                is_system_role=role_dict["is_system_role"],
                created_at=role_dict["created_at"],
                updated_at=role_dict["updated_at"]
            )
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return role, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "update_role", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("rbac.delete_role")
    async def delete_role(self, role_id: UUID) -> Tuple[bool, Optional[str]]:
        """Delete a role."""
        rbac_operations_counter.add(1, {"operation": "delete_role", "entity": "role"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("role.id", str(role_id))
        try:
            # First remove all role permissions
            self.supabase.table("role_permissions").delete().eq("role_id", str(role_id)).execute()
            
            # Then remove all user roles with this role
            self.supabase.table("user_roles").delete().eq("role_id", str(role_id)).execute()
            
            # Finally delete the role
            response = self.supabase.table("roles").delete().eq("id", str(role_id)).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Role not found"))
                rbac_errors_counter.add(1, {"operation": "delete_role", "error": "not_found"})
                return False, "Role not found"
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return True, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "delete_role", "error": "exception"})
            return False, str(e)
    
    # Permission operations
    
    @tracer.start_as_current_span("rbac.create_permission")
    async def create_permission(self, perm_data: PermissionCreate) -> Tuple[Optional[Permission], Optional[str]]:
        """Create a new permission."""
        rbac_operations_counter.add(1, {"operation": "create_permission", "entity": "permission"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("permission.name", perm_data.name)
        try:
            response = self.supabase.table("permissions").insert({
                "name": perm_data.name,
                "description": perm_data.description,
                "resource": perm_data.resource,
                "action": perm_data.action
            }).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Failed to create permission"))
                rbac_errors_counter.add(1, {"operation": "create_permission", "error": "no_data_returned"})
                return None, "Failed to create permission"
            
            perm_dict = response.data[0]
            permission = Permission(
                id=perm_dict["id"],
                name=perm_dict["name"],
                description=perm_dict["description"],
                resource=perm_dict["resource"],
                action=perm_dict["action"],
                created_at=perm_dict["created_at"],
                updated_at=perm_dict["updated_at"]
            )
            current_span.set_attribute("permission.id", str(permission.id))
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return permission, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "create_permission", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("rbac.get_permission_by_id")
    async def get_permission_by_id(self, perm_id: UUID) -> Tuple[Optional[Permission], Optional[str]]:
        """Get a permission by its ID."""
        rbac_operations_counter.add(1, {"operation": "get_permission_by_id", "entity": "permission"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("permission.id", str(perm_id))
        try:
            response = self.supabase.table("permissions").select("*").eq("id", str(perm_id)).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Permission not found"))
                rbac_errors_counter.add(1, {"operation": "get_permission_by_id", "error": "not_found"})
                return None, "Permission not found"
            
            perm_dict = response.data[0]
            permission = Permission(
                id=perm_dict["id"],
                name=perm_dict["name"],
                description=perm_dict["description"],
                resource=perm_dict["resource"],
                action=perm_dict["action"],
                created_at=perm_dict["created_at"],
                updated_at=perm_dict["updated_at"]
            )
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return permission, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "get_permission_by_id", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("rbac.get_permission_by_name")
    async def get_permission_by_name(self, name: str) -> Tuple[Optional[Permission], Optional[str]]:
        """Get a permission by its name."""
        rbac_operations_counter.add(1, {"operation": "get_permission_by_name", "entity": "permission"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("permission.name", name)
        try:
            response = self.supabase.table("permissions").select("*").eq("name", name).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Permission not found"))
                rbac_errors_counter.add(1, {"operation": "get_permission_by_name", "error": "not_found"})
                return None, "Permission not found"
            
            perm_dict = response.data[0]
            permission = Permission(
                id=perm_dict["id"],
                name=perm_dict["name"],
                description=perm_dict["description"],
                resource=perm_dict["resource"],
                action=perm_dict["action"],
                created_at=perm_dict["created_at"],
                updated_at=perm_dict["updated_at"]
            )
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return permission, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "get_permission_by_name", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("rbac.get_all_permissions")
    async def get_all_permissions(self) -> Tuple[List[Permission], Optional[str]]:
        """Get all permissions."""
        rbac_operations_counter.add(1, {"operation": "get_all_permissions", "entity": "permission"})
        
        try:
            response = self.supabase.table("permissions").select("*").execute()
            
            permissions = []
            for perm_dict in response.data:
                permissions.append(Permission(
                    id=perm_dict["id"],
                    name=perm_dict["name"],
                    description=perm_dict["description"],
                    resource=perm_dict["resource"],
                    action=perm_dict["action"],
                    created_at=perm_dict["created_at"],
                    updated_at=perm_dict["updated_at"]
                ))
            
            return permissions, None
            
        except Exception as e:
            rbac_errors_counter.add(1, {"operation": "get_all_permissions", "error": "exception"})
            return [], str(e)
    
    @tracer.start_as_current_span("rbac.update_permission")
    async def update_permission(self, perm_id: UUID, perm_data: PermissionUpdate) -> Tuple[Optional[Permission], Optional[str]]:
        """Update a permission."""
        rbac_operations_counter.add(1, {"operation": "update_permission", "entity": "permission"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("permission.id", str(perm_id))
        try:
            update_data = {}
            if perm_data.name is not None:
                update_data["name"] = perm_data.name
                current_span.set_attribute("permission.name.updated", True)
            if perm_data.description is not None:
                update_data["description"] = perm_data.description
            if perm_data.resource is not None:
                update_data["resource"] = perm_data.resource
            if perm_data.action is not None:
                update_data["action"] = perm_data.action
            
            if not update_data:
                return await self.get_permission_by_id(perm_id)
            
            response = self.supabase.table("permissions").update(update_data).eq("id", str(perm_id)).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Permission not found or update failed"))
                rbac_errors_counter.add(1, {"operation": "update_permission", "error": "not_found_or_failed"})
                return None, "Permission not found or update failed"
            
            perm_dict = response.data[0]
            permission = Permission(
                id=perm_dict["id"],
                name=perm_dict["name"],
                description=perm_dict["description"],
                resource=perm_dict["resource"],
                action=perm_dict["action"],
                created_at=perm_dict["created_at"],
                updated_at=perm_dict["updated_at"]
            )
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return permission, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "update_permission", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("rbac.delete_permission")
    async def delete_permission(self, perm_id: UUID) -> Tuple[bool, Optional[str]]:
        """Delete a permission."""
        rbac_operations_counter.add(1, {"operation": "delete_permission", "entity": "permission"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("permission.id", str(perm_id))
        try:
            # First remove all role permissions with this permission
            self.supabase.table("role_permissions").delete().eq("permission_id", str(perm_id)).execute()
            
            # Then delete the permission
            response = self.supabase.table("permissions").delete().eq("id", str(perm_id)).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Permission not found"))
                rbac_errors_counter.add(1, {"operation": "delete_permission", "error": "not_found"})
                return False, "Permission not found"
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return True, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "delete_permission", "error": "exception"})
            return False, str(e)
    
    # Role-Permission operations
    
    @tracer.start_as_current_span("rbac.assign_permission_to_role")
    async def assign_permission_to_role(self, role_id: UUID, permission_id: UUID) -> Tuple[Optional[RolePermission], Optional[str]]:
        """Assign a permission to a role."""
        rbac_operations_counter.add(1, {"operation": "assign_permission_to_role", "entity": "role_permission"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("role.id", str(role_id))
        current_span.set_attribute("permission.id", str(permission_id))
        try:
            response = self.supabase.table("role_permissions").insert({
                "role_id": str(role_id),
                "permission_id": str(permission_id)
            }).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Failed to assign permission to role"))
                rbac_errors_counter.add(1, {"operation": "assign_permission_to_role", "error": "no_data_returned"})
                return None, "Failed to assign permission to role"
            
            rp_dict = response.data[0]
            role_permission = RolePermission(
                id=rp_dict["id"],
                role_id=rp_dict["role_id"],
                permission_id=rp_dict["permission_id"],
                created_at=rp_dict["created_at"]
            )
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return role_permission, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "assign_permission_to_role", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("rbac.remove_permission_from_role")
    async def remove_permission_from_role(self, role_id: UUID, permission_id: UUID) -> Tuple[bool, Optional[str]]:
        """Remove a permission from a role."""
        rbac_operations_counter.add(1, {"operation": "remove_permission_from_role", "entity": "role_permission"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("role.id", str(role_id))
        current_span.set_attribute("permission.id", str(permission_id))
        try:
            response = self.supabase.table("role_permissions").delete().match({
                "role_id": str(role_id),
                "permission_id": str(permission_id)
            }).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Role-permission assignment not found"))
                rbac_errors_counter.add(1, {"operation": "remove_permission_from_role", "error": "not_found"})
                return False, "Role-permission assignment not found"
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return True, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "remove_permission_from_role", "error": "exception"})
            return False, str(e)
    
    @tracer.start_as_current_span("rbac.get_permissions_for_role")
    async def get_permissions_for_role(self, role_id: UUID) -> Tuple[List[Permission], Optional[str]]:
        """Get all permissions for a role."""
        rbac_operations_counter.add(1, {"operation": "get_permissions_for_role", "entity": "role_permission"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("role.id", str(role_id))
        try:
            response = self.supabase.table("role_permissions").select("permissions(*)").eq("role_id", str(role_id)).execute()
            
            permissions = []
            for rp_dict in response.data:
                if rp_dict.get("permissions"):
                    perm_dict = rp_dict["permissions"]
                    permissions.append(Permission(
                        id=perm_dict["id"],
                        name=perm_dict["name"],
                        description=perm_dict["description"],
                        resource=perm_dict["resource"],
                        action=perm_dict["action"],
                        created_at=perm_dict["created_at"],
                        updated_at=perm_dict["updated_at"]
                    ))
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return permissions, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "get_permissions_for_role", "error": "exception"})
            return [], str(e)
    
    # User-Role operations
    
    @tracer.start_as_current_span("rbac.assign_role_to_user")
    async def assign_role_to_user(self, user_role_data: UserRoleCreate) -> Tuple[Optional[UserRole], Optional[str]]:
        """Assign a role to a user."""
        rbac_operations_counter.add(1, {"operation": "assign_role_to_user", "entity": "user_role"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("user.id", str(user_role_data.user_id))
        current_span.set_attribute("role.id", str(user_role_data.role_id))
        if user_role_data.organization_id:
            current_span.set_attribute("organization.id", str(user_role_data.organization_id))
        try:
            insert_data = {
                "user_id": str(user_role_data.user_id),
                "role_id": str(user_role_data.role_id)
            }
            if user_role_data.organization_id:
                insert_data["organization_id"] = str(user_role_data.organization_id)
            
            response = self.supabase.table("user_roles").insert(insert_data).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Failed to assign role to user"))
                rbac_errors_counter.add(1, {"operation": "assign_role_to_user", "error": "no_data_returned"})
                return None, "Failed to assign role to user"
            
            ur_dict = response.data[0]
            user_role = UserRole(
                id=ur_dict["id"],
                user_id=ur_dict["user_id"],
                role_id=ur_dict["role_id"],
                organization_id=ur_dict.get("organization_id"),
                created_at=ur_dict["created_at"],
                updated_at=ur_dict["updated_at"]
            )
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return user_role, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "assign_role_to_user", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("rbac.update_user_role")
    async def update_user_role(self, user_role_id: UUID, user_role_data: UserRoleUpdate) -> Tuple[Optional[UserRole], Optional[str]]:
        """Update a user role assignment."""
        rbac_operations_counter.add(1, {"operation": "update_user_role", "entity": "user_role"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("user_role.id", str(user_role_id))
        if user_role_data.organization_id:
            current_span.set_attribute("organization.id", str(user_role_data.organization_id))
        try:
            update_data = {}
            if user_role_data.organization_id is not None:
                update_data["organization_id"] = str(user_role_data.organization_id) if user_role_data.organization_id else None
            
            if not update_data:
                # If no updates, just return the existing user role
                return await self.get_user_role_by_id(user_role_id)
            
            response = self.supabase.table("user_roles").update(update_data).eq("id", str(user_role_id)).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "User role assignment not found or update failed"))
                rbac_errors_counter.add(1, {"operation": "update_user_role", "error": "not_found_or_failed"})
                return None, "User role assignment not found or update failed"
            
            ur_dict = response.data[0]
            user_role = UserRole(
                id=ur_dict["id"],
                user_id=ur_dict["user_id"],
                role_id=ur_dict["role_id"],
                organization_id=ur_dict.get("organization_id"),
                created_at=ur_dict["created_at"],
                updated_at=ur_dict["updated_at"]
            )
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return user_role, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "update_user_role", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("rbac.remove_role_from_user")
    async def remove_role_from_user(self, user_role_id: UUID) -> Tuple[bool, Optional[str]]:
        """Remove a role from a user."""
        rbac_operations_counter.add(1, {"operation": "remove_role_from_user", "entity": "user_role"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("user_role.id", str(user_role_id))
        try:
            response = self.supabase.table("user_roles").delete().eq("id", str(user_role_id)).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "User role assignment not found"))
                rbac_errors_counter.add(1, {"operation": "remove_role_from_user", "error": "not_found"})
                return False, "User role assignment not found"
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return True, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "remove_role_from_user", "error": "exception"})
            return False, str(e)
    
    @tracer.start_as_current_span("rbac.get_user_role_by_id")
    async def get_user_role_by_id(self, user_role_id: UUID) -> Tuple[Optional[UserRole], Optional[str]]:
        """Get a user role assignment by its ID."""
        rbac_operations_counter.add(1, {"operation": "get_user_role_by_id", "entity": "user_role"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("user_role.id", str(user_role_id))
        try:
            response = self.supabase.table("user_roles").select("*").eq("id", str(user_role_id)).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "User role assignment not found"))
                rbac_errors_counter.add(1, {"operation": "get_user_role_by_id", "error": "not_found"})
                return None, "User role assignment not found"
            
            ur_dict = response.data[0]
            user_role = UserRole(
                id=ur_dict["id"],
                user_id=ur_dict["user_id"],
                role_id=ur_dict["role_id"],
                organization_id=ur_dict.get("organization_id"),
                created_at=ur_dict["created_at"],
                updated_at=ur_dict["updated_at"]
            )
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return user_role, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "get_user_role_by_id", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("rbac.get_roles_for_user")
    async def get_roles_for_user(self, user_id: UUID, organization_id: Optional[UUID] = None) -> Tuple[List[Role], Optional[str]]:
        """Get all roles for a user, optionally filtered by organization."""
        rbac_operations_counter.add(1, {"operation": "get_roles_for_user", "entity": "user_role"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("user.id", str(user_id))
        if organization_id:
            current_span.set_attribute("organization.id", str(organization_id))
        try:
            query = self.supabase.table("user_roles").select("roles(*)").eq("user_id", str(user_id))
            if organization_id:
                query = query.eq("organization_id", str(organization_id))
            else:
                query = query.is_("organization_id", "null")
            
            response = query.execute()
            
            roles = []
            for ur_dict in response.data:
                if ur_dict.get("roles"):
                    role_dict = ur_dict["roles"]
                    roles.append(Role(
                        id=role_dict["id"],
                        name=role_dict["name"],
                        description=role_dict["description"],
                        is_system_role=role_dict["is_system_role"],
                        created_at=role_dict["created_at"],
                        updated_at=role_dict["updated_at"]
                    ))
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return roles, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "get_roles_for_user", "error": "exception"})
            return [], str(e)
    
    @tracer.start_as_current_span("rbac.get_user_roles_with_permissions")
    async def get_user_roles_with_permissions(self, user_id: UUID, organization_id: Optional[UUID] = None) -> Tuple[List[RoleWithPermissions], Optional[str]]:
        """Get all roles with their permissions for a user."""
        rbac_operations_counter.add(1, {"operation": "get_user_roles_with_permissions", "entity": "user_role"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("user.id", str(user_id))
        if organization_id:
            current_span.set_attribute("organization.id", str(organization_id))
        try:
            # Get user roles
            roles, error = await self.get_roles_for_user(user_id, organization_id)
            if error:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
                rbac_errors_counter.add(1, {"operation": "get_user_roles_with_permissions", "error": "get_roles_failed"})
                return [], error
            
            # Get permissions for each role
            roles_with_permissions = []
            for role in roles:
                permissions, error = await self.get_permissions_for_role(role.id)
                if error:
                    current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
                    rbac_errors_counter.add(1, {"operation": "get_user_roles_with_permissions", "error": "get_permissions_failed"})
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
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return roles_with_permissions, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "get_user_roles_with_permissions", "error": "exception"})
            return [], str(e)
    
    @tracer.start_as_current_span("rbac.check_permission")
    async def check_permission(self, user_id: UUID, permission_name: str, organization_id: Optional[UUID] = None) -> Tuple[bool, Optional[str]]:
        """Check if a user has a specific permission."""
        rbac_operations_counter.add(1, {"operation": "check_permission", "entity": "permission_check"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("user.id", str(user_id))
        current_span.set_attribute("permission.name", permission_name)
        if organization_id:
            current_span.set_attribute("organization.id", str(organization_id))
        try:
            # Get user roles
            roles, error = await self.get_roles_for_user(user_id, organization_id)
            if error:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
                rbac_errors_counter.add(1, {"operation": "check_permission", "error": "get_roles_failed"})
                return False, error
            
            # Get permission by name
            permission, error = await self.get_permission_by_name(permission_name)
            if error:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
                rbac_errors_counter.add(1, {"operation": "check_permission", "error": "get_permission_failed"})
                return False, error
            
            if not permission:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Permission not found"))
                rbac_errors_counter.add(1, {"operation": "check_permission", "error": "permission_not_found"})
                return False, "Permission not found"
            
            # Check if any role has this permission
            for role in roles:
                permissions, error = await self.get_permissions_for_role(role.id)
                if error:
                    continue  # Skip this role if we can't get its permissions
                
                if any(perm.id == permission.id for perm in permissions):
                    current_span.set_status(trace.Status(trace.StatusCode.OK))
                    return True, None
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return False, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "check_permission", "error": "exception"})
            return False, str(e)
    
    @tracer.start_as_current_span("rbac.get_users_with_role")
    async def get_users_with_role(self, role_id: UUID, organization_id: Optional[UUID] = None) -> Tuple[List[UserWithRoles], Optional[str]]:
        """Get all users with a specific role."""
        rbac_operations_counter.add(1, {"operation": "get_users_with_role", "entity": "user_role"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("role.id", str(role_id))
        if organization_id:
            current_span.set_attribute("organization.id", str(organization_id))
        try:
            # Get user roles with user details
            query = self.supabase.table("user_roles").select("*, users(*)").eq("role_id", str(role_id))
            if organization_id:
                query = query.eq("organization_id", str(organization_id))
            else:
                query = query.is_("organization_id", "null")
            
            response = query.execute()
            
            users_with_roles = []
            user_dict = {}  # To avoid duplicates
            
            for ur_dict in response.data:
                user_data = ur_dict.get("users")
                if not user_data:
                    continue
                
                user_id = user_data["id"]
                if user_id not in user_dict:
                    # Get user roles
                    user_roles, _ = await self.get_roles_for_user(UUID(user_id), organization_id)
                    
                    user_with_roles = UserWithRoles(
                        id=user_data["id"],
                        email=user_data["email"],
                        first_name=user_data.get("first_name", ""),
                        last_name=user_data.get("last_name", ""),
                        is_verified=user_data.get("email_confirmed_at") is not None,
                        created_at=user_data["created_at"],
                        updated_at=user_data["updated_at"],
                        roles=user_roles
                    )
                    user_dict[user_id] = user_with_roles
                    users_with_roles.append(user_with_roles)
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return users_with_roles, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            rbac_errors_counter.add(1, {"operation": "get_users_with_role", "error": "exception"})
            return [], str(e)


# Global RBAC service instance
rbac_service = RBACService()