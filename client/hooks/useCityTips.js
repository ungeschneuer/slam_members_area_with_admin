import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';
import { useEntityData } from './useEntityData.js';
import { getQueryConfig } from '../config/polling.js';
import logger from '../services/logger.js';
import { useToast } from '../contexts/ToastContext.jsx';

// Query keys for city tips
export const cityTipsKeys = {
  all: ['city-tips'],
  lists: () => [...cityTipsKeys.all, 'list'],
  list: (filters) => [...cityTipsKeys.lists(), { filters }],
  details: () => [...cityTipsKeys.all, 'detail'],
  detail: (id) => [...cityTipsKeys.details(), id],
  bySlug: (slug) => [...cityTipsKeys.details(), 'slug', slug],
};

// Hook to fetch all city tips
export function useCityTips(filters = {}, isAdmin = false) {
  return useEntityData(
    'city-tips',
    async () => {
      const response = await fetch(`${API_URL}/city-tips`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch city tips: ${response.statusText}`);
      }
      const result = await response.json();
      // Handle nested data structure or direct array
      const data = result?.data?.data?.rows || result?.data?.rows || result?.data || result;
      return Array.isArray(data) ? data : [];
    },
    { filters, ...getQueryConfig('cityTips', isAdmin), isAdmin }
  );
}

// Hook to fetch a single city tip by ID
export function useCityTip(id) {
  return useQuery({
    queryKey: cityTipsKeys.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`${API_URL}/city-tips/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch city tip: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || null;
    },
    enabled: !!id,
    ...getQueryConfig('cityTips', false, { refetchInterval: false }), // Detail pages don't need polling
  });
}

// Hook to fetch a city tip by slug
export function useCityTipBySlug(slug) {
  return useQuery({
    queryKey: cityTipsKeys.bySlug(slug),
    queryFn: async () => {
      if (!slug) return null;
      const response = await fetch(`${API_URL}/city-tips/${slug}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch city tip: ${response.statusText}`);
      }
      const result = await response.json();
      // The API sends the city tip directly in result.data
      return result?.data || null;
    },
    enabled: !!slug,
    ...getQueryConfig('cityTips', false, { refetchInterval: false }), // Detail pages don't need polling
  });
}

// Hook to create a city tip
export function useCreateCityTip() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async (cityTipData) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/city-tips`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cityTipData)
          }
        );

        const result = await response.json().catch(() => {
          throw new Error('Ungültige Serverantwort');
        });

        if (!result.success && result.error) {
          throw new Error(result.error);
        }

        return result?.data || result;
      } catch (error) {
        logger.error('Create city tip error', { error: error.message });
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidate all city-tips-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['city-tips'] });
      queryClient.invalidateQueries({ queryKey: cityTipsKeys.lists() });

      // If we have the created city tip data, add it to the cache
      if (data?.data) {
        queryClient.setQueryData(cityTipsKeys.detail(data.data.id), data.data);
        if (data.data.slug) {
          queryClient.setQueryData(cityTipsKeys.bySlug(data.data.slug), data.data);
        }
      }
    },
    onError: (error) => {
      logger.error('Create city tip mutation error', { error: error.message });
      showErrorToast('Fehler beim Erstellen des Stadttipps: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}

// Hook to update a city tip
export function useUpdateCityTip() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async ({ id, ...cityTipData }) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/city-tips/${id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cityTipData)
          }
        );

        const result = await response.json().catch(() => {
          throw new Error('Ungültige Serverantwort');
        });

        if (!result.success && result.error) {
          throw new Error(result.error);
        }

        return result?.data || result;
      } catch (error) {
        logger.error('Update city tip error', { error: error.message });
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate all city-tips-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['city-tips'] });
      queryClient.invalidateQueries({ queryKey: cityTipsKeys.lists() });

      // Update the specific city tip in cache
      if (data?.data) {
        queryClient.setQueryData(cityTipsKeys.detail(variables.id), data.data);
        if (data.data.slug) {
          queryClient.setQueryData(cityTipsKeys.bySlug(data.data.slug), data.data);
        }
      }
    },
    onError: (error) => {
      logger.error('Update city tip mutation error', { error: error.message });
      showErrorToast('Fehler beim Aktualisieren des Stadttipps: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}

// Hook to delete a city tip
export function useDeleteCityTip() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async (id) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/city-tips/${id}`,
          {
            method: 'DELETE'
          }
        );

        const result = await response.json().catch(() => {
          throw new Error('Ungültige Serverantwort');
        });

        if (!result.success && result.error) {
          throw new Error(result.error);
        }

        return result?.data || result;
      } catch (error) {
        logger.error('Delete city tip error', { error: error.message });
        throw error;
      }
    },
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: cityTipsKeys.detail(id) });

      // Invalidate all city-tips-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['city-tips'] });
      queryClient.invalidateQueries({ queryKey: cityTipsKeys.lists() });
    },
    onError: (error) => {
      logger.error('Delete city tip mutation error', { error: error.message });
      showErrorToast('Fehler beim Löschen des Stadttipps: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}
