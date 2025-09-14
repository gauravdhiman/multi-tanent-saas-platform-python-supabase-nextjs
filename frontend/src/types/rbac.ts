/**
 * RBAC (Role-Based Access Control) type definitions
 */

// Permission definition (matches backend schema)
export interface Permission {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  created_at: string;
  updated_at: string;
}

// Role definition (matches backend schema)
export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

// Role permission relationship
export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

// User role assignment (matches backend schema)
export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

// Extended role with permissions
export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

// User with roles and permissions
export interface UserWithRoles {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  roles: RoleWithPermissions[];
}

// RBAC context for components
export interface RBACContext {
  userPermissions: string[];
  userRoles: Role[];
  hasPermission: (permission: string) => boolean;
  hasRole: (roleName: string) => boolean;
}

// RBAC hook state
export interface RBACState {
  roles: Role[];
  permissions: Permission[];
  userRoles: RoleWithPermissions[];
  loading: boolean;
  error: string | null;
}

// RBAC hook actions
export interface RBACActions {
  createRole: (roleData: Omit<Role, 'id' | 'is_system_role' | 'created_at' | 'updated_at'>) => Promise<Role>;
  updateRole: (roleId: string, roleData: Partial<Omit<Role, 'id' | 'is_system_role' | 'created_at' | 'updated_at'>>) => Promise<Role>;
  deleteRole: (roleId: string) => Promise<void>;
  createPermission: (permissionData: Omit<Permission, 'id' | 'created_at' | 'updated_at'>) => Promise<Permission>;
  updatePermission: (permissionId: string, permissionData: Partial<Omit<Permission, 'id' | 'created_at' | 'updated_at'>>) => Promise<Permission>;
  deletePermission: (permissionId: string) => Promise<void>;
  assignRoleToUser: (userRoleData: Omit<UserRole, 'id' | 'created_at' | 'updated_at'>) => Promise<UserRole>;
  removeRoleFromUser: (userRoleId: string) => Promise<void>;
  assignPermissionToRole: (roleId: string, permissionId: string) => Promise<void>;
  removePermissionFromRole: (roleId: string, permissionId: string) => Promise<void>;
  refreshUserRoles: () => Promise<void>;
  hasPermission: (permissionName: string) => boolean;
  hasRole: (roleName: string) => boolean;
}