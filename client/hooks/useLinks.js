import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';
import { useEntityData } from './useEntityData.js';
import { getQueryConfig } from '../config/polling.js';
import logger from '../services/logger.js';
import { useToast } from '../contexts/ToastContext.jsx';

// Query keys for links
export const linksKeys = {
  all: ['links'],
  lists: () => [...linksKeys.all, 'list'],
  list: (filters) => [...linksKeys.lists(), { filters }],
  details: () => [...linksKeys.all, 'detail'],
  detail: (id) => [...linksKeys.details(), id],
};

// Hook to fetch all links
export function useLinks(filters = {}, isAdmin = false) {
  return useEntityData(
    'links',
    async () => {
      const response = await fetch(`${API_URL}/links`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch links: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || [];
    },
    { filters, ...getQueryConfig('links', isAdmin), isAdmin }
  );
}

// Hook to fetch a single link
export function useLink(id) {
  return useQuery({
    queryKey: linksKeys.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`${API_URL}/links/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch link: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || null;
    },
    enabled: !!id,
    ...getQueryConfig('links', false, { refetchInterval: false }), // Detail pages don't need polling
  });
}


// Hook to create a link
export function useCreateLink() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async (linkData) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/links`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(linkData)
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
        logger.error('Create link error', { error: error.message });
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidate all links-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: linksKeys.lists() });

      // If we have the created link data, add it to the cache
      if (data?.data) {
        queryClient.setQueryData(linksKeys.detail(data.data.id), data.data);
      }
    },
    onError: (error) => {
      logger.error('Create link mutation error', { error: error.message });
      showErrorToast('Fehler beim Erstellen des Links: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}

// Hook to update a link
export function useUpdateLink() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async ({ id, ...linkData }) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/links/${id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(linkData)
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
        logger.error('Update link error', { error: error.message });
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate all links-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: linksKeys.lists() });

      // Update the specific link in cache
      if (data?.data) {
        queryClient.setQueryData(linksKeys.detail(variables.id), data.data);
      }
    },
    onError: (error) => {
      logger.error('Update link mutation error', { error: error.message });
      showErrorToast('Fehler beim Aktualisieren des Links: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}

// Hook to delete a link
export function useDeleteLink() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async (id) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/links/${id}`,
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
        logger.error('Delete link error', { error: error.message });
        throw error;
      }
    },
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: linksKeys.detail(id) });

      // Invalidate all links-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: linksKeys.lists() });
    },
    onError: (error) => {
      logger.error('Delete link mutation error', { error: error.message });
      showErrorToast('Fehler beim Löschen des Links: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}
