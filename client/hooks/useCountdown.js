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

      // Normalize to camelCase while keeping snake_case aliases for existing consumers
      const mapped = {
        title: raw.title ?? 'Countdown zum SLAM25',
        subtitle: raw.subtitle ?? '28. Oktober 2025 • 12:00 Uhr (Berlin Zeit)',
        targetDate: raw.targetDate || raw.target_date || null,
        buttonText: raw.buttonText || raw.button_text || 'Zum Zeitplan',
        buttonEmoji: raw.buttonEmoji || raw.button_emoji || '📅',
        buttonLink: raw.buttonLink || raw.button_link || '/timetable',
        isActive: typeof raw.isActive === 'boolean' ? raw.isActive : (raw.is_active ?? false),
      };

      // Also expose snake_case for legacy reads (e.g., MemberDashboard uses target_date)
      return {
        ...mapped,
        target_date: mapped.targetDate,
        button_text: mapped.buttonText,
        button_emoji: mapped.buttonEmoji,
        button_link: mapped.buttonLink,
        is_active: mapped.isActive,
      };
    },
    staleTime: 1 * 60 * 1000, // 1 minute (countdown updates frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...getQueryConfig('countdown', false),
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
