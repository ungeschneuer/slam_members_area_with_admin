import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/apiWrapper.js';
import { INFO_PAGES_ENDPOINTS } from '../constants/apiEndpoints.js';
import {
  createEntityQueryKeys,
  createOnSuccessHandler,
  updateOnSuccessHandler,
  deleteOnSuccessHandler,
  invalidateEntityQueries
} from '../utils/queryKeyFactory.js';
import { useEntityData } from './useEntityData.js';
import { getQueryConfig } from '../config/polling.js';

// Query keys for info pages
export const infoPagesKeys = createEntityQueryKeys('info-pages');

// Add custom bySlug query key
infoPagesKeys.bySlug = (slug) => [...infoPagesKeys.details(), 'slug', slug];

// Hook to fetch all info pages (ADMIN ONLY - includes drafts)
export function useInfoPages(filters = {}, isAdmin = false) {
  return useEntityData(
    'info-pages',
    async () => {
      return await apiGet(INFO_PAGES_ENDPOINTS.BASE);
    },
    { filters, ...getQueryConfig('infoPages', isAdmin), isAdmin }
  );
}

// Hook to fetch only published info pages (USER VIEW)
export function usePublishedInfoPages(filters = {}) {
  return useEntityData(
    'info-pages-published',
    async () => {
      return await apiGet(INFO_PAGES_ENDPOINTS.PUBLISHED);
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
      return await apiGet(INFO_PAGES_ENDPOINTS.BY_ID(id));
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
      try {
        const result = await apiGet(INFO_PAGES_ENDPOINTS.BY_SLUG(slug));
        // Handle nested data structure or direct object
        return result?.rows?.[0] || result || null;
      } catch (error) {
        // Return null for 404 errors
        if (error.status === 404) return null;
        throw error;
      }
    },
    enabled: !!slug,
    ...getQueryConfig('infoPages', false, { refetchInterval: false }), // Detail pages don't need polling
  });
}

// Hook to create an info page
export function useCreateInfoPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (infoPageData) => {
      return await apiPost(INFO_PAGES_ENDPOINTS.BASE, infoPageData);
    },
    onSuccess: (data) => {
      // Use optimized factory helper (no need for expensive predicate)
      invalidateEntityQueries(queryClient, 'info-pages');
      invalidateEntityQueries(queryClient, 'info-pages-published');

      // Set cache for detail and bySlug
      if (data?.data) {
        queryClient.setQueryData(infoPagesKeys.detail(data.data.id), data.data);
        if (data.data.slug) {
          queryClient.setQueryData(infoPagesKeys.bySlug(data.data.slug), data.data);
        }
      } else if (data?.id) {
        queryClient.setQueryData(infoPagesKeys.detail(data.id), data);
        if (data.slug) {
          queryClient.setQueryData(infoPagesKeys.bySlug(data.slug), data);
        }
      }
    },
  });
}

// Hook to update an info page
export function useUpdateInfoPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...infoPageData }) => {
      return await apiPut(INFO_PAGES_ENDPOINTS.BY_ID(id), infoPageData);
    },
    onSuccess: (data, variables) => {
      // Use optimized factory helper
      updateOnSuccessHandler(queryClient, 'info-pages')(data);
      invalidateEntityQueries(queryClient, 'info-pages-published');

      // Update the specific info page in cache
      if (data?.data) {
        queryClient.setQueryData(infoPagesKeys.detail(variables.id), data.data);
        if (data.data.slug) {
          queryClient.setQueryData(infoPagesKeys.bySlug(data.data.slug), data.data);
        }
      } else if (data?.id && variables.id) {
        queryClient.setQueryData(infoPagesKeys.detail(variables.id), data);
        if (data.slug) {
          queryClient.setQueryData(infoPagesKeys.bySlug(data.slug), data);
        }
      }
    },
  });
}

// Hook to delete an info page
export function useDeleteInfoPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      return await apiDelete(INFO_PAGES_ENDPOINTS.BY_ID(id));
    },
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: infoPagesKeys.detail(id) });

      // Use optimized factory helper
      deleteOnSuccessHandler(queryClient, 'info-pages')();
      invalidateEntityQueries(queryClient, 'info-pages-published');
    },
  });
}
