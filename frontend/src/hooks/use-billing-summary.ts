import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/organization-context';
import { billingService } from '@/services/billing-service';
import type { OrganizationBillingSummary } from '@/types/billing';

export function useBillingSummary(orgId?: string) {
  const { currentOrganization } = useOrganization();

  // Use provided orgId, otherwise fall back to current organization
  const organizationId = orgId || currentOrganization?.id;

  return useQuery<OrganizationBillingSummary, Error>({
    queryKey: ['billing-summary', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('No organization selected');
      }
      return billingService.getBillingSummary(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
 });
}
