"""
Role service for managing roles in the RBAC system.
"""

import logging
from typing import Optional
from uuid import UUID
from opentelemetry import trace, metrics
from config import supabase_config
from src.rbac.roles.models import Role, RoleCreate, RoleUpdate, RoleWithPermissions
from src.rbac.permissions.service import permission_service

logger = logging.getLogger(__name__)

# Get tracer for this module
tracer = trace.get_tracer(__name__)

# Get meter for this module
meter = metrics.get_meter(__name__)

# Create metrics
role_operations_counter = meter.create_counter(
    "role.operations",
    description="Number of role operations"
)

role_errors_counter = meter.create_counter(
    "role.errors",
    description="Number of role operation errors"
)


class RoleService:
    """Service for handling role operations."""
    
    def __init__(self):
        self.supabase_config = supabase_config
    
    @property
    def supabase(self):
        """Get Supabase client, raise error if not configured."""
        if not self.supabase_config.is_configured():
            logger.error("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
            raise ValueError("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
        return self.supabase_config.client
    
    @tracer.start_as_current_span("role.create_role")
    async def create_role(self, role_data: RoleCreate) -> tuple[Optional[Role], Optional[str]]:
        """Create a new role."""
        role_operations_counter.add(1, {"operation": "create_role"})
        
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
                logger.error(f"Failed to create role: {role_data.name}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Failed to create role"))
                role_errors_counter.add(1, {"operation": "create_role", "error": "no_data_returned"})
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
            logger.error(f"Exception while creating role '{role_data.name}': {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            role_errors_counter.add(1, {"operation": "create_role", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("role.get_role_by_id")
    async def get_role_by_id(self, role_id: UUID) -> tuple[Optional[Role], Optional[str]]:
        """Get a role by its ID."""
        role_operations_counter.add(1, {"operation": "get_role_by_id"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("role.id", str(role_id))
        try:
            response = self.supabase.table("roles").select("*").eq("id", str(role_id)).execute()
            
            if not response.data:
                logger.warning(f"Role not found: {role_id}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Role not found"))
                role_errors_counter.add(1, {"operation": "get_role_by_id", "error": "not_found"})
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
            logger.error(f"Exception while getting role {role_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            role_errors_counter.add(1, {"operation": "get_role_by_id", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("role.get_role_by_name")
    async def get_role_by_name(self, name: str) -> tuple[Optional[Role], Optional[str]]:
        """Get a role by its name."""
        role_operations_counter.add(1, {"operation": "get_role_by_name"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("role.name", name)
        try:
            response = self.supabase.table("roles").select("*").eq("name", name).execute()
            
            if not response.data:
                logger.warning(f"Role not found: {name}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Role not found"))
                role_errors_counter.add(1, {"operation": "get_role_by_name", "error": "not_found"})
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
            logger.error(f"Exception while getting role '{name}': {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            role_errors_counter.add(1, {"operation": "get_role_by_name", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("role.get_all_roles")
    async def get_all_roles(self) -> tuple[list[Role], Optional[str]]:
        """Get all roles."""
        role_operations_counter.add(1, {"operation": "get_all_roles"})
        
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
            logger.error(f"Exception while getting all roles: {e}", exc_info=True)
            role_errors_counter.add(1, {"operation": "get_all_roles", "error": "exception"})
            return [], str(e)
    
    @tracer.start_as_current_span("role.update_role")
    async def update_role(self, role_id: UUID, role_data: RoleUpdate) -> tuple[Optional[Role], Optional[str]]:
        """Update a role."""
        role_operations_counter.add(1, {"operation": "update_role"})
        
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
                logger.error(f"Role not found or update failed: {role_id}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Role not found or update failed"))
                role_errors_counter.add(1, {"operation": "update_role", "error": "not_found_or_failed"})
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
            logger.error(f"Exception while updating role {role_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            role_errors_counter.add(1, {"operation": "update_role", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("role.delete_role")
    async def delete_role(self, role_id: UUID) -> tuple[bool, Optional[str]]:
        """Delete a role."""
        role_operations_counter.add(1, {"operation": "delete_role"})
        
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
                logger.warning(f"Role not found for deletion: {role_id}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Role not found"))
                role_errors_counter.add(1, {"operation": "delete_role", "error": "not_found"})
                return False, "Role not found"
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return True, None
            
        except Exception as e:
            logger.error(f"Exception while deleting role {role_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            role_errors_counter.add(1, {"operation": "delete_role", "error": "exception"})
            return False, str(e)

    @tracer.start_as_current_span("role.get_role_with_permissions")
    async def get_role_with_permissions(self, role_id: UUID) -> tuple[Optional[RoleWithPermissions], Optional[str]]:
        """Get a role with its associated permissions."""
        role_operations_counter.add(1, {"operation": "get_role_with_permissions"})

        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("role.id", str(role_id))
        try:
            # Get the role
            role, error = await self.get_role_by_id(role_id)
            if error or not role:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, error or "Role not found"))
                role_errors_counter.add(1, {"operation": "get_role_with_permissions", "error": "role_not_found"})
                return None, error or "Role not found"

            # Get permissions for the role
            permissions, error = await permission_service.get_permissions_for_role(role_id)
            if error:
                logger.error(f"Error getting permissions for role {role_id}: {error}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
                role_errors_counter.add(1, {"operation": "get_role_with_permissions", "error": "get_permissions_failed"})
                return None, error

            role_with_permissions = RoleWithPermissions(
                id=role.id,
                name=role.name,
                description=role.description,
                is_system_role=role.is_system_role,
                created_at=role.created_at,
                updated_at=role.updated_at,
                permissions=permissions
            )

            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return role_with_permissions, None

        except Exception as e:
            logger.error(f"Exception while getting role with permissions {role_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            role_errors_counter.add(1, {"operation": "get_role_with_permissions", "error": "exception"})
            return None, str(e)


# Global role service instance
role_service = RoleService()