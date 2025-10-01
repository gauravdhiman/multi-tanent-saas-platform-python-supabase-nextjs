"""
User Role service for managing user role assignments and access control in the RBAC system.
"""

import logging
from typing import Optional, Any
from uuid import UUID
from opentelemetry import trace, metrics
from config import supabase_config
from src.rbac.user_roles.models import UserRole, UserRoleCreate, UserRoleUpdate, UserWithRoles
from src.rbac.roles.models import Role, RoleWithPermissions, UserRoleWithPermissions
from src.rbac.permissions.models import Permission
from src.organization.member_models import OrganizationMember, MemberRole
from src.shared.utils import extract_first_last_name

logger = logging.getLogger(__name__)

# Get tracer for this module
tracer = trace.get_tracer(__name__)

# Get meter for this module
meter = metrics.get_meter(__name__)

# Create metrics
user_role_operations_counter = meter.create_counter(
    "user_role.operations",
    description="Number of user role operations"
)

user_role_errors_counter = meter.create_counter(
    "user_role.errors",
    description="Number of user role operation errors"
)


class UserRoleService:
    """Service for handling user role operations and access control."""
    
    def __init__(self):
        self.supabase_config = supabase_config
    
    @property
    def supabase(self):
        """Get Supabase client, raise error if not configured."""
        if not self.supabase_config.is_configured():
            logger.error("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
            raise ValueError("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
        return self.supabase_config.client
    
    @tracer.start_as_current_span("user_role.assign_role_to_user")
    async def assign_role_to_user(self, user_role_data: UserRoleCreate) -> tuple[Optional[UserRole], Optional[str]]:
        """Assign a role to a user."""
        user_role_operations_counter.add(1, {"operation": "assign_role_to_user"})
        
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
                logger.error(f"Failed to assign role {user_role_data.role_id} to user {user_role_data.user_id}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Failed to assign role to user"))
                user_role_errors_counter.add(1, {"operation": "assign_role_to_user", "error": "no_data_returned"})
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
            logger.error(f"Exception while assigning role {user_role_data.role_id} to user {user_role_data.user_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            user_role_errors_counter.add(1, {"operation": "assign_role_to_user", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("user_role.update_user_role")
    async def update_user_role(self, user_role_id: UUID, user_role_data: UserRoleUpdate) -> tuple[Optional[UserRole], Optional[str]]:
        """Update a user role assignment."""
        user_role_operations_counter.add(1, {"operation": "update_user_role"})
        
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
                logger.error(f"User role assignment not found or update failed: {user_role_id}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "User role assignment not found or update failed"))
                user_role_errors_counter.add(1, {"operation": "update_user_role", "error": "not_found_or_failed"})
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
            logger.error(f"Exception while updating user role {user_role_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            user_role_errors_counter.add(1, {"operation": "update_user_role", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("user_role.remove_role_from_user")
    async def remove_role_from_user(self, user_role_id: UUID) -> tuple[bool, Optional[str]]:
        """Remove a role from a user."""
        user_role_operations_counter.add(1, {"operation": "remove_role_from_user"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("user_role.id", str(user_role_id))
        try:
            response = self.supabase.table("user_roles").delete().eq("id", str(user_role_id)).execute()
            
            if not response.data:
                logger.warning(f"User role assignment not found for deletion: {user_role_id}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "User role assignment not found"))
                user_role_errors_counter.add(1, {"operation": "remove_role_from_user", "error": "not_found"})
                return False, "User role assignment not found"
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return True, None
            
        except Exception as e:
            logger.error(f"Exception while removing role from user {user_role_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            user_role_errors_counter.add(1, {"operation": "remove_role_from_user", "error": "exception"})
            return False, str(e)
    
    @tracer.start_as_current_span("user_role.get_user_role_by_id")
    async def get_user_role_by_id(self, user_role_id: UUID) -> tuple[Optional[UserRole], Optional[str]]:
        """Get a user role assignment by its ID."""
        user_role_operations_counter.add(1, {"operation": "get_user_role_by_id"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("user_role.id", str(user_role_id))
        try:
            response = self.supabase.table("user_roles").select("*").eq("id", str(user_role_id)).execute()
            
            if not response.data:
                logger.warning(f"User role assignment not found: {user_role_id}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "User role assignment not found"))
                user_role_errors_counter.add(1, {"operation": "get_user_role_by_id", "error": "not_found"})
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
            logger.error(f"Exception while getting user role {user_role_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            user_role_errors_counter.add(1, {"operation": "get_user_role_by_id", "error": "exception"})
            return None, str(e)
    
    @tracer.start_as_current_span("user_role.get_user_roles")
    async def get_user_roles(self, user_id: UUID, organization_id: Optional[UUID] = None) -> tuple[list[Role], Optional[str]]:
        """Get all roles for a user, optionally filtered by organization."""
        user_role_operations_counter.add(1, {"operation": "get_user_roles"})
        
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
            logger.error(f"Exception while getting roles for user {user_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            user_role_errors_counter.add(1, {"operation": "get_user_roles", "error": "exception"})
            return [], str(e)
    
    @tracer.start_as_current_span("user_role.get_user_roles_with_permissions")
    async def get_user_roles_with_permissions(self, user_id: UUID, organization_id: Optional[UUID] = None) -> tuple[list[RoleWithPermissions], Optional[str]]:
        """Get all roles with their permissions for a user."""
        user_role_operations_counter.add(1, {"operation": "get_user_roles_with_permissions"})

        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("user.id", str(user_id))
        if organization_id:
            current_span.set_attribute("organization.id", str(organization_id))

        try:
            # Get user roles
            roles, error = await self.get_user_roles(user_id, organization_id)
            if error:
                logger.error(f"Error getting roles for user {user_id}: {error}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
                user_role_errors_counter.add(1, {"operation": "get_user_roles_with_permissions", "error": "get_roles_failed"})
                return [], error

            # Get permissions for each role
            roles_with_permissions = []
            for role in roles:
                # Import here to avoid circular imports
                from src.rbac.permissions.service import permission_service
                permissions, error = await permission_service.get_permissions_for_role(role.id)
                if error:
                    logger.error(f"Error getting permissions for role {role.id} for user {user_id}: {error}")
                    current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
                    user_role_errors_counter.add(1, {"operation": "get_user_roles_with_permissions", "error": "get_permissions_failed"})
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

            current_span.set_attribute("roles_with_permissions.count", len(roles_with_permissions))
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return roles_with_permissions, None

        except Exception as e:
            logger.error(f"Exception while getting roles with permissions for user {user_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            user_role_errors_counter.add(1, {"operation": "get_user_roles_with_permissions", "error": "exception"})
            return [], str(e)

    @tracer.start_as_current_span("user_role.get_all_user_roles_with_permissions")
    async def get_all_user_roles_with_permissions(self, user_id: UUID) -> tuple[list[UserRoleWithPermissions], Optional[str]]:
        """Get all roles with their permissions and organization context for a user."""
        user_role_operations_counter.add(1, {"operation": "get_all_user_roles_with_permissions"})

        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("user.id", str(user_id))

        try:
            # Get user roles first
            user_roles_response = self.supabase.table("user_roles").select("id, role_id, organization_id").eq("user_id", str(user_id)).execute()

            if not user_roles_response.data:
                current_span.set_status(trace.Status(trace.StatusCode.OK))
                return [], None

            # Get unique role IDs
            role_ids = list(set(ur["role_id"] for ur in user_roles_response.data))

            # Get roles with permissions for these role IDs
            roles_with_permissions = []
            for role_id in role_ids:
                # Import here to avoid circular imports
                from src.rbac.roles.service import role_service
                role_with_perms, error = await role_service.get_role_with_permissions(role_id)
                if error:
                    logger.error(f"Error getting role with permissions for role {role_id}: {error}")
                    continue

                # Find all user roles for this role_id
                for ur in user_roles_response.data:
                    if ur["role_id"] == role_id:
                        roles_with_permissions.append(UserRoleWithPermissions(
                            user_role_id=ur["id"],
                            organization_id=ur.get("organization_id"),
                            role=role_with_perms
                        ))

            current_span.set_attribute("roles_with_permissions.count", len(roles_with_permissions))
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return roles_with_permissions, None

        except Exception as e:
            logger.error(f"Exception while getting all roles with permissions for user {user_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            user_role_errors_counter.add(1, {"operation": "get_all_user_roles_with_permissions", "error": "exception"})
            return [], str(e)

    @tracer.start_as_current_span("user_role.user_has_permission")
    async def user_has_permission(self, user_id: UUID, permission_name: str, organization_id: Optional[UUID] = None) -> tuple[bool, Optional[str]]:
        """Check if a user has a specific permission."""
        user_role_operations_counter.add(1, {"operation": "user_has_permission"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("user.id", str(user_id))
        current_span.set_attribute("permission.name", permission_name)
        if organization_id:
            current_span.set_attribute("organization.id", str(organization_id))
        
        try:
            # First get the permission by name
            response = self.supabase.table("permissions").select("*").eq("name", permission_name).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Permission not found"))
                user_role_errors_counter.add(1, {"operation": "user_has_permission", "error": "permission_not_found"})
                return False, "Permission not found"
            
            permission_dict = response.data[0]
            permission_id = permission_dict["id"]
            
            # Get user roles
            roles, error = await self.get_user_roles(user_id, organization_id)
            if error:
                logger.error(f"Error getting roles for user {user_id}: {error}")
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, error))
                user_role_errors_counter.add(1, {"operation": "user_has_permission", "error": "get_roles_failed"})
                return False, error
            
            # Check if any role has this permission
            for role in roles:
                response = self.supabase.table("role_permissions").select("*").match({
                    "role_id": str(role.id),
                    "permission_id": permission_id
                }).execute()
                
                if response.data:
                    current_span.set_status(trace.Status(trace.StatusCode.OK))
                    return True, None
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return False, None
            
        except Exception as e:
            logger.error(f"Exception while checking permission '{permission_name}' for user {user_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            user_role_errors_counter.add(1, {"operation": "user_has_permission", "error": "exception"})
            return False, str(e)

    @tracer.start_as_current_span("user_role.user_has_role")
    async def user_has_role(self, user_id: UUID, role_name: str, organization_id: Optional[UUID] = None) -> tuple[bool, Optional[str]]:
        """Check if a user has a specific role."""
        user_role_operations_counter.add(1, {"operation": "user_has_role"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("user.id", str(user_id))
        current_span.set_attribute("role.name", role_name)
        if organization_id:
            current_span.set_attribute("organization.id", str(organization_id))
        
        try:
            # First get the role by name
            response = self.supabase.table("roles").select("*").eq("name", role_name).execute()
            
            if not response.data:
                current_span.set_status(trace.Status(trace.StatusCode.ERROR, "Role not found"))
                user_role_errors_counter.add(1, {"operation": "user_has_role", "error": "role_not_found"})
                return False, "Role not found"
            
            role_dict = response.data[0]
            role_id = role_dict["id"]
            
            # Check if user has this role
            query = self.supabase.table("user_roles").select("*").match({
                "user_id": str(user_id),
                "role_id": role_id
            })
            
            if organization_id:
                query = query.eq("organization_id", str(organization_id))
            else:
                query = query.is_("organization_id", "null")
            
            response = query.execute()
            
            has_role = len(response.data) > 0
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return has_role, None
            
        except Exception as e:
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            user_role_errors_counter.add(1, {"operation": "user_has_role", "error": "exception"})
            return False, str(e)

    @tracer.start_as_current_span("user_role.get_users_by_organization")
    async def get_users_by_organization(self, organization_id: UUID) -> tuple[list[OrganizationMember], Optional[str]]:
        """Get all users (members) for an organization."""
        user_role_operations_counter.add(1, {"operation": "get_users_by_organization"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("organization.id", str(organization_id))
        
        try:
            # Optimized query using a single database query with joins to get user-role relationship with role data
            # This query joins user_roles with roles table to get role information in a single DB query
            response = (
                self.supabase
                .table("user_roles")
                .select("user_id, roles(id, name, description)")
                .eq("organization_id", str(organization_id))
                .execute()
            )
            
            if not response.data:
                current_span.set_attribute("members.count", 0)
                current_span.set_status(trace.Status(trace.StatusCode.OK))
                return [], None

            # Process the response to group users with their roles
            user_roles_map = {}
            unique_user_ids = set()

            for item in response.data:
                user_id = item["user_id"]
                role_data = item["roles"]  # The joined role data
                
                unique_user_ids.add(user_id)
                
                if user_id not in user_roles_map:
                    user_roles_map[user_id] = []

                if role_data:
                    user_roles_map[user_id].append(MemberRole(
                        id=role_data["id"],
                        name=role_data["name"],
                        description=role_data["description"]
                    ))
                else:
                    logger.warning(f"Role data missing for user {user_id}")

            # Now fetch user information from Supabase Auth using bulk approach
            users_data = {}
            user_id_strings = [str(uid) for uid in unique_user_ids]
            
            try:
                # Attempt to use list_users to get users in bulk - most efficient approach
                page = 1
                per_page = 1000  # Max allowed by Supabase
                all_users_found = False
                
                while not all_users_found:
                    try:
                        # Get a page of users
                        users_response = self.supabase.auth.admin.list_users(page=page, per_page=per_page)
                        
                        # Handle different response structures - Supabase might return data directly or in .data
                        users_list = None
                        if hasattr(users_response, 'users'):
                            # Newer Supabase client version
                            users_list = users_response.users
                        elif hasattr(users_response, 'data'):
                            # Older Supabase client version or different response format
                            users_list = users_response.data
                        elif isinstance(users_response, list):
                            # Response might be a direct list
                            users_list = users_response
                        else:
                            # Unknown response format
                            logger.warning(f"Unknown response format for list_users: {type(users_response)}")
                            break
                        
                        if not users_list:
                            break
                            
                        # Filter users we need from this page
                        for user in users_list:
                            # Get user ID - might be in different formats depending on client version
                            user_id = getattr(user, 'id', None)
                            if user_id is None and hasattr(user, 'get'):
                                user_id = user.get('id')
                            
                            if user_id and user_id in user_id_strings:
                                # Extract user properties - handle different possible formats
                                email = getattr(user, 'email', None)
                                if email is None and hasattr(user, 'get'):
                                    email = user.get('email', '')
                                
                                created_at = getattr(user, 'created_at', None)
                                if created_at is None and hasattr(user, 'get'):
                                    created_at = user.get('created_at')
                                
                                user_metadata = getattr(user, 'user_metadata', {})
                                if user_metadata is None and hasattr(user, 'get'):
                                    user_metadata = user.get('user_metadata', {})
                                
                                email_confirmed_at = getattr(user, 'email_confirmed_at', None)
                                if email_confirmed_at is None and hasattr(user, 'get'):
                                    email_confirmed_at = user.get('email_confirmed_at')
                                
                                # Extract first_name and last_name using utility function
                                first_name, last_name = extract_first_last_name(user_metadata)
                                
                                users_data[user_id] = {
                                    "id": user_id,
                                    "email": email or "",
                                    "first_name": first_name,
                                    "last_name": last_name,
                                    "is_verified": email_confirmed_at is not None,
                                    "created_at": created_at.isoformat() if created_at and hasattr(created_at, 'isoformat') else str(created_at) if created_at else ""
                                }
                        
                        # If we found all users we need, stop paginating
                        if len(users_data) == len(user_id_strings):
                            all_users_found = True
                            break
                            
                        # If we got less than per_page users, we've reached the end
                        if len(users_list) < per_page:
                            break
                            
                        page += 1
                        
                    except Exception as e:
                        logger.warning(f"Error in list_users pagination (page {page}): {e}")
                        break
                
                # If we didn't find all users via list_users, fall back to individual calls for the missing ones
                found_user_ids = set(users_data.keys())
                missing_user_ids = set(user_id_strings) - found_user_ids
                
                if missing_user_ids:
                    logger.info(f"Fetching {len(missing_user_ids)} missing users individually")
                    for user_id in missing_user_ids:
                        try:
                            user_response = self.supabase.auth.admin.get_user_by_id(user_id)
                            user = None
                            if hasattr(user_response, 'user'):
                                # Newer Supabase client version
                                user = user_response.user
                            elif hasattr(user_response, 'data'):
                                # Older Supabase client version
                                user = user_response.data
                            else:
                                # Direct response
                                user = user_response
                            
                            if user:
                                # Process user data similar to above
                                email = getattr(user, 'email', None)
                                if email is None and hasattr(user, 'get'):
                                    email = user.get('email', '')
                                
                                created_at = getattr(user, 'created_at', None)
                                if created_at is None and hasattr(user, 'get'):
                                    created_at = user.get('created_at')
                                
                                user_metadata = getattr(user, 'user_metadata', {})
                                if user_metadata is None and hasattr(user, 'get'):
                                    user_metadata = user.get('user_metadata', {})
                                
                                email_confirmed_at = getattr(user, 'email_confirmed_at', None)
                                if email_confirmed_at is None and hasattr(user, 'get'):
                                    email_confirmed_at = user.get('email_confirmed_at')
                                
                                # Extract first_name and last_name using utility function
                                first_name, last_name = extract_first_last_name(user_metadata)
                                    
                                users_data[user_id] = {
                                    "id": user_id,
                                    "email": email or "",
                                    "first_name": first_name,
                                    "last_name": last_name,
                                    "is_verified": email_confirmed_at is not None,
                                    "created_at": created_at.isoformat() if created_at and hasattr(created_at, 'isoformat') else str(created_at) if created_at else ""
                                }
                        except Exception as e:
                            logger.warning(f"Could not fetch missing user {user_id}: {e}")
                            continue
                            
            except Exception as e:
                logger.error(f"Error with list_users approach: {e}")
                # Complete fallback to individual calls
                logger.info("Falling back to individual user fetch calls")
                for user_id in user_id_strings:
                    try:
                        user_response = self.supabase.auth.admin.get_user_by_id(user_id)
                        user = None
                        if hasattr(user_response, 'user'):
                            # Newer Supabase client version
                            user = user_response.user
                        elif hasattr(user_response, 'data'):
                            # Older Supabase client version
                            user = user_response.data
                        else:
                            # Direct response
                            user = user_response
                        
                        if user:
                            # Process user data similar to above
                            email = getattr(user, 'email', None)
                            if email is None and hasattr(user, 'get'):
                                email = user.get('email', '')
                            
                            created_at = getattr(user, 'created_at', None)
                            if created_at is None and hasattr(user, 'get'):
                                created_at = user.get('created_at')
                            
                            user_metadata = getattr(user, 'user_metadata', {})
                            if user_metadata is None and hasattr(user, 'get'):
                                user_metadata = user.get('user_metadata', {})
                            
                            email_confirmed_at = getattr(user, 'email_confirmed_at', None)
                            if email_confirmed_at is None and hasattr(user, 'get'):
                                email_confirmed_at = user.get('email_confirmed_at')
                            
                            # Extract first_name and last_name using utility function
                            first_name, last_name = extract_first_last_name(user_metadata)
                            
                            users_data[user_id] = {
                                "id": user_id,
                                "email": email or "",
                                "first_name": first_name,
                                "last_name": last_name,
                                "is_verified": email_confirmed_at is not None,
                                "created_at": created_at.isoformat() if created_at and hasattr(created_at, 'isoformat') else str(created_at) if created_at else ""
                            }
                    except Exception as e:
                        logger.warning(f"Could not fetch user {user_id}: {e}")
                        continue

            # Combine user data with roles to create OrganizationMember objects
            members = []
            for user_id, roles in user_roles_map.items():
                user_data = users_data.get(user_id)
                if user_data:
                    member_data = {
                        **user_data,
                        "roles": roles
                    }
                    members.append(OrganizationMember(**member_data))

            logger.info(f"Found {len(members)} organization members for organization {organization_id}")
            
            current_span.set_attribute("members.count", len(members))
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return members, None
            
        except Exception as e:
            logger.error(f"Exception while getting users for organization {organization_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            user_role_errors_counter.add(1, {"operation": "get_users_by_organization", "error": "exception"})
            return [], str(e)

    @tracer.start_as_current_span("user_role.get_organizations_for_user")
    async def get_organizations_for_user(self, user_id: UUID) -> tuple[list[Any], Optional[str]]:
        """Get all organizations for a user."""
        user_role_operations_counter.add(1, {"operation": "get_organizations_for_user"})
        
        # Set attribute on current span
        current_span = trace.get_current_span()
        current_span.set_attribute("user.id", str(user_id))
        
        try:
            # Get organizations where the user has roles
            response = self.supabase.table("user_roles").select("organizations(*)").eq("user_id", str(user_id)).not_.is_("organization_id", "null").execute()
            
            organizations = []
            for ur_dict in response.data:
                if ur_dict.get("organizations"):
                    org_dict = ur_dict["organizations"]
                    # Create organization object using the organization service model
                    from src.organization.models import Organization
                    organization = Organization(
                        id=org_dict["id"],
                        name=org_dict["name"],
                        description=org_dict["description"],
                        slug=org_dict["slug"],
                        is_active=org_dict["is_active"],
                        created_at=org_dict["created_at"],
                        updated_at=org_dict["updated_at"]
                    )
                    organizations.append(organization)
            
            current_span.set_status(trace.Status(trace.StatusCode.OK))
            return organizations, None
            
        except Exception as e:
            logger.error(f"Exception while getting organizations for user {user_id}: {e}", exc_info=True)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            user_role_errors_counter.add(1, {"operation": "get_organizations_for_user", "error": "exception"})
            return [], str(e)


# Global user role service instance
user_role_service = UserRoleService()
