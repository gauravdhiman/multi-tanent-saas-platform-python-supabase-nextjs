// services/rbac-service.ts
import { supabase } from '@/lib/supabase';

// Define TypeScript interfaces for RBAC entities
export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface UserWithRoles {
  user_id: string;
  roles: RoleWithPermissions[];
}

// RBAC Service class
class RBACService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL + '/rbac'; // Use the backend API URL from environment variables

  // Get the access token from Supabase
  private async getAccessToken(): Promise<string> {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      throw new Error('No active session');
    }
    return data.session.access_token;
  }

  // Generic fetch wrapper with authentication
  private async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAccessToken();
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return response;
  }

  // Role operations
  async createRole(roleData: Omit<Role, 'id' | 'is_system_role' | 'created_at' | 'updated_at'>): Promise<Role> {
    const response = await this.fetchWithAuth('/roles', {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
    return response.json();
  }

  async getRoleById(roleId: string): Promise<Role> {
    const response = await this.fetchWithAuth(`/roles/${roleId}`);
    return response.json();
  }

  async getAllRoles(): Promise<Role[]> {
    const response = await this.fetchWithAuth('/roles');
    return response.json();
  }

  async updateRole(roleId: string, roleData: Partial<Omit<Role, 'id' | 'is_system_role' | 'created_at' | 'updated_at'>>): Promise<Role> {
    const response = await this.fetchWithAuth(`/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    });
    return response.json();
  }

  async deleteRole(roleId: string): Promise<void> {
    await this.fetchWithAuth(`/roles/${roleId}`, {
      method: 'DELETE',
    });
  }

  // Permission operations
  async createPermission(permissionData: Omit<Permission, 'id' | 'created_at' | 'updated_at'>): Promise<Permission> {
    const response = await this.fetchWithAuth('/permissions', {
      method: 'POST',
      body: JSON.stringify(permissionData),
    });
    return response.json();
  }

  async getPermissionById(permissionId: string): Promise<Permission> {
    const response = await this.fetchWithAuth(`/permissions/${permissionId}`);
    return response.json();
  }

  async getAllPermissions(): Promise<Permission[]> {
    const response = await this.fetchWithAuth('/permissions');
    return response.json();
  }

  async updatePermission(permissionId: string, permissionData: Partial<Omit<Permission, 'id' | 'created_at' | 'updated_at'>>): Promise<Permission> {
    const response = await this.fetchWithAuth(`/permissions/${permissionId}`, {
      method: 'PUT',
      body: JSON.stringify(permissionData),
    });
    return response.json();
  }

  async deletePermission(permissionId: string): Promise<void> {
    await this.fetchWithAuth(`/permissions/${permissionId}`, {
      method: 'DELETE',
    });
  }

  // Role-Permission operations
  async assignPermissionToRole(roleId: string, permissionId: string): Promise<RolePermission> {
    const response = await this.fetchWithAuth(`/role-permissions?role_id=${roleId}&permission_id=${permissionId}`, {
      method: 'POST',
    });
    return response.json();
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    await this.fetchWithAuth(`/role-permissions?role_id=${roleId}&permission_id=${permissionId}`, {
      method: 'DELETE',
    });
  }

  async getPermissionsForRole(roleId: string): Promise<Permission[]> {
    const response = await this.fetchWithAuth(`/roles/${roleId}/permissions`);
    return response.json();
  }

  // User-Role operations
  async assignRoleToUser(userRoleData: Omit<UserRole, 'id' | 'created_at' | 'updated_at'>): Promise<UserRole> {
    const response = await this.fetchWithAuth('/user-roles', {
      method: 'POST',
      body: JSON.stringify(userRoleData),
    });
    return response.json();
  }

  async updateUserRole(userRoleId: string, userRoleData: Partial<Omit<UserRole, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<UserRole> {
    const response = await this.fetchWithAuth(`/user-roles/${userRoleId}`, {
      method: 'PUT',
      body: JSON.stringify(userRoleData),
    });
    return response.json();
  }

  async removeRoleFromUser(userRoleId: string): Promise<void> {
    await this.fetchWithAuth(`/user-roles/${userRoleId}`, {
      method: 'DELETE',
    });
  }

  async getRolesForUser(userId: string, organizationId?: string): Promise<Role[]> {
    const url = organizationId 
      ? `/users/${userId}/roles?organization_id=${organizationId}`
      : `/users/${userId}/roles`;
    const response = await this.fetchWithAuth(url);
    return response.json();
  }

  async getUserRolesWithPermissions(userId: string, organizationId?: string): Promise<RoleWithPermissions[]> {
    const url = organizationId 
      ? `/users/${userId}/roles-with-permissions?organization_id=${organizationId}`
      : `/users/${userId}/roles-with-permissions`;
    const response = await this.fetchWithAuth(url);
    return response.json();
  }

  // Permission checking
  async userHasPermission(userId: string, permissionName: string, organizationId?: string): Promise<boolean> {
    const url = organizationId 
      ? `/users/${userId}/has-permission/${permissionName}?organization_id=${organizationId}`
      : `/users/${userId}/has-permission/${permissionName}`;
    const response = await this.fetchWithAuth(url);
    return response.json();
  }

  async userHasRole(userId: string, roleName: string, organizationId?: string): Promise<boolean> {
    const url = organizationId 
      ? `/users/${userId}/has-role/${roleName}?organization_id=${organizationId}`
      : `/users/${userId}/has-role/${roleName}`;
    const response = await this.fetchWithAuth(url);
    return response.json();
  }
}

// Export a singleton instance of the RBAC service
export const rbacService = new RBACService();