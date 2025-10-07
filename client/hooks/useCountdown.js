import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';

// Query keys for countdown
export const countdownKeys = {
  all: ['countdown'],
  current: () => [...countdownKeys.all, 'current'],
};

// Hook to fetch countdown data
export function useCountdown() {
  return useQuery({
    queryKey: countdownKeys.current(),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/countdown-config`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch countdown: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || null;
    },
    staleTime: 1 * 60 * 1000, // 1 minute (countdown updates frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for live countdown
  });
}

// Hook to update countdown data
export function useUpdateCountdown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (countdownData) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/countdown-config`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(countdownData)
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: countdownKeys.all });
    },
  });
}
