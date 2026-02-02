import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';
import { useEntityData } from './useEntityData.js';
import { getQueryConfig } from '../config/polling.js';
import logger from '../services/logger.js';
import { useToast } from '../contexts/ToastContext.jsx';

// Query keys for news
export const newsKeys = {
  all: ['news'],
  lists: () => [...newsKeys.all, 'list'],
  list: (filters) => [...newsKeys.lists(), { filters }],
  details: () => [...newsKeys.all, 'detail'],
  detail: (id) => [...newsKeys.details(), id],
  breaking: () => [...newsKeys.all, 'breaking'],
};

// Hook to fetch all news
export function useNews(filters = {}, isAdmin = false) {
  return useEntityData(
    'news',
    async () => {
      const response = await fetch(`${API_URL}/news`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.statusText}`);
      }
      const result = await response.json();
      // Handle nested data structure or direct array
      const data = result?.data?.data?.rows || result?.data?.rows || result?.data || result;
      return Array.isArray(data) ? data : [];
    },
    { filters, ...getQueryConfig('news', isAdmin), isAdmin }
  );
}

// Hook to fetch a single news item by slug
export function useNewsItem(slug) {
  return useQuery({
    queryKey: newsKeys.detail(slug),
    queryFn: async () => {
      if (!slug) return null;
      const response = await fetch(`${API_URL}/news/${slug}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch news item: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || null;
    },
    enabled: !!slug,
    ...getQueryConfig('news', false, { refetchInterval: false }), // Detail pages don't need polling
  });
}

// Hook to fetch breaking news
export function useBreakingNews() {
  return useQuery({
    queryKey: newsKeys.breaking(),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/breaking-news`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch breaking news: ${response.statusText}`);
      }
      const result = await response.json();
      const data = result?.data || result || [];
      // Return the first breaking news item or null if none
      return Array.isArray(data) ? data[0] || null : data;
    },
    ...getQueryConfig('breakingNews', false),
  });
}

// Hook to create a news item
export function useCreateNews() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async (newsData) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/news`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newsData)
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
        logger.error('Create news error', { error: error.message });
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidate all news-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['news'] });
      queryClient.invalidateQueries({ queryKey: newsKeys.lists() });

      // If we have the created news data, add it to the cache
      if (data && data.id) {
        queryClient.setQueryData(newsKeys.detail(data.id), data);
      }
    },
    onError: (error) => {
      logger.error('Create news mutation error', { error: error.message });
      showErrorToast('Fehler beim Erstellen der News: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}

// Hook to update a news item
export function useUpdateNews() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async ({ id, ...newsData }) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/news/${id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newsData)
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
        logger.error('Update news error', { error: error.message });
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate all news-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['news'] });
      queryClient.invalidateQueries({ queryKey: newsKeys.lists() });

      // Update the specific news item in cache
      if (data && data.id) {
        queryClient.setQueryData(newsKeys.detail(variables.id), data);
      }
    },
    onError: (error) => {
      logger.error('Update news mutation error', { error: error.message });
      showErrorToast('Fehler beim Aktualisieren der News: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}

// Hook to delete a news item
export function useDeleteNews() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async (id) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/news/${id}`,
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
        logger.error('Delete news error', { error: error.message });
        throw error;
      }
    },
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: newsKeys.detail(id) });

      // Invalidate all news-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['news'] });
      queryClient.invalidateQueries({ queryKey: newsKeys.lists() });
    },
    onError: (error) => {
      logger.error('Delete news mutation error', { error: error.message });
      showErrorToast('Fehler beim Löschen der News: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}

// Hook to create breaking news
export function useCreateBreakingNews() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async (breakingNewsData) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/breaking-news/${breakingNewsData.id}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(breakingNewsData)
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
        logger.error('Create breaking news error', { error: error.message });
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate both news and breaking news
      queryClient.invalidateQueries({ queryKey: newsKeys.all });
    },
    onError: (error) => {
      logger.error('Create breaking news mutation error', { error: error.message });
      showErrorToast('Fehler beim Erstellen der Eilmeldung: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}

// Hook to update breaking news
export function useUpdateBreakingNews() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async ({ id, ...breakingNewsData }) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/breaking-news/${id}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(breakingNewsData)
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
        logger.error('Update breaking news error', { error: error.message });
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate both news and breaking news
      queryClient.invalidateQueries({ queryKey: newsKeys.all });
    },
    onError: (error) => {
      logger.error('Update breaking news mutation error', { error: error.message });
      showErrorToast('Fehler beim Aktualisieren der Eilmeldung: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}

// Hook to delete breaking news
export function useDeleteBreakingNews() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async () => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/breaking-news`,
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
        logger.error('Delete breaking news error', { error: error.message });
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate both news and breaking news
      queryClient.invalidateQueries({ queryKey: newsKeys.all });
    },
    onError: (error) => {
      logger.error('Delete breaking news mutation error', { error: error.message });
      showErrorToast('Fehler beim Löschen der Eilmeldung: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}
