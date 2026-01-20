import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../utils/apiWrapper.js';
import { SETTINGS_ENDPOINTS } from '../constants/apiEndpoints.js';

/**
 * Hook to fetch general settings (timezone, app name, etc.)
 */
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const result = await apiGet(SETTINGS_ENDPOINTS.BASE);
      return result?.data || result;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000,     // 20 minutes
  });
}
