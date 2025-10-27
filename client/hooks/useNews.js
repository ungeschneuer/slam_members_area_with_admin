import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';
import { useEntityData } from './useEntityData.js';
import { getQueryConfig } from '../config/polling.js';

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
  
  return useMutation({
    mutationFn: async (newsData) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/news`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newsData)
        }
      );
      const result = await response.json();
      return result?.data || result;
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
  });
}

// Hook to update a news item
export function useUpdateNews() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...newsData }) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/news/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newsData)
        }
      );
      const result = await response.json();
      return result?.data || result;
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
  });
}

// Hook to delete a news item
export function useDeleteNews() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/news/${id}`,
        {
          method: 'DELETE'
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: newsKeys.detail(id) });
      
      // Invalidate all news-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['news'] });
      queryClient.invalidateQueries({ queryKey: newsKeys.lists() });
    },
  });
}

// Hook to create breaking news
export function useCreateBreakingNews() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (breakingNewsData) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/breaking-news/${breakingNewsData.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(breakingNewsData)
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: () => {
      // Invalidate both news and breaking news
      queryClient.invalidateQueries({ queryKey: newsKeys.all });
    },
  });
}

// Hook to update breaking news
export function useUpdateBreakingNews() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...breakingNewsData }) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/breaking-news/${id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(breakingNewsData)
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: () => {
      // Invalidate both news and breaking news
      queryClient.invalidateQueries({ queryKey: newsKeys.all });
    },
  });
}

// Hook to delete breaking news
export function useDeleteBreakingNews() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/breaking-news`,
        {
          method: 'DELETE'
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: () => {
      // Invalidate both news and breaking news
      queryClient.invalidateQueries({ queryKey: newsKeys.all });
    },
  });
}
