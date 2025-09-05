// hooks/use-rbac.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { rbacService, Role, Permission, RoleWithPermissions, UserRole } from '@/services/rbac-service';

interface RBACState {
  roles: Role[];
  permissions: Permission[];
  userRoles: RoleWithPermissions[];
  loading: boolean;
  error: string | null;
}

interface RBACActions {
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

export const useRBAC = (): [RBACState, RBACActions] => {
  const { user } = useAuth();
  const [state, setState] = useState<RBACState>({
    roles: [],
    permissions: [],
    userRoles: [],
    loading: false,
    error: null,
  });

  // Load user roles and permissions on user change
  useEffect(() => {
    const loadUserRoles = async () => {
      if (!user?.id) return;
      
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        const userRoles = await rbacService.getUserRolesWithPermissions(user.id);
        setState(prev => ({ ...prev, userRoles, loading: false }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error instanceof Error ? error.message : 'Failed to load user roles' 
        }));
      }
    };

    loadUserRoles();
  }, [user?.id]);

  // Load all roles and permissions (for admin users)
  const loadRolesAndPermissions = async () => {
    if (!user?.id) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const [roles, permissions] = await Promise.all([
        rbacService.getAllRoles(),
        rbacService.getAllPermissions()
      ]);
      
      setState(prev => ({ ...prev, roles, permissions, loading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load roles and permissions' 
      }));
    }
  };

  // Create a new role
  const createRole = async (roleData: Omit<Role, 'id' | 'is_system_role' | 'created_at' | 'updated_at'>) => {
    try {
      const newRole = await rbacService.createRole(roleData);
      setState(prev => ({ ...prev, roles: [...prev.roles, newRole] }));
      return newRole;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to create role' 
      }));
      throw error;
    }
  };

  // Update a role
  const updateRole = async (roleId: string, roleData: Partial<Omit<Role, 'id' | 'is_system_role' | 'created_at' | 'updated_at'>>) => {
    try {
      const updatedRole = await rbacService.updateRole(roleId, roleData);
      setState(prev => ({
        ...prev,
        roles: prev.roles.map(role => role.id === roleId ? updatedRole : role)
      }));
      return updatedRole;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to update role' 
      }));
      throw error;
    }
  };

  // Delete a role
  const deleteRole = async (roleId: string) => {
    try {
      await rbacService.deleteRole(roleId);
      setState(prev => ({
        ...prev,
        roles: prev.roles.filter(role => role.id !== roleId)
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to delete role' 
      }));
      throw error;
    }
  };

  // Create a new permission
  const createPermission = async (permissionData: Omit<Permission, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newPermission = await rbacService.createPermission(permissionData);
      setState(prev => ({ ...prev, permissions: [...prev.permissions, newPermission] }));
      return newPermission;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to create permission' 
      }));
      throw error;
    }
  };

  // Update a permission
  const updatePermission = async (permissionId: string, permissionData: Partial<Omit<Permission, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      const updatedPermission = await rbacService.updatePermission(permissionId, permissionData);
      setState(prev => ({
        ...prev,
        permissions: prev.permissions.map(permission => 
          permission.id === permissionId ? updatedPermission : permission
        )
      }));
      return updatedPermission;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to update permission' 
      }));
      throw error;
    }
  };

  // Delete a permission
  const deletePermission = async (permissionId: string) => {
    try {
      await rbacService.deletePermission(permissionId);
      setState(prev => ({
        ...prev,
        permissions: prev.permissions.filter(permission => permission.id !== permissionId)
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to delete permission' 
      }));
      throw error;
    }
  };

  // Assign a role to a user
  const assignRoleToUser = async (userRoleData: Omit<UserRole, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newUserRole = await rbacService.assignRoleToUser(userRoleData);
      // Refresh user roles to get the updated list
      if (user?.id) {
        const updatedUserRoles = await rbacService.getUserRolesWithPermissions(user.id);
        setState(prev => ({ ...prev, userRoles: updatedUserRoles }));
      }
      return newUserRole;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to assign role to user' 
      }));
      throw error;
    }
  };

  // Remove a role from a user
  const removeRoleFromUser = async (userRoleId: string) => {
    try {
      await rbacService.removeRoleFromUser(userRoleId);
      // Refresh user roles to get the updated list
      if (user?.id) {
        const updatedUserRoles = await rbacService.getUserRolesWithPermissions(user.id);
        setState(prev => ({ ...prev, userRoles: updatedUserRoles }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to remove role from user' 
      }));
      throw error;
    }
  };

  // Assign a permission to a role
  const assignPermissionToRole = async (roleId: string, permissionId: string) => {
    try {
      await rbacService.assignPermissionToRole(roleId, permissionId);
      // Refresh roles and permissions
      await loadRolesAndPermissions();
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to assign permission to role' 
      }));
      throw error;
    }
  };

  // Remove a permission from a role
  const removePermissionFromRole = async (roleId: string, permissionId: string) => {
    try {
      await rbacService.removePermissionFromRole(roleId, permissionId);
      // Refresh roles and permissions
      await loadRolesAndPermissions();
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to remove permission from role' 
      }));
      throw error;
    }
  };

  // Refresh user roles
  const refreshUserRoles = async () => {
    if (!user?.id) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const userRoles = await rbacService.getUserRolesWithPermissions(user.id);
      setState(prev => ({ ...prev, userRoles, loading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to refresh user roles' 
      }));
    }
  };

  // Check if user has a specific permission
  const hasPermission = (permissionName: string): boolean => {
    if (!user?.id) return false;
    
    return state.userRoles.some(role => 
      role.permissions.some(permission => permission.name === permissionName)
    );
  };

  // Check if user has a specific role
  const hasRole = (roleName: string): boolean => {
    if (!user?.id) return false;
    
    return state.userRoles.some(role => role.name === roleName);
  };

  const actions: RBACActions = {
    createRole,
    updateRole,
    deleteRole,
    createPermission,
    updatePermission,
    deletePermission,
    assignRoleToUser,
    removeRoleFromUser,
    assignPermissionToRole,
    removePermissionFromRole,
    refreshUserRoles,
    hasPermission,
    hasRole,
  };

  return [state, actions];
};