/**
 * User-related type definitions
 */


// Core user interface
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// User with role information
export interface UserWithRole extends User {
  role?: {
    id: string;
    name: string;
    permissions: string[];
  };
}

// Organization member (matches backend schema)
export interface Member {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_verified: boolean;
  created_at: string;
  roles: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

// User role for organization page (extended with permissions)
export interface UserRoleWithPermissions {
  id: string;
  name: string;
  description: string | null;
  permissions: Array<{
    id: string;
    name: string;
    description: string | null;
    resource: string;
    action: string;
    created_at: string;
    updated_at: string;
  }>;
}