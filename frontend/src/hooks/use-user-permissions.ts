import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';

interface UserPermissions {
  canManageMembers: boolean;
  canViewMembers: boolean;
  isPlatformAdmin: boolean;
  isOrgAdmin: boolean;
}

export function useUserPermissions(): UserPermissions {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  return useMemo(() => {
    if (!user || !currentOrganization) {
      return {
        canManageMembers: false,
        canViewMembers: false,
        isPlatformAdmin: false,
        isOrgAdmin: false
      };
    }

    try {
      const isPlatformAdmin = user.hasRole('platform_admin');
      const isOrgAdmin = user.hasRole('org_admin', currentOrganization.id);
      
      return {
        canManageMembers: isPlatformAdmin || isOrgAdmin,
        canViewMembers: isPlatformAdmin || isOrgAdmin,
        isPlatformAdmin,
        isOrgAdmin
      };
    } catch (err) {
      console.error('Error checking user permissions:', err);
      
      // Environment-based fallback permissions
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      return {
        canManageMembers: isDevelopment, // Allow in dev for testing
        canViewMembers: isDevelopment,   // Allow in dev for testing
        isPlatformAdmin: false,
        isOrgAdmin: false
      };
    }
  }, [user, currentOrganization]);
}