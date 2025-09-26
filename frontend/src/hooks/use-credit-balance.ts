import { useQuery } from '@tanstack/react-query';
import { billingService } from '@/services/billing-service';
import type { CreditBalance } from '@/types/billing';
import { useOrganization } from '@/contexts/organization-context';

export function useCreditBalance() {
  const { currentOrganization } = useOrganization();

  return useQuery<CreditBalance, Error>({
    queryKey: ['credit-balance', currentOrganization?.id],
    queryFn: () => {
      if (!currentOrganization?.id) {
        throw new Error('Organization ID is not available');
      }
      return billingService.getCreditBalance(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}