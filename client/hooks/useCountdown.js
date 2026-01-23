import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';
import { getQueryConfig } from '../config/polling.js';

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
      const raw = result?.data || result || null;
      if (!raw) return null;

      // Return snake_case properties directly
      return {
        title: raw.title ?? 'Countdown zum SLAM25',
        subtitle: raw.subtitle ?? '28. Oktober 2025 • 12:00 Uhr (Berlin Zeit)',
        target_date: raw.target_date || null,
        button_text: raw.button_text || 'Zum Zeitplan',
        button_emoji: raw.button_emoji || '📅',
        button_link: raw.button_link || '/timetable',
        is_active: raw.is_active ?? false,
      };
    },
    // Use getQueryConfig FIRST, then override specific values
    ...getQueryConfig('countdown', false),
    staleTime: 10 * 60 * 1000,  // 10 minutes (override for consistent caching)
    gcTime: 20 * 60 * 1000,     // 20 minutes
    // refetchInterval from getQueryConfig will be 1 minute (CRITICAL)
  });
}

// Hook to update countdown data
export function useUpdateCountdown() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
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
