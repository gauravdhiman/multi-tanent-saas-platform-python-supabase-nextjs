import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { UserRoleAssignment } from '@/types/rbac';
import type { ApiResponse } from '@/types/api';

interface UserProfileResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: UserRoleAssignment[];
}

export function useUserProfile(userId?: string) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async (): Promise<UserRoleAssignment[]> => {
      if (!userId) {
        throw new Error('User ID required');
      }
      
      const response: ApiResponse<UserProfileResponse> = await apiClient.get(`/auth/me`);
      return response.data?.roles || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (replaces deprecated cacheTime)
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}