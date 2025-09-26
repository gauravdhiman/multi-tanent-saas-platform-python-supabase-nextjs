import { useQuery } from '@tanstack/react-query';
import { billingService } from '@/services/billing-service';
import type { CreditProduct } from '@/types/billing';

export function useCreditProducts() {
  return useQuery<CreditProduct[], Error>({
    queryKey: ['credit-products'],
    queryFn: () => billingService.getCreditProducts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}