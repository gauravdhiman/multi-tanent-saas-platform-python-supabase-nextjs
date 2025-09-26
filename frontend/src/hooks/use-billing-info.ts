import { useQuery } from '@tanstack/react-query';
import { billingService } from '@/services/billing-service';

export function useBillingInfo(organizationId: string) {
  return useQuery({
    queryKey: ['billingInfo', organizationId],
    queryFn: async () => {
      const [subscription, creditBalance] = await Promise.all([
        billingService.getOrganizationSubscription(organizationId),
        billingService.getCreditBalance(organizationId),
      ]);
      return { subscription, creditBalance };
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}