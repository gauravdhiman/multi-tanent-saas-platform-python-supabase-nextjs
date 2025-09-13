"""
Permission service for managing permissions in the RBAC system.
"""

import logging
from typing import List, Optional, Tuple
from uuid import UUID
from opentelemetry import trace, metrics
from config import supabase_config
from src.rbac.permissions.models import Permission, PermissionCreate, PermissionUpdate, RolePermission

logger = logging.getLogger(__name__)

# Get tracer for this module
tracer = trace.get_tracer(__name__)

# Get meter for this module
meter = metrics.get_meter(__name__)

# Create metrics
permission_operations_counter = meter.create_counter(
    "permission.operations",
    description="Number of permission operations"
)

permission_errors_counter = meter.create_counter(
    "permission.errors",
    description="Number of permission operation errors"
)


class PermissionService:
    """Service for handling permission operations."""
    
    def __init__(self):
        self.supabase_config = supabase_config
    
    @property
    def supabase(self):
        """Get Supabase client, raise error if not configured."""
        if not self.supabase_config.is_configured():
            logger.error("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
            raise ValueError("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
        return self.supabase_config.client
    
    @tracer.start_as_current_span("permission.create_permission")
    async def create_permission(self, perm_data: PermissionCreate) -> Tuple[Optional[Permission], Optional[str]]:
        """Create a new permission."""
        permission_operations_counter.add(1, {"operation": "create_permission"})
        
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
                logger.error(f"Failed to create permission: {perm_data.name}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Failed to create permission"))
                permission_errors_counter.add(1, {"operation": "create_permission", "error": "no_data_returned"})
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
            logger.error(f"Exception while creating permission '{perm_data.name}': {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            permission_errors_counter.add(1, {"operation": "create_permission", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("permission.get_permission_by_id")
    async def get_permission_by_id(self, perm_id: UUID) -> Tuple[Optional[Permission], Optional[str]]:
        """Get a permission by its ID."""
        permission_operations_counter.add(1, {"operation": "get_permission_by_id"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("permission.id", str(perm_id))
        try:
            response = self.supabase.table("permissions").select("*").eq("id", str(perm_id)).execute()
            
            if not response.data:
                logger.warning(f"Permission not found: {perm_id}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Permission not found"))
                permission_errors_counter.add(1, {"operation": "get_permission_by_id", "error": "not_found"})
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
            logger.error(f"Exception while getting permission {perm_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            permission_errors_counter.add(1, {"operation": "get_permission_by_id", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("permission.get_permission_by_name")
    async def get_permission_by_name(self, name: str) -> Tuple[Optional[Permission], Optional[str]]:
        """Get a permission by its name."""
        permission_operations_counter.add(1, {"operation": "get_permission_by_name"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("permission.name", name)
        try:
            response = self.supabase.table("permissions").select("*").eq("name", name).execute()
            
            if not response.data:
                logger.warning(f"Permission not found: {name}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Permission not found"))
                permission_errors_counter.add(1, {"operation": "get_permission_by_name", "error": "not_found"})
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
            logger.error(f"Exception while getting permission '{name}': {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            permission_errors_counter.add(1, {"operation": "get_permission_by_name", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("permission.get_all_permissions")
    async def get_all_permissions(self) -> Tuple[List[Permission], Optional[str]]:
        """Get all permissions."""
        permission_operations_counter.add(1, {"operation": "get_all_permissions"})
        
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
            logger.error(f"Exception while getting all permissions: {e}", exc_info=True)
            permission_errors_counter.add(1, {"operation": "get_all_permissions", "error": "exception"})
            return [], str(e)
    
    @tracer.start_as_current_span("permission.update_permission")
    async def update_permission(self, perm_id: UUID, perm_data: PermissionUpdate) -> Tuple[Optional[Permission], Optional[str]]:
        """Update a permission."""
        permission_operations_counter.add(1, {"operation": "update_permission"})
        
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
                logger.error(f"Permission not found or update failed: {perm_id}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Permission not found or update failed"))
                permission_errors_counter.add(1, {"operation": "update_permission", "error": "not_found_or_failed"})
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
            logger.error(f"Exception while updating permission {perm_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            permission_errors_counter.add(1, {"operation": "update_permission", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("permission.delete_permission")
    async def delete_permission(self, perm_id: UUID) -> Tuple[bool, Optional[str]]:
        """Delete a permission."""
        permission_operations_counter.add(1, {"operation": "delete_permission"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("permission.id", str(perm_id))
        try:
            # First remove all role permissions with this permission
            self.supabase.table("role_permissions").delete().eq("permission_id", str(perm_id)).execute()
            
            # Then delete the permission
            response = self.supabase.table("permissions").delete().eq("id", str(perm_id)).execute()
            
            if not response.data:
                logger.warning(f"Permission not found for deletion: {perm_id}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Permission not found"))
                permission_errors_counter.add(1, {"operation": "delete_permission", "error": "not_found"})
                return False, "Permission not found"
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return True, None
            
        except Exception as e:
            logger.error(f"Exception while deleting permission {perm_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            permission_errors_counter.add(1, {"operation": "delete_permission", "error": "exception"})
            return False, str(e)
    
    # Role-Permission operations
    
    @tracer.start_as_current_span("permission.assign_permission_to_role")
    async def assign_permission_to_role(self, role_id: UUID, permission_id: UUID) -> Tuple[Optional[RolePermission], Optional[str]]:
        """Assign a permission to a role."""
        permission_operations_counter.add(1, {"operation": "assign_permission_to_role"})
        
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
                logger.error(f"Failed to assign permission {permission_id} to role {role_id}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Failed to assign permission to role"))
                permission_errors_counter.add(1, {"operation": "assign_permission_to_role", "error": "no_data_returned"})
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
            logger.error(f"Exception while assigning permission {permission_id} to role {role_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            permission_errors_counter.add(1, {"operation": "assign_permission_to_role", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("permission.remove_permission_from_role")
    async def remove_permission_from_role(self, role_id: UUID, permission_id: UUID) -> Tuple[bool, Optional[str]]:
        """Remove a permission from a role."""
        permission_operations_counter.add(1, {"operation": "remove_permission_from_role"})
        
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
                logger.warning(f"Role-permission assignment not found for role {role_id} and permission {permission_id}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Role-permission assignment not found"))
                permission_errors_counter.add(1, {"operation": "remove_permission_from_role", "error": "not_found"})
                return False, "Role-permission assignment not found"
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return True, None
            
        except Exception as e:
            logger.error(f"Exception while removing permission {permission_id} from role {role_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            permission_errors_counter.add(1, {"operation": "remove_permission_from_role", "error": "exception"})
            return False, str(e)
    
    @tracer.start_as_current_span("permission.get_permissions_for_role")
    async def get_permissions_for_role(self, role_id: UUID) -> Tuple[List[Permission], Optional[str]]:
        """Get all permissions for a role."""
        permission_operations_counter.add(1, {"operation": "get_permissions_for_role"})
        
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
            logger.error(f"Exception while getting permissions for role {role_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            permission_errors_counter.add(1, {"operation": "get_permissions_for_role", "error": "exception"})
            return [], str(e)


# Global permission service instance
permission_service = PermissionService()