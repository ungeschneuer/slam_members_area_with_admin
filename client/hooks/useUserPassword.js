import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../utils/apiWrapper.js';
import { SETTINGS_ENDPOINTS } from '../constants/apiEndpoints.js';

/**
 * Hook to check user password protection status
 */
export function useUserPasswordStatus() {
  return useQuery({
    queryKey: ['user-password-status'],
    queryFn: async () => {
      const result = await apiGet(SETTINGS_ENDPOINTS.USER_PASSWORD_STATUS);
      return result?.data || result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
}

/**
 * Hook to set user password
 */
export function useSetUserPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ password }) => {
      return await apiPost(SETTINGS_ENDPOINTS.USER_PASSWORD, { password });
    },
    onSuccess: () => {
      // Invalidate status query to refresh
      queryClient.invalidateQueries({ queryKey: ['user-password-status'] });
    },
  });
}
