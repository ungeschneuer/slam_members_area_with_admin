import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';
import { useEntityData } from './useEntityData.js';
import { getQueryConfig } from '../config/polling.js';
import logger from '../services/logger.js';
import { useToast } from '../contexts/ToastContext.jsx';

// Query keys for schnellzugriff
export const schnellzugriffKeys = {
  all: ['schnellzugriff'],
  lists: () => [...schnellzugriffKeys.all, 'list'],
  list: (filters) => [...schnellzugriffKeys.lists(), { filters }],
  details: () => [...schnellzugriffKeys.all, 'detail'],
  detail: (id) => [...schnellzugriffKeys.details(), id],
};

// Hook to fetch all schnellzugriff links
export function useSchnellzugriff(filters = {}, isAdmin = false) {
  return useQuery({
    queryKey: schnellzugriffKeys.list(filters),
    queryFn: async () => {
      const endpoint = isAdmin ? '/schnellzugriff/admin/all' : '/schnellzugriff';
      const response = await fetch(`${API_URL}${endpoint}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch schnellzugriff links: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || [];
    },
    enabled: true,
    ...getQueryConfig('schnellzugriff', isAdmin),  // Add caching and polling config
  });
}

// Hook to fetch a single schnellzugriff link
export function useSchnellzugriffLink(id) {
  return useQuery({
    queryKey: schnellzugriffKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/schnellzugriff/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch schnellzugriff link: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || null;
    },
    enabled: !!id,
  });
}

// Hook to create a new schnellzugriff link
export function useCreateSchnellzugriff() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async (newLink) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/schnellzugriff`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newLink)
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
        logger.error('Create schnellzugriff error', { error: error.message });
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all schnellzugriff-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['schnellzugriff'] });
      queryClient.invalidateQueries({ queryKey: schnellzugriffKeys.all });
    },
    onError: (error) => {
      logger.error('Create schnellzugriff mutation error', { error: error.message });
      showErrorToast('Fehler beim Erstellen des Schnellzugriff-Links: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}

// Hook to update a schnellzugriff link
export function useUpdateSchnellzugriff() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async ({ id, ...updatedLink }) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/schnellzugriff/${id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedLink)
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
        logger.error('Update schnellzugriff error', { error: error.message });
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all schnellzugriff-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['schnellzugriff'] });
      queryClient.invalidateQueries({ queryKey: schnellzugriffKeys.all });
    },
    onError: (error) => {
      logger.error('Update schnellzugriff mutation error', { error: error.message });
      showErrorToast('Fehler beim Aktualisieren des Schnellzugriff-Links: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}

// Hook to delete a schnellzugriff link
export function useDeleteSchnellzugriff() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async (id) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/schnellzugriff/${id}`,
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
        logger.error('Delete schnellzugriff error', { error: error.message });
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all schnellzugriff-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['schnellzugriff'] });
      queryClient.invalidateQueries({ queryKey: schnellzugriffKeys.all });
    },
    onError: (error) => {
      logger.error('Delete schnellzugriff mutation error', { error: error.message });
      showErrorToast('Fehler beim Löschen des Schnellzugriff-Links: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}
