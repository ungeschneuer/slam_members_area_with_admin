import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/apiWrapper.js';
import { NEWS_ENDPOINTS, BREAKING_NEWS_ENDPOINTS } from '../constants/apiEndpoints.js';
import {
  createEntityQueryKeys,
  invalidateEntityQueries,
  createOnSuccessHandler,
  updateOnSuccessHandler,
  deleteOnSuccessHandler
} from '../utils/queryKeyFactory.js';
import { useEntityData } from './useEntityData.js';
import { getQueryConfig } from '../config/polling.js';

// Query keys for news
export const newsKeys = createEntityQueryKeys('news');

// Breaking news keys (special case)
export const breakingNewsKeys = {
  all: ['breaking-news'],
  lists: () => [...breakingNewsKeys.all, 'list'],
  detail: (id) => [...breakingNewsKeys.all, 'detail', id]
};

// Hook to fetch all news
export function useNews(filters = {}, isAdmin = false) {
  return useEntityData(
    'news',
    async () => {
      return await apiGet(NEWS_ENDPOINTS.BASE);
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
      return await apiGet(NEWS_ENDPOINTS.BY_SLUG(slug));
    },
    enabled: !!slug,
    ...getQueryConfig('news', false, { refetchInterval: false }), // Detail pages don't need polling
  });
}

// Hook to fetch breaking news
export function useBreakingNews() {
  return useQuery({
    queryKey: breakingNewsKeys.lists(),
    queryFn: async () => {
      const data = await apiGet(BREAKING_NEWS_ENDPOINTS.BASE);
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
      return await apiPost(NEWS_ENDPOINTS.BASE, newsData);
    },
    onSuccess: (data) => {
      // Use factory helper for standardized invalidation
      createOnSuccessHandler(queryClient, 'news')(data);
    },
  });
}

// Hook to update a news item
export function useUpdateNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...newsData }) => {
      return await apiPut(NEWS_ENDPOINTS.BY_ID(id), newsData);
    },
    onSuccess: (data, variables) => {
      // Use factory helper for standardized invalidation
      updateOnSuccessHandler(queryClient, 'news')(data);

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
      return await apiDelete(NEWS_ENDPOINTS.BY_ID(id));
    },
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: newsKeys.detail(id) });

      // Use factory helper for standardized invalidation
      deleteOnSuccessHandler(queryClient, 'news')();
    },
  });
}

// Hook to create breaking news
export function useCreateBreakingNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (breakingNewsData) => {
      return await apiPost(
        NEWS_ENDPOINTS.CREATE_BREAKING_NEWS(breakingNewsData.id),
        breakingNewsData
      );
    },
    onSuccess: () => {
      // Invalidate both news and breaking news
      invalidateEntityQueries(queryClient, 'news');
      queryClient.invalidateQueries({ queryKey: breakingNewsKeys.all });
    },
  });
}

// Hook to update breaking news
export function useUpdateBreakingNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...breakingNewsData }) => {
      return await apiPost(BREAKING_NEWS_ENDPOINTS.BY_ID(id), breakingNewsData);
    },
    onSuccess: () => {
      // Invalidate both news and breaking news
      invalidateEntityQueries(queryClient, 'news');
      queryClient.invalidateQueries({ queryKey: breakingNewsKeys.all });
    },
  });
}

// Hook to delete breaking news
export function useDeleteBreakingNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      return await apiDelete(BREAKING_NEWS_ENDPOINTS.BASE);
    },
    onSuccess: () => {
      // Invalidate both news and breaking news
      invalidateEntityQueries(queryClient, 'news');
      queryClient.invalidateQueries({ queryKey: breakingNewsKeys.all });
    },
  });
}
