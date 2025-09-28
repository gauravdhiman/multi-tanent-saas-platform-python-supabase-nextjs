import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { organizationService } from '@/services/organization-service';
import type { Organization } from '@/types/organization';

/**
 * Custom hook to validate organization access by ID
 * This hook directly validates the organization with the backend
 * instead of checking against the user's organization list
 * Uses React Query for caching and to avoid duplicate API calls
 */
export function useOrganizationById(orgId?: string | null) {
  const { isAuthenticated } = useAuth();

  // Direct API call to validate organization access
  const validateOrganization = async (): Promise<Organization> => {
    if (!orgId) {
      throw new Error('Organization ID is required');
    }

    try {
      // This will call the backend GET /organizations/{org_id} endpoint
      // which validates the user has access to this organization
      const org = await organizationService.getOrganizationById(orgId);
      return org;
    } catch (err) {
      // If the API call fails, it means the user doesn't have access
      // or the organization doesn't exist
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate organization';
      throw new Error(errorMessage);
    }
  };

  // Use React Query for caching and automatic refetching
 const { data, isLoading, isError, error: queryError, refetch, isFetching } = useQuery({
    queryKey: ['organization-by-id', orgId],
    queryFn: validateOrganization,
    enabled: isAuthenticated && !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });

  return {
    isValid: isError ? false : !!data,
    loading: isLoading || isFetching,
    error: isError ? (queryError instanceof Error ? queryError.message : 'Organization validation failed') : null,
    organization: data || null,
    refetch,
  };
}
