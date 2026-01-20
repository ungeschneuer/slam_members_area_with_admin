import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/apiWrapper.js';
import { ROUNDS_ENDPOINTS } from '../constants/apiEndpoints.js';
import {
  createEntityQueryKeys,
  createOnSuccessHandler,
  updateOnSuccessHandler,
  deleteOnSuccessHandler
} from '../utils/queryKeyFactory.js';
import { useEntityData } from './useEntityData.js';
import { getQueryConfig } from '../config/polling.js';

// Query keys for rounds
export const roundsKeys = createEntityQueryKeys('rounds');

// Add custom bySlug query key
roundsKeys.bySlug = (slug) => [...roundsKeys.details(), 'slug', slug];

// Hook to fetch all rounds
export function useRounds(filters = {}, isAdmin = false) {
  return useEntityData(
    'rounds',
    async () => {
      const result = await apiGet(ROUNDS_ENDPOINTS.BASE);
      // Always return an array
      return Array.isArray(result) ? result : [];
    },
    { filters, ...getQueryConfig('rounds', isAdmin), isAdmin }
  );
}

// Hook to fetch a single round by ID
export function useRound(id) {
  return useQuery({
    queryKey: roundsKeys.detail(id),
    queryFn: async () => {
      if (!id) return null;
      return await apiGet(ROUNDS_ENDPOINTS.BY_ID(id));
    },
    enabled: !!id,
    ...getQueryConfig('rounds', false),
  });
}

// Hook to fetch a round by slug
export function useRoundBySlug(slug) {
  return useQuery({
    queryKey: roundsKeys.bySlug(slug),
    queryFn: async () => {
      if (!slug) return null;
      return await apiGet(ROUNDS_ENDPOINTS.BY_SLUG(slug));
    },
    enabled: !!slug,
    ...getQueryConfig('rounds', false),
  });
}

// Hook to create a round
export function useCreateRound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roundData) => {
      return await apiPost(ROUNDS_ENDPOINTS.BASE, roundData);
    },
    onSuccess: (data) => {
      // Use factory helper for standardized invalidation
      createOnSuccessHandler(queryClient, 'rounds')(data);

      // Also set bySlug cache if available
      if (data?.slug) {
        queryClient.setQueryData(roundsKeys.bySlug(data.slug), data);
      }
    },
  });
}

// Hook to update a round
export function useUpdateRound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, version, ...roundData }) => {
      // Include version in the body for optimistic locking
      return await apiPut(ROUNDS_ENDPOINTS.BY_ID(id), { ...roundData, version });
    },
    onSuccess: (data, variables) => {
      // Use factory helper for standardized invalidation
      updateOnSuccessHandler(queryClient, 'rounds')(data);

      // Update specific caches
      if (data?.id) {
        queryClient.setQueryData(roundsKeys.detail(variables.id), data);
        if (data.slug) {
          queryClient.setQueryData(roundsKeys.bySlug(data.slug), data);
        }
      }
    },
  });
}

// Hook to delete a round
export function useDeleteRound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      return await apiDelete(ROUNDS_ENDPOINTS.BY_ID(id));
    },
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: roundsKeys.detail(id) });

      // Use factory helper for standardized invalidation
      deleteOnSuccessHandler(queryClient, 'rounds')();
    },
  });
}
