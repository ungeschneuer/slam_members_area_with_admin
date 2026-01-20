/**
 * Generic CRUD hook factory for React Query
 * This factory creates standardized hooks for all entity CRUD operations
 *
 * Usage:
 * const newsHooks = createCrudHooks('news', {
 *   basePath: '/news',
 *   queryConfig: { staleTime: 5 * 60 * 1000 }
 * });
 *
 * Then use:
 * const { data, isLoading } = newsHooks.useList();
 * const { mutate } = newsHooks.useCreate();
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from './apiWrapper.js';
import {
  createEntityQueryKeys,
  createOnSuccessHandler,
  updateOnSuccessHandler,
  deleteOnSuccessHandler,
  invalidateEntityLists
} from './queryKeyFactory.js';
import { getQueryConfig } from '../hooks/useEntityData.js';

/**
 * Creates a complete set of CRUD hooks for an entity
 * @param {string} entityName - Name of the entity (e.g., 'news', 'participants')
 * @param {Object} options - Configuration options
 * @returns {Object} Object containing all CRUD hooks
 */
export function createCrudHooks(entityName, options = {}) {
  const {
    basePath,
    queryConfig = {},
    enableOptimisticUpdates = false,
    responseExtractor = null
  } = options;

  // Create query keys
  const queryKeys = createEntityQueryKeys(entityName);

  /**
   * Hook for fetching a list of entities
   * @param {Object} filters - Optional filters
   * @param {boolean} isAdmin - Whether this is an admin query
   * @returns {Object} React Query result
   */
  function useList(filters = {}, isAdmin = false) {
    return useQuery({
      queryKey: queryKeys.list(filters),
      queryFn: async () => {
        const data = await apiGet(basePath);
        return responseExtractor ? responseExtractor(data) : data;
      },
      ...getQueryConfig(entityName, isAdmin),
      ...queryConfig
    });
  }

  /**
   * Hook for fetching a single entity by ID
   * @param {string|number} id - Entity ID
   * @param {boolean} enabled - Whether the query should run
   * @returns {Object} React Query result
   */
  function useDetail(id, enabled = true) {
    return useQuery({
      queryKey: queryKeys.detail(id),
      queryFn: async () => {
        const data = await apiGet(`${basePath}/${id}`);
        return responseExtractor ? responseExtractor(data) : data;
      },
      enabled: !!id && enabled,
      ...getQueryConfig(entityName, false, { refetchInterval: false }),
      ...queryConfig
    });
  }

  /**
   * Hook for creating a new entity
   * @param {Object} mutationOptions - Additional mutation options
   * @returns {Object} React Query mutation result
   */
  function useCreate(mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (data) => {
        return await apiPost(basePath, data);
      },
      onSuccess: createOnSuccessHandler(queryClient, entityName),
      ...mutationOptions
    });
  }

  /**
   * Hook for updating an entity
   * @param {Object} mutationOptions - Additional mutation options
   * @returns {Object} React Query mutation result
   */
  function useUpdate(mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({ id, ...data }) => {
        return await apiPut(`${basePath}/${id}`, data);
      },
      onSuccess: updateOnSuccessHandler(queryClient, entityName),
      ...mutationOptions
    });
  }

  /**
   * Hook for deleting an entity
   * @param {Object} mutationOptions - Additional mutation options
   * @returns {Object} React Query mutation result
   */
  function useDelete(mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (id) => {
        return await apiDelete(`${basePath}/${id}`);
      },
      onSuccess: deleteOnSuccessHandler(queryClient, entityName),
      ...mutationOptions
    });
  }

  /**
   * Hook for custom mutations
   * @param {Function} mutationFn - Custom mutation function
   * @param {Object} mutationOptions - Additional mutation options
   * @returns {Object} React Query mutation result
   */
  function useCustomMutation(mutationFn, mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn,
      onSuccess: (data) => {
        // Invalidate list queries by default
        invalidateEntityLists(queryClient, entityName);
        // Call custom onSuccess if provided
        if (mutationOptions.onSuccess) {
          mutationOptions.onSuccess(data);
        }
      },
      ...mutationOptions
    });
  }

  return {
    useList,
    useDetail,
    useCreate,
    useUpdate,
    useDelete,
    useCustomMutation,
    queryKeys
  };
}

/**
 * Helper to create a simple list hook with custom endpoint
 * @param {string} entityName - Entity name for query keys
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Additional options
 * @returns {Function} List hook
 */
export function createSimpleListHook(entityName, endpoint, options = {}) {
  const { queryConfig = {}, responseExtractor = null } = options;
  const queryKeys = createEntityQueryKeys(entityName);

  return function useSimpleList(filters = {}, isAdmin = false) {
    return useQuery({
      queryKey: queryKeys.list(filters),
      queryFn: async () => {
        const data = await apiGet(endpoint);
        return responseExtractor ? responseExtractor(data) : data;
      },
      ...getQueryConfig(entityName, isAdmin),
      ...queryConfig
    });
  };
}

/**
 * Helper to create a simple detail hook with custom endpoint
 * @param {string} entityName - Entity name for query keys
 * @param {Function} endpointFn - Function that returns endpoint for given ID
 * @param {Object} options - Additional options
 * @returns {Function} Detail hook
 */
export function createSimpleDetailHook(entityName, endpointFn, options = {}) {
  const { queryConfig = {}, responseExtractor = null } = options;
  const queryKeys = createEntityQueryKeys(entityName);

  return function useSimpleDetail(id, enabled = true) {
    return useQuery({
      queryKey: queryKeys.detail(id),
      queryFn: async () => {
        const data = await apiGet(endpointFn(id));
        return responseExtractor ? responseExtractor(data) : data;
      },
      enabled: !!id && enabled,
      ...getQueryConfig(entityName, false, { refetchInterval: false }),
      ...queryConfig
    });
  };
}
