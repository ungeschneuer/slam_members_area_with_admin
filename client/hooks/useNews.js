import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';

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
export function useNews(filters = {}) {
  return useQuery({
    queryKey: newsKeys.list(filters),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/news`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to fetch a single news item by slug
export function useNewsItem(slug) {
  return useQuery({
    queryKey: newsKeys.detail(slug),
    queryFn: async () => {
      if (!slug) return null;
      const response = await fetch(`${API_URL}/news/slug/${slug}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch news item: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || null;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
      return result?.data || result || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (breaking news should be fresher)
    gcTime: 5 * 60 * 1000, // 5 minutes
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
      // Invalidate and refetch news list
      queryClient.invalidateQueries({ queryKey: newsKeys.lists() });
      
      // If we have the created news data, add it to the cache
      if (data?.data) {
        queryClient.setQueryData(newsKeys.detail(data.data.id), data.data);
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
      // Invalidate and refetch news list
      queryClient.invalidateQueries({ queryKey: newsKeys.lists() });
      
      // Update the specific news item in cache
      if (data?.data) {
        queryClient.setQueryData(newsKeys.detail(variables.id), data.data);
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
      
      // Invalidate and refetch news list
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
