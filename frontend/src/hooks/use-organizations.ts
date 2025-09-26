import { useQuery } from '@tanstack/react-query';
import { organizationService } from '@/services/organization-service';
import { useAuth } from '@/contexts/auth-context';
import type { Organization } from '@/types/organization';

// Custom hook for fetching user organizations with caching
export function useUserOrganizations() {
  const { isAuthenticated, user } = useAuth();

  return useQuery<Organization[], Error>({
    queryKey: ['user-organizations', user?.id],
    queryFn: () => organizationService.getUserOrganizations(),
    enabled: isAuthenticated && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (replaces deprecated cacheTime)
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

// Custom hook for fetching a specific organization by ID
export function useOrganizationById(orgId?: string) {
  const { isAuthenticated } = useAuth();

  return useQuery<Organization, Error>({
    queryKey: ['organization', orgId],
    queryFn: async () => {
      // Get all organizations and find the one we need
      // This reuses the cache from useUserOrganizations
      const allOrgs = await organizationService.getUserOrganizations();
      const org = allOrgs.find(o => o.id === orgId);
      if (!org) {
        throw new Error(`Organization with ID ${orgId} not found`);
      }
      return org;
    },
    enabled: isAuthenticated && !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}