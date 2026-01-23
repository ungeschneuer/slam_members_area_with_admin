import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';
import { useEntityData } from './useEntityData.js';
import { getQueryConfig } from '../config/polling.js';
import logger from '../services/logger.js';
import { useToast } from '../contexts/ToastContext.jsx';

// Query keys for info pages
export const infoPagesKeys = {
  all: ['info-pages'],
  lists: () => [...infoPagesKeys.all, 'list'],
  list: (filters) => [...infoPagesKeys.lists(), { filters }],
  details: () => [...infoPagesKeys.all, 'detail'],
  detail: (id) => [...infoPagesKeys.details(), id],
  bySlug: (slug) => [...infoPagesKeys.details(), 'slug', slug],
};

// Hook to fetch all info pages (ADMIN ONLY - includes drafts)
export function useInfoPages(filters = {}, isAdmin = false) {
  return useEntityData(
    'info-pages',
    async () => {
      const response = await fetch(`${API_URL}/info-pages`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch info pages: ${response.statusText}`);
      }
      const result = await response.json();
      // Handle nested data structure or direct array
      const data = result?.data?.rows || result?.data || result || [];
      return Array.isArray(data) ? data : [];
    },
    { filters, ...getQueryConfig('infoPages', isAdmin), isAdmin }
  );
}

// Hook to fetch only published info pages (USER VIEW)
export function usePublishedInfoPages(filters = {}) {
  return useEntityData(
    'info-pages-published',
    async () => {
      const response = await fetch(`${API_URL}/info-pages/published`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch published info pages: ${response.statusText}`);
      }
      const result = await response.json();
      // Handle nested data structure or direct array
      const data = result?.data?.rows || result?.data || result || [];
      return Array.isArray(data) ? data : [];
    },
    { filters, ...getQueryConfig('infoPages', false), isAdmin: false }
  );
}

// Hook to fetch a single info page by ID
export function useInfoPage(id) {
  return useQuery({
    queryKey: infoPagesKeys.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`${API_URL}/info-pages/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch info page: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || null;
    },
    enabled: !!id,
    ...getQueryConfig('infoPages', false, { refetchInterval: false }), // Detail pages don't need polling
  });
}

// Hook to fetch an info page by slug
export function useInfoPageBySlug(slug) {
  return useQuery({
    queryKey: infoPagesKeys.bySlug(slug),
    queryFn: async () => {
      if (!slug) return null;
      const response = await fetch(`${API_URL}/info-pages/${slug}`, {
        credentials: 'include'
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Failed to fetch info page: ${response.statusText}`);
      const result = await response.json();
      // Handle nested data structure or direct object
      const data = result?.data?.rows?.[0] || result?.data || result || null;
      return data;
    },
    enabled: !!slug,
    ...getQueryConfig('infoPages', false, { refetchInterval: false }), // Detail pages don't need polling
  });
}

// Hook to create an info page
export function useCreateInfoPage() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    mutationFn: async (infoPageData) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/info-pages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(infoPageData)
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
        logger.error('Create info page error', { error: error.message });
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidate all info-pages-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['info-pages'] });
      queryClient.invalidateQueries({ queryKey: infoPagesKeys.lists() });
      // Also invalidate the specific query used by useEntityData
      queryClient.invalidateQueries({ queryKey: ['info-pages', {}] });
      // Invalidate ALL queries that start with 'info-pages' (more aggressive)
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'info-pages' });

      // If we have the created info page data, add it to the cache
      if (data?.data) {
        queryClient.setQueryData(infoPagesKeys.detail(data.data.id), data.data);
        if (data.data.slug) {
          queryClient.setQueryData(infoPagesKeys.bySlug(data.data.slug), data.data);
        }
      }
    },
    onError: (error) => {
      logger.error('Create info page mutation error', { error: error.message });
      showErrorToast('Fehler beim Erstellen der Infoseite: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}

// Hook to update an info page
export function useUpdateInfoPage() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...infoPageData }) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/info-pages/${id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(infoPageData)
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
        logger.error('Update info page error', { error: error.message });
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate all info-pages-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['info-pages'] });
      queryClient.invalidateQueries({ queryKey: infoPagesKeys.lists() });
      // Also invalidate the specific query used by useEntityData
      queryClient.invalidateQueries({ queryKey: ['info-pages', {}] });

      // Update the specific info page in cache
      if (data?.data) {
        queryClient.setQueryData(infoPagesKeys.detail(variables.id), data.data);
        if (data.data.slug) {
          queryClient.setQueryData(infoPagesKeys.bySlug(data.data.slug), data.data);
        }
      }
    },
    onError: (error) => {
      logger.error('Update info page mutation error', { error: error.message });
      showErrorToast('Fehler beim Aktualisieren der Infoseite: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}

// Hook to delete an info page
export function useDeleteInfoPage() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    mutationFn: async (id) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/info-pages/${id}`,
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
        logger.error('Delete info page error', { error: error.message });
        throw error;
      }
    },
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: infoPagesKeys.detail(id) });

      // Invalidate all info-pages-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['info-pages'] });
      queryClient.invalidateQueries({ queryKey: infoPagesKeys.lists() });
      // Also invalidate the specific query used by useEntityData
      queryClient.invalidateQueries({ queryKey: ['info-pages', {}] });
    },
    onError: (error) => {
      logger.error('Delete info page mutation error', { error: error.message });
      showErrorToast('Fehler beim Löschen der Infoseite: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}
