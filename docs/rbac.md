# Role-Based Access Control (RBAC) System

## Overview

This document describes the Role-Based Access Control (RBAC) system implemented in the multi-tenant SaaS platform. The RBAC system provides a flexible and secure way to manage user permissions across the platform and organizations.

## Core Concepts

### Roles

The system defines three predefined roles:

1. **platform_admin**: Full control over the entire platform across all tenants
2. **org_admin**: Administrator for a specific organization with user management capabilities
3. **regular_user**: Standard user with no administrative privileges

Additional custom roles can be created by platform administrators.

### Permissions

Permissions follow the format `resource:action` and define what actions users can perform on specific resources. Examples include:
- `user:create` - Create new users
- `organization:read` - View organization information
- `billing:update` - Update billing information

### User-Role Assignments

Users can be assigned roles at two levels:
1. **Platform-wide**: Roles that apply across the entire platform
2. **Organization-specific**: Roles that apply only within a specific organization

## Database Schema

The RBAC system uses the following tables:

### organizations
Stores organization/tenant information:
- `id`: UUID (Primary Key)
- `name`: Organization name (unique)
- `description`: Organization description
- `slug`: Organization slug (unique identifier)
- `is_active`: Boolean indicating if the organization is active
- `created_at`: Timestamp
- `updated_at`: Timestamp

### roles
Stores role definitions:
- `id`: UUID (Primary Key)
- `name`: Role name (unique)
- `description`: Role description
- `is_system_role`: Boolean indicating if this is a predefined system role
- `created_at`: Timestamp
- `updated_at`: Timestamp

### permissions
Stores permission definitions:
- `id`: UUID (Primary Key)
- `name`: Permission name (unique, format: `resource:action`)
- `description`: Permission description
- `resource`: Resource this permission applies to
- `action`: Action this permission allows
- `created_at`: Timestamp
- `updated_at`: Timestamp

### role_permissions
Junction table mapping roles to permissions:
- `id`: UUID (Primary Key)
- `role_id`: Foreign key to roles table
- `permission_id`: Foreign key to permissions table
- `created_at`: Timestamp

### user_roles
Junction table mapping users to roles:
- `id`: UUID (Primary Key)
- `user_id`: Foreign key to auth.users table
- `role_id`: Foreign key to roles table
- `organization_id`: Foreign key to organizations (NULL for platform-wide roles)
- `created_at`: Timestamp
- `updated_at`: Timestamp

## API Endpoints

### Organization Management
- `POST /rbac/organizations` - Create a new organization (platform_admin only)
- `GET /rbac/organizations/{org_id}` - Get an organization by ID
- `GET /rbac/organizations` - Get all organizations
- `PUT /rbac/organizations/{org_id}` - Update an organization (platform_admin or org_admin only)
- `DELETE /rbac/organizations/{org_id}` - Delete an organization (platform_admin only)

### Role Management
- `POST /rbac/roles` - Create a new role (platform_admin only)
- `GET /rbac/roles/{role_id}` - Get a role by ID
- `GET /rbac/roles` - Get all roles
- `PUT /rbac/roles/{role_id}` - Update a role (platform_admin only)
- `DELETE /rbac/roles/{role_id}` - Delete a role (platform_admin only, cannot delete system roles)

### Permission Management
- `POST /rbac/permissions` - Create a new permission (platform_admin only)
- `GET /rbac/permissions/{permission_id}` - Get a permission by ID
- `GET /rbac/permissions` - Get all permissions
- `PUT /rbac/permissions/{permission_id}` - Update a permission (platform_admin only)
- `DELETE /rbac/permissions/{permission_id}` - Delete a permission (platform_admin only)

### Role-Permission Management
- `POST /rbac/role-permissions` - Assign a permission to a role (platform_admin only)
- `DELETE /rbac/role-permissions` - Remove a permission from a role (platform_admin only)
- `GET /rbac/roles/{role_id}/permissions` - Get all permissions assigned to a role

### User-Role Management
- `POST /rbac/user-roles` - Assign a role to a user
- `PUT /rbac/user-roles/{user_role_id}` - Update a user-role assignment
- `DELETE /rbac/user-roles/{user_role_id}` - Remove a role from a user
- `GET /rbac/users/{user_id}/roles` - Get all roles assigned to a user
- `GET /rbac/users/{user_id}/roles-with-permissions` - Get all roles with their permissions for a user

### Permission Checking
- `GET /rbac/users/{user_id}/has-permission/{permission_name}` - Check if a user has a specific permission
- `GET /rbac/users/{user_id}/has-role/{role_name}` - Check if a user has a specific role

## Frontend Implementation

### Services
The frontend includes a `rbac-service.ts` file that provides methods to interact with the RBAC API endpoints.

### Hooks
The `use-rbac.ts` hook provides React state management for RBAC data and actions.

### Components
The `RBACDashboard` component provides a user interface for managing roles, permissions, and user assignments.

## Security Considerations

1. **Row Level Security (RLS)**: All RBAC tables have RLS policies to ensure users can only access data they're authorized to view.

2. **Role-Based Access**: API endpoints check user roles before allowing operations:
   - Only platform administrators can create/update/delete roles and permissions
   - Only platform administrators or organization administrators can assign roles within their organization
   - Users can view their own roles and permissions

3. **Token Verification**: All API requests require a valid JWT token from Supabase Auth.

## Implementation Steps

1. **Database Setup**: Run the SQL schema in `rbac-schema.sql` to create the necessary tables and initial data.

2. **Backend Integration**: The RBAC service and routes are automatically included when starting the FastAPI application.

3. **Frontend Integration**: The RBAC dashboard is accessible through the main dashboard page.

## Testing

To test the RBAC system:

1. Create test users with different roles
2. Verify that users can only access functionality permitted by their roles
3. Test role assignment and permission checking endpoints
4. Ensure proper error handling for unauthorized access attempts

## Extending the System

To add new permissions:
1. Create new permission records in the `permissions` table
2. Assign the permissions to appropriate roles using the `role_permissions` table
3. Update frontend components to check for the new permissions where needed

To create custom roles:
1. Use the `POST /rbac/roles` endpoint to create a new role
2. Assign permissions to the role using the `POST /rbac/role-permissions` endpoint
3. Assign the role to users as needed