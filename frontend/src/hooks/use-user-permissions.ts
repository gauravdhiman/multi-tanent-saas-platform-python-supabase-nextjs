import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';

interface UserPermissions {
  // Organization-level permissions
  canUpdateOrganization: boolean;
  canDeleteOrganization: boolean;
  canViewOrganization: boolean;

  // Member management permissions
  canManageMembers: boolean;
  canViewMembers: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;

  // Settings and configuration
  canUpdateSettings: boolean;
  canViewSettings: boolean;
  canManageBilling: boolean;

  // Platform-level permissions
  isPlatformAdmin: boolean;
  isOrgAdmin: boolean;
}

export function useUserPermissions(): UserPermissions {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  return useMemo(() => {
    if (!user || !currentOrganization) {
      return {
        canUpdateOrganization: false,
        canDeleteOrganization: false,
        canViewOrganization: false,
        canManageMembers: false,
        canViewMembers: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canUpdateSettings: false,
        canViewSettings: false,
        canManageBilling: false,
        isPlatformAdmin: false,
        isOrgAdmin: false
      };
    }

    try {
      const isPlatformAdmin = user.hasRole('platform_admin');
      const isOrgAdmin = user.hasRole('org_admin', currentOrganization.id);

      // Check role-based permissions (admin roles get all permissions)
      const roleBasedPermissions = {
        canUpdateOrganization: isPlatformAdmin || isOrgAdmin,
        canDeleteOrganization: isPlatformAdmin || isOrgAdmin,
        canViewOrganization: isPlatformAdmin || isOrgAdmin,
        canManageMembers: isPlatformAdmin || isOrgAdmin,
        canViewMembers: isPlatformAdmin || isOrgAdmin,
        canInviteMembers: isPlatformAdmin || isOrgAdmin,
        canRemoveMembers: isPlatformAdmin || isOrgAdmin,
        canUpdateSettings: isPlatformAdmin || isOrgAdmin,
        canViewSettings: isPlatformAdmin || isOrgAdmin,
        canManageBilling: isPlatformAdmin || isOrgAdmin,
        isPlatformAdmin,
        isOrgAdmin
      };

      // Check specific permissions for more granular control
      // This allows for roles with specific permissions rather than just admin roles
      const specificPermissions = {
        canUpdateOrganization: user.hasPermission('organization:update', currentOrganization.id) || roleBasedPermissions.canUpdateOrganization,
        canDeleteOrganization: user.hasPermission('organization:delete', currentOrganization.id) || roleBasedPermissions.canDeleteOrganization,
        canViewOrganization: user.hasPermission('organization:read', currentOrganization.id) || roleBasedPermissions.canViewOrganization,
        canManageMembers: user.hasPermission('member:manage', currentOrganization.id) || roleBasedPermissions.canManageMembers,
        canViewMembers: user.hasPermission('member:read', currentOrganization.id) || roleBasedPermissions.canViewMembers,
        canInviteMembers: user.hasPermission('member:invite', currentOrganization.id) || roleBasedPermissions.canInviteMembers,
        canRemoveMembers: user.hasPermission('member:remove', currentOrganization.id) || roleBasedPermissions.canRemoveMembers,
        canUpdateSettings: user.hasPermission('settings:update', currentOrganization.id) || roleBasedPermissions.canUpdateSettings,
        canViewSettings: user.hasPermission('settings:read', currentOrganization.id) || roleBasedPermissions.canViewSettings,
        canManageBilling: user.hasPermission('billing:manage', currentOrganization.id) || roleBasedPermissions.canManageBilling,
        isPlatformAdmin,
        isOrgAdmin
      };

      return specificPermissions;
    } catch (err) {
      console.error('Error checking user permissions:', err);

      // Environment-based fallback permissions
      const isDevelopment = process.env.NODE_ENV === 'development';

      return {
        canUpdateOrganization: isDevelopment, // Allow in dev for testing
        canDeleteOrganization: isDevelopment, // Allow in dev for testing
        canViewOrganization: isDevelopment,   // Allow in dev for testing
        canManageMembers: isDevelopment, // Allow in dev for testing
        canViewMembers: isDevelopment,   // Allow in dev for testing
        canInviteMembers: isDevelopment, // Allow in dev for testing
        canRemoveMembers: isDevelopment, // Allow in dev for testing
        canUpdateSettings: isDevelopment, // Allow in dev for testing
        canViewSettings: isDevelopment,   // Allow in dev for testing
        canManageBilling: isDevelopment, // Allow in dev for testing
        isPlatformAdmin: false,
        isOrgAdmin: false
      };
    }
  }, [user, currentOrganization]);
}
