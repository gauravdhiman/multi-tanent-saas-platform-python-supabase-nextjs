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
