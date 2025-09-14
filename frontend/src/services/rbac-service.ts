// services/rbac-service.ts
import { supabase } from '@/lib/supabase';
import { SpanStatusCode } from '@opentelemetry/api';
import { getTracer, getMeter, ensureOpentelemetryIsInitialized } from '@/lib/opentelemetry';

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
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
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

  // Generic fetch wrapper with authentication and tracing
  private async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer for this operation
    const tracer = getTracer('rbac-service');
    
    // Check if tracer is available before using it
    if (!tracer) {
      // Fallback to regular fetch if tracer is not available
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

      return fetch(`${this.baseUrl}${endpoint}`, config);
    }

    return await tracer.startActiveSpan(`http-request ${options.method || 'GET'} ${endpoint}`, async (span) => {
      try {
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

        // Add attributes to span
        span.setAttribute('http.url', `${this.baseUrl}${endpoint}`);
        span.setAttribute('http.method', options.method || 'GET');

        const response = await fetch(`${this.baseUrl}${endpoint}`, config);
        
        // Add response attributes
        span.setAttribute('http.status_code', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.detail || `HTTP error! status: ${response.status}`;
          span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
          throw new Error(errorMessage);
        }
        
        span.setStatus({ code: SpanStatusCode.OK });
        return response;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  // Role operations
  async createRole(roleData: Omit<Role, 'id' | 'is_system_role' | 'created_at' | 'updated_at'>): Promise<Role> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'createRole', entity: 'role' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(roleData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
    
    return await tracer.startActiveSpan('rbac.createRole', async (span) => {
      try {
        span.setAttribute('role.name', roleData.name);
        const response = await this.fetchWithAuth('/roles', {
          method: 'POST',
          body: JSON.stringify(roleData),
        });
        const result = await response.json();
        span.setAttribute('role.id', result.id);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        rbacErrorsCounter?.add(1, { operation: 'createRole', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getRoleById(roleId: string): Promise<Role> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'getRoleById', entity: 'role' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/roles/${roleId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
    
    return await tracer.startActiveSpan('rbac.getRoleById', async (span) => {
      try {
        span.setAttribute('role.id', roleId);
        const response = await this.fetchWithAuth(`/roles/${roleId}`);
        const result = await response.json();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        rbacErrorsCounter?.add(1, { operation: 'getRoleById', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getAllRoles(): Promise<Role[]> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'getAllRoles', entity: 'role' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/roles`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
    
    return await tracer.startActiveSpan('rbac.getAllRoles', async (span) => {
      try {
        const response = await this.fetchWithAuth('/roles');
        const result = await response.json();
        span.setAttribute('roles.count', result.length);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        rbacErrorsCounter?.add(1, { operation: 'getAllRoles', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async updateRole(roleId: string, roleData: Partial<Omit<Role, 'id' | 'is_system_role' | 'created_at' | 'updated_at'>>): Promise<Role> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'updateRole', entity: 'role' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(roleData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
    
    return await tracer.startActiveSpan('rbac.updateRole', async (span) => {
      try {
        span.setAttribute('role.id', roleId);
        const response = await this.fetchWithAuth(`/roles/${roleId}`, {
          method: 'PUT',
          body: JSON.stringify(roleData),
        });
        const result = await response.json();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        rbacErrorsCounter?.add(1, { operation: 'updateRole', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async deleteRole(roleId: string): Promise<void> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'deleteRole', entity: 'role' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return;
    }
    
    return await tracer.startActiveSpan('rbac.deleteRole', async (span) => {
      try {
        span.setAttribute('role.id', roleId);
        await this.fetchWithAuth(`/roles/${roleId}`, {
          method: 'DELETE',
        });
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        rbacErrorsCounter?.add(1, { operation: 'deleteRole', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  // Permission operations
  async createPermission(permissionData: Omit<Permission, 'id' | 'created_at' | 'updated_at'>): Promise<Permission> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'createPermission', entity: 'permission' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(permissionData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
    
    return await tracer.startActiveSpan('rbac.createPermission', async (span) => {
      try {
        span.setAttribute('permission.name', permissionData.name);
        const response = await this.fetchWithAuth('/permissions', {
          method: 'POST',
          body: JSON.stringify(permissionData),
        });
        const result = await response.json();
        span.setAttribute('permission.id', result.id);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        rbacErrorsCounter?.add(1, { operation: 'createPermission', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getPermissionById(permissionId: string): Promise<Permission> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'getPermissionById', entity: 'permission' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/permissions/${permissionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
    
    return await tracer.startActiveSpan('rbac.getPermissionById', async (span) => {
      try {
        span.setAttribute('permission.id', permissionId);
        const response = await this.fetchWithAuth(`/permissions/${permissionId}`);
        const result = await response.json();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        rbacErrorsCounter?.add(1, { operation: 'getPermissionById', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getAllPermissions(): Promise<Permission[]> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'getAllPermissions', entity: 'permission' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/permissions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
    
    return await tracer.startActiveSpan('rbac.getAllPermissions', async (span) => {
      try {
        const response = await this.fetchWithAuth('/permissions');
        const result = await response.json();
        span.setAttribute('permissions.count', result.length);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        rbacErrorsCounter?.add(1, { operation: 'getAllPermissions', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async updatePermission(permissionId: string, permissionData: Partial<Omit<Permission, 'id' | 'created_at' | 'updated_at'>>): Promise<Permission> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'updatePermission', entity: 'permission' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/permissions/${permissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(permissionData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
    
    return await tracer.startActiveSpan('rbac.updatePermission', async (span) => {
      try {
        span.setAttribute('permission.id', permissionId);
        const response = await this.fetchWithAuth(`/permissions/${permissionId}`, {
          method: 'PUT',
          body: JSON.stringify(permissionData),
        });
        const result = await response.json();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        rbacErrorsCounter?.add(1, { operation: 'updatePermission', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async deletePermission(permissionId: string): Promise<void> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'deletePermission', entity: 'permission' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/permissions/${permissionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return;
    }
    
    return await tracer.startActiveSpan('rbac.deletePermission', async (span) => {
      try {
        span.setAttribute('permission.id', permissionId);
        await this.fetchWithAuth(`/permissions/${permissionId}`, {
          method: 'DELETE',
        });
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        rbacErrorsCounter?.add(1, { operation: 'deletePermission', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  // Role-Permission operations
  async assignPermissionToRole(roleId: string, permissionId: string): Promise<RolePermission> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'assignPermissionToRole', entity: 'role_permission' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/role-permissions?role_id=${roleId}&permission_id=${permissionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
    
    return await tracer.startActiveSpan('rbac.assignPermissionToRole', async (span) => {
      try {
        span.setAttribute('role.id', roleId);
        span.setAttribute('permission.id', permissionId);
        const response = await this.fetchWithAuth(`/role-permissions?role_id=${roleId}&permission_id=${permissionId}`, {
          method: 'POST',
        });
        const result = await response.json();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        rbacErrorsCounter?.add(1, { operation: 'assignPermissionToRole', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'removePermissionFromRole', entity: 'role_permission' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/role-permissions?role_id=${roleId}&permission_id=${permissionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return;
    }
    
    return await tracer.startActiveSpan('rbac.removePermissionFromRole', async (span) => {
      try {
        span.setAttribute('role.id', roleId);
        span.setAttribute('permission.id', permissionId);
        await this.fetchWithAuth(`/role-permissions?role_id=${roleId}&permission_id=${permissionId}`, {
          method: 'DELETE',
        });
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        rbacErrorsCounter?.add(1, { operation: 'removePermissionFromRole', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getPermissionsForRole(roleId: string): Promise<Permission[]> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'getPermissionsForRole', entity: 'role_permission' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/roles/${roleId}/permissions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
    
    return await tracer.startActiveSpan('rbac.getPermissionsForRole', async (span) => {
      try {
        span.setAttribute('role.id', roleId);
        const response = await this.fetchWithAuth(`/roles/${roleId}/permissions`);
        const result = await response.json();
        span.setAttribute('permissions.count', result.length);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        rbacErrorsCounter?.add(1, { operation: 'getPermissionsForRole', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  // User-Role operations
  async assignRoleToUser(userRoleData: Omit<UserRole, 'id' | 'created_at' | 'updated_at'>): Promise<UserRole> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'assignRoleToUser', entity: 'user_role' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/user-roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userRoleData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
    
    return await tracer.startActiveSpan('rbac.assignRoleToUser', async (span) => {
      try {
        span.setAttribute('user.id', userRoleData.user_id);
        span.setAttribute('role.id', userRoleData.role_id);
        if (userRoleData.organization_id) {
          span.setAttribute('organization.id', userRoleData.organization_id);
        }
        const response = await this.fetchWithAuth('/user-roles', {
          method: 'POST',
          body: JSON.stringify(userRoleData),
        });
        const result = await response.json();
        span.setAttribute('user_role.id', result.id);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        rbacErrorsCounter?.add(1, { operation: 'assignRoleToUser', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async updateUserRole(userRoleId: string, userRoleData: Partial<Omit<UserRole, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<UserRole> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'updateUserRole', entity: 'user_role' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/user-roles/${userRoleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userRoleData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
    
    return await tracer.startActiveSpan('rbac.updateUserRole', async (span) => {
      try {
        span.setAttribute('user_role.id', userRoleId);
        const response = await this.fetchWithAuth(`/user-roles/${userRoleId}`, {
          method: 'PUT',
          body: JSON.stringify(userRoleData),
        });
        const result = await response.json();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        rbacErrorsCounter?.add(1, { operation: 'updateUserRole', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async removeRoleFromUser(userRoleId: string): Promise<void> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'removeRoleFromUser', entity: 'user_role' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/user-roles/${userRoleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return;
    }
    
    return await tracer.startActiveSpan('rbac.removeRoleFromUser', async (span) => {
      try {
        span.setAttribute('user_role.id', userRoleId);
        await this.fetchWithAuth(`/user-roles/${userRoleId}`, {
          method: 'DELETE',
        });
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        rbacErrorsCounter?.add(1, { operation: 'removeRoleFromUser', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getRolesForUser(userId: string, organizationId?: string): Promise<Role[]> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'getRolesForUser', entity: 'user_role' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const url = organizationId 
        ? `${this.baseUrl}/users/${userId}/roles?organization_id=${organizationId}`
        : `${this.baseUrl}/users/${userId}/roles`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
    
    return await tracer.startActiveSpan('rbac.getRolesForUser', async (span) => {
      try {
        span.setAttribute('user.id', userId);
        if (organizationId) {
          span.setAttribute('organization.id', organizationId);
        }
        const url = organizationId 
          ? `/users/${userId}/roles?organization_id=${organizationId}`
          : `/users/${userId}/roles`;
        const response = await this.fetchWithAuth(url);
        const result = await response.json();
        span.setAttribute('roles.count', result.length);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        rbacErrorsCounter?.add(1, { operation: 'getRolesForUser', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getUserRolesWithPermissions(userId: string, organizationId?: string): Promise<RoleWithPermissions[]> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'getUserRolesWithPermissions', entity: 'user_role' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const url = organizationId 
        ? `${this.baseUrl}/users/${userId}/roles-with-permissions?organization_id=${organizationId}`
        : `${this.baseUrl}/users/${userId}/roles-with-permissions`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
    
    return await tracer.startActiveSpan('rbac.getUserRolesWithPermissions', async (span) => {
      try {
        span.setAttribute('user.id', userId);
        if (organizationId) {
          span.setAttribute('organization.id', organizationId);
        }
        const url = organizationId 
          ? `/users/${userId}/roles-with-permissions?organization_id=${organizationId}`
          : `/users/${userId}/roles-with-permissions`;
        const response = await this.fetchWithAuth(url);
        const result = await response.json();
        span.setAttribute('roles_with_permissions.count', result.length);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        rbacErrorsCounter?.add(1, { operation: 'getUserRolesWithPermissions', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  // Permission checking
  async userHasPermission(userId: string, permissionName: string, organizationId?: string): Promise<boolean> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'userHasPermission', entity: 'permission_check' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const url = organizationId 
        ? `${this.baseUrl}/users/${userId}/permissions/${permissionName}?organization_id=${organizationId}`
        : `${this.baseUrl}/users/${userId}/permissions/${permissionName}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        if (response.status === 404 || response.status === 403) {
          return false; // User doesn't have the permission
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
    
    return await tracer.startActiveSpan('rbac.userHasPermission', async (span) => {
      try {
        span.setAttribute('user.id', userId);
        span.setAttribute('permission.name', permissionName);
        if (organizationId) {
          span.setAttribute('organization.id', organizationId);
        }
        const url = organizationId 
          ? `/users/${userId}/permissions/${permissionName}?organization_id=${organizationId}`
          : `/users/${userId}/permissions/${permissionName}`;
        const response = await this.fetchWithAuth(url);
        const result = await response.json();
        span.setAttribute('permission.granted', result);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        // If it's a 404 or 403, the user doesn't have the permission
        if (error instanceof Error && (error.message.includes('404') || error.message.includes('403'))) {
          span.setAttribute('permission.granted', false);
          span.setStatus({ code: SpanStatusCode.OK });
          return false;
        }
        rbacErrorsCounter?.add(1, { operation: 'userHasPermission', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async userHasRole(userId: string, roleName: string, organizationId?: string): Promise<boolean> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('rbac-service');
    const meter = getMeter('rbac-service');
    
    // Create metrics only when needed
    const rbacOperationsCounter = meter?.createCounter('rbac.operations', {
      description: 'Number of RBAC operations'
    });
    
    const rbacErrorsCounter = meter?.createCounter('rbac.errors', {
      description: 'Number of RBAC operation errors'
    });
    
    rbacOperationsCounter?.add(1, { operation: 'userHasRole', entity: 'role_check' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const url = organizationId 
        ? `${this.baseUrl}/users/${userId}/roles/${roleName}?organization_id=${organizationId}`
        : `${this.baseUrl}/users/${userId}/roles/${roleName}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        if (response.status === 404) {
          return false; // User doesn't have the role
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // If we get a 200 response, the user has the role
      return true;
    }
    
    return await tracer.startActiveSpan('rbac.userHasRole', async (span) => {
      try {
        span.setAttribute('user.id', userId);
        span.setAttribute('role.name', roleName);
        if (organizationId) {
          span.setAttribute('organization.id', organizationId);
        }
        const url = organizationId 
          ? `/users/${userId}/roles/${roleName}?organization_id=${organizationId}`
          : `/users/${userId}/roles/${roleName}`;
        const response = await this.fetchWithAuth(url);
        span.setAttribute('role.granted', true);
        span.setStatus({ code: SpanStatusCode.OK });
        return true;
      } catch (error) {
        // If it's a 404, the user doesn't have the role
        if (error instanceof Error && error.message.includes('404')) {
          span.setAttribute('role.granted', false);
          span.setStatus({ code: SpanStatusCode.OK });
          return false;
        }
        rbacErrorsCounter?.add(1, { operation: 'userHasRole', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

// Export a singleton instance of the RBAC service
export const rbacService = new RBACService();