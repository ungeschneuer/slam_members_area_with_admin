import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/apiWrapper.js';
import { SCHNELLZUGRIFF_ENDPOINTS } from '../constants/apiEndpoints.js';
import {
  createEntityQueryKeys,
  createOnSuccessHandler,
  updateOnSuccessHandler,
  deleteOnSuccessHandler
} from '../utils/queryKeyFactory.js';
import { getQueryConfig } from '../config/polling.js';

// Query keys for schnellzugriff
export const schnellzugriffKeys = createEntityQueryKeys('schnellzugriff');

// Hook to fetch all schnellzugriff links
export function useSchnellzugriff(filters = {}, isAdmin = false) {
  return useQuery({
    queryKey: schnellzugriffKeys.list(filters),
    queryFn: async () => {
      const endpoint = isAdmin ? SCHNELLZUGRIFF_ENDPOINTS.ADMIN_ALL : SCHNELLZUGRIFF_ENDPOINTS.BASE;
      const result = await apiGet(endpoint);
      return result?.data || result || [];
    },
    enabled: true,
    ...getQueryConfig('schnellzugriff', isAdmin),
  });
}

// Hook to fetch a single schnellzugriff link
export function useSchnellzugriffLink(id) {
  return useQuery({
    queryKey: schnellzugriffKeys.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const result = await apiGet(SCHNELLZUGRIFF_ENDPOINTS.BY_ID(id));
      return result?.data || result || null;
    },
    enabled: !!id,
    ...getQueryConfig('schnellzugriff', false),
  });
}

// Hook to create a new schnellzugriff link
export function useCreateSchnellzugriff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newLink) => {
      return await apiPost(SCHNELLZUGRIFF_ENDPOINTS.BASE, newLink);
    },
    onSuccess: createOnSuccessHandler(queryClient, 'schnellzugriff'),
  });
}

// Hook to update a schnellzugriff link
export function useUpdateSchnellzugriff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updatedLink }) => {
      return await apiPut(SCHNELLZUGRIFF_ENDPOINTS.BY_ID(id), updatedLink);
    },
    onSuccess: updateOnSuccessHandler(queryClient, 'schnellzugriff'),
  });
}

// Hook to delete a schnellzugriff link
export function useDeleteSchnellzugriff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      return await apiDelete(SCHNELLZUGRIFF_ENDPOINTS.BY_ID(id));
    },
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: schnellzugriffKeys.detail(id) });

      // Use factory helper for standardized invalidation
      deleteOnSuccessHandler(queryClient, 'schnellzugriff')();
    },
  });
}
