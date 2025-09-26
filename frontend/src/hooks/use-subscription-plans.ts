import { useQuery } from '@tanstack/react-query';
import { billingService } from '@/services/billing-service';
import type { SubscriptionPlan } from '@/types/billing';

export function useSubscriptionPlans() {
  return useQuery<SubscriptionPlan[], Error>({
    queryKey: ['subscription-plans'],
    queryFn: () => billingService.getSubscriptionPlans(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}