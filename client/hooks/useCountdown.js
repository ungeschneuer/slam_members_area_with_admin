import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut } from '../utils/apiWrapper.js';
import { COUNTDOWN_ENDPOINTS } from '../constants/apiEndpoints.js';
import { createEntityQueryKeys, invalidateEntityQueries } from '../utils/queryKeyFactory.js';
import { getQueryConfig } from '../config/polling.js';

// Query keys for countdown
export const countdownKeys = createEntityQueryKeys('countdown');

// Hook to fetch countdown data
export function useCountdown() {
  return useQuery({
    queryKey: countdownKeys.lists(),
    queryFn: async () => {
      const result = await apiGet(COUNTDOWN_ENDPOINTS.BASE);
      const raw = result?.data || result || null;
      if (!raw) return null;

      // Return snake_case properties directly with fallback defaults
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
    ...getQueryConfig('countdown', false),
    staleTime: 10 * 60 * 1000,  // 10 minutes
    gcTime: 20 * 60 * 1000,     // 20 minutes
  });
}

// Hook to update countdown data
export function useUpdateCountdown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (countdownData) => {
      return await apiPut(COUNTDOWN_ENDPOINTS.BASE, countdownData);
    },
    onSuccess: () => {
      invalidateEntityQueries(queryClient, 'countdown');
    },
  });
}
