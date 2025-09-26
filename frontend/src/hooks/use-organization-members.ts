import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/organization-context';
import { organizationService } from '@/services/organization-service';
import type { Member } from '@/types/user';

export function useOrganizationMembers() {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['organization-members', currentOrganization?.id],
    queryFn: async (): Promise<Member[]> => {
      if (!currentOrganization) {
        return [];
      }

      const members = await organizationService.getOrganizationMembers(currentOrganization.id);
      
      // Transform the API response to match our Member type
      return members.map(member => ({
        id: member.id,
        email: member.email,
        first_name: member.first_name,
        last_name: member.last_name,
        is_verified: member.is_verified,
        created_at: member.created_at,
        roles: member.roles || []
      }));
    },
    enabled: !!currentOrganization,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}