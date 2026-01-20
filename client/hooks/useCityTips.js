import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/apiWrapper.js';
import { CITY_TIPS_ENDPOINTS } from '../constants/apiEndpoints.js';
import {
  createEntityQueryKeys,
  createOnSuccessHandler,
  updateOnSuccessHandler,
  deleteOnSuccessHandler
} from '../utils/queryKeyFactory.js';
import { useEntityData } from './useEntityData.js';
import { getQueryConfig } from '../config/polling.js';

// Query keys for city tips
export const cityTipsKeys = createEntityQueryKeys('city-tips');

// Add custom bySlug query key
cityTipsKeys.bySlug = (slug) => [...cityTipsKeys.details(), 'slug', slug];

// Hook to fetch all city tips
export function useCityTips(filters = {}, isAdmin = false) {
  return useEntityData(
    'city-tips',
    async () => {
      return await apiGet(CITY_TIPS_ENDPOINTS.BASE);
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
      return await apiGet(CITY_TIPS_ENDPOINTS.BY_ID(id));
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
      const result = await apiGet(CITY_TIPS_ENDPOINTS.BY_SLUG(slug));
      // Extract the actual city tip data from the database result
      if (result && result.rows && result.rows.length > 0) {
        return result.rows[0];
      }
      return null;
    },
    enabled: !!slug,
    ...getQueryConfig('cityTips', false, { refetchInterval: false }), // Detail pages don't need polling
  });
}

// Hook to create a city tip
export function useCreateCityTip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cityTipData) => {
      return await apiPost(CITY_TIPS_ENDPOINTS.BASE, cityTipData);
    },
    onSuccess: (data) => {
      // Use factory helper for standardized invalidation
      createOnSuccessHandler(queryClient, 'city-tips')(data);

      // Also set bySlug cache if available
      if (data?.data?.slug) {
        queryClient.setQueryData(cityTipsKeys.bySlug(data.data.slug), data.data);
      } else if (data?.slug) {
        queryClient.setQueryData(cityTipsKeys.bySlug(data.slug), data);
      }
    },
  });
}

// Hook to update a city tip
export function useUpdateCityTip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...cityTipData }) => {
      return await apiPut(CITY_TIPS_ENDPOINTS.BY_ID(id), cityTipData);
    },
    onSuccess: (data, variables) => {
      // Use factory helper for standardized invalidation
      updateOnSuccessHandler(queryClient, 'city-tips')(data);

      // Update the specific city tip in cache
      if (data?.data) {
        queryClient.setQueryData(cityTipsKeys.detail(variables.id), data.data);
        if (data.data.slug) {
          queryClient.setQueryData(cityTipsKeys.bySlug(data.data.slug), data.data);
        }
      } else if (data?.id && variables.id) {
        queryClient.setQueryData(cityTipsKeys.detail(variables.id), data);
        if (data.slug) {
          queryClient.setQueryData(cityTipsKeys.bySlug(data.slug), data);
        }
      }
    },
  });
}

// Hook to delete a city tip
export function useDeleteCityTip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      return await apiDelete(CITY_TIPS_ENDPOINTS.BY_ID(id));
    },
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: cityTipsKeys.detail(id) });

      // Use factory helper for standardized invalidation
      deleteOnSuccessHandler(queryClient, 'city-tips')();
    },
  });
}
