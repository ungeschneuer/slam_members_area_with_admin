import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut } from '../utils/apiWrapper.js';
import { SETTINGS_ENDPOINTS } from '../constants/apiEndpoints.js';
import { createEntityQueryKeys, invalidateEntityQueries } from '../utils/queryKeyFactory.js';
import { getQueryConfig } from '../config/polling.js';

// Query keys for dashboard settings
export const dashboardSettingsKeys = createEntityQueryKeys('dashboard-settings');

// Hook to fetch dashboard text settings
export function useDashboardSettings() {
  return useQuery({
    queryKey: dashboardSettingsKeys.lists(),
    queryFn: async () => {
      const result = await apiGet(SETTINGS_ENDPOINTS.DASHBOARD_TEXT);
      const raw = result?.data || result || null;
      if (!raw) return null;

      // Return with fallback defaults
      return {
        heading: raw.heading || 'Willkommen bei SLAM25',
        subtitle: raw.subtitle || 'Dein Poetry Slam Community Hub',
        description: raw.description || 'Entdecke Teilnehmer*innen, verfolge Runden, lies Tipps und bleibe mit der Poetry Slam Community verbunden.'
      };
    },
    ...getQueryConfig('dashboard-settings', false),
    staleTime: 10 * 60 * 1000,  // 10 minutes
    gcTime: 20 * 60 * 1000,     // 20 minutes
  });
}

// Hook to update dashboard text settings
export function useUpdateDashboardSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settingsData) => {
      return await apiPut(SETTINGS_ENDPOINTS.DASHBOARD_TEXT, settingsData);
    },
    onSuccess: () => {
      invalidateEntityQueries(queryClient, 'dashboard-settings');
    },
  });
}
