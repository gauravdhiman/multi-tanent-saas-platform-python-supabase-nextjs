import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/organization-context';
import { billingService } from '@/services/billing-service';
import type { OrganizationBillingSummary } from '@/types/billing';

export function useBillingSummary() {
  const { currentOrganization } = useOrganization();

  return useQuery<OrganizationBillingSummary, Error>({
    queryKey: ['billing-summary', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }
      return billingService.getBillingSummary(currentOrganization.id);
    },
    enabled: !!currentOrganization,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}