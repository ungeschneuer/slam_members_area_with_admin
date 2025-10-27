import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';
import { getQueryConfig } from '../config/polling.js';

// Query keys for dashboard settings
export const dashboardSettingsKeys = {
  all: ['dashboard-settings'],
  current: () => [...dashboardSettingsKeys.all, 'current'],
};

// Hook to fetch dashboard text settings
export function useDashboardSettings() {
  return useQuery({
    queryKey: dashboardSettingsKeys.current(),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/settings/dashboard-text`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard settings: ${response.statusText}`);
      }
      const result = await response.json();
      const raw = result?.data || result || null;
      if (!raw) return null;

      // Return with fallback defaults
      return {
        heading: raw.heading || 'Willkommen bei SLAM25',
        subtitle: raw.subtitle || 'Dein Poetry Slam Community Hub',
        description: raw.description || 'Entdecke Teilnehmer*innen, verfolge Runden, lies Tipps und bleibe mit der Poetry Slam Community verbunden.'
      };
    },
    // Use getQueryConfig FIRST, then override specific values
    ...getQueryConfig('dashboard-settings', false),
    staleTime: 10 * 60 * 1000,  // 10 minutes (override for consistent caching)
    gcTime: 20 * 60 * 1000,     // 20 minutes
    // refetchInterval from getQueryConfig will be 5 minutes (SETTINGS)
  });
}

// Hook to update dashboard text settings
export function useUpdateDashboardSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settingsData) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/settings/dashboard-text`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settingsData)
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardSettingsKeys.all });
    },
  });
}
