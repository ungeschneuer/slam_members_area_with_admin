import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/apiWrapper.js';
import { LINKS_ENDPOINTS } from '../constants/apiEndpoints.js';
import {
  createEntityQueryKeys,
  createOnSuccessHandler,
  updateOnSuccessHandler,
  deleteOnSuccessHandler
} from '../utils/queryKeyFactory.js';
import { useEntityData } from './useEntityData.js';
import { getQueryConfig } from '../config/polling.js';

// Query keys for links
export const linksKeys = createEntityQueryKeys('links');

// Hook to fetch all links
export function useLinks(filters = {}, isAdmin = false) {
  return useEntityData(
    'links',
    async () => {
      return await apiGet(LINKS_ENDPOINTS.BASE);
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
      return await apiGet(LINKS_ENDPOINTS.BY_ID(id));
    },
    enabled: !!id,
    ...getQueryConfig('links', false, { refetchInterval: false }), // Detail pages don't need polling
  });
}

// Hook to create a link
export function useCreateLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkData) => {
      return await apiPost(LINKS_ENDPOINTS.BASE, linkData);
    },
    onSuccess: createOnSuccessHandler(queryClient, 'links'),
  });
}

// Hook to update a link
export function useUpdateLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...linkData }) => {
      return await apiPut(LINKS_ENDPOINTS.BY_ID(id), linkData);
    },
    onSuccess: updateOnSuccessHandler(queryClient, 'links'),
  });
}

// Hook to delete a link
export function useDeleteLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      return await apiDelete(LINKS_ENDPOINTS.BY_ID(id));
    },
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: linksKeys.detail(id) });

      // Use factory helper for standardized invalidation
      deleteOnSuccessHandler(queryClient, 'links')();
    },
  });
}
