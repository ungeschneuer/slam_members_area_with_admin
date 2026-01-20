/**
 * Generic query key factory for React Query
 * This factory creates standardized query keys for all entities
 *
 * Usage:
 * const newsKeys = createEntityQueryKeys('news');
 * newsKeys.all // ['news']
 * newsKeys.list(filters) // ['news', 'list', { filters }]
 * newsKeys.detail(id) // ['news', 'detail', id]
 */

/**
 * Creates a standardized query key factory for an entity
 * @param {string} entityName - The name of the entity (e.g., 'news', 'participants')
 * @returns {Object} Query key factory with standardized methods
 */
export function createEntityQueryKeys(entityName) {
  return {
    // Base key for all queries of this entity
    all: [entityName],

    // List queries
    lists: () => [entityName, 'list'],
    list: (filters = {}) => [entityName, 'list', { filters }],

    // Detail queries
    details: () => [entityName, 'detail'],
    detail: (id) => [entityName, 'detail', id],

    // Custom query types can be added
    custom: (type, params = {}) => [entityName, type, params]
  };
}

/**
 * Helper to invalidate all queries for an entity
 * @param {Object} queryClient - React Query client instance
 * @param {string} entityName - The name of the entity
 */
export function invalidateEntityQueries(queryClient, entityName) {
  return queryClient.invalidateQueries({ queryKey: [entityName] });
}

/**
 * Helper to invalidate list queries for an entity
 * @param {Object} queryClient - React Query client instance
 * @param {string} entityName - The name of the entity
 */
export function invalidateEntityLists(queryClient, entityName) {
  const keys = createEntityQueryKeys(entityName);
  return queryClient.invalidateQueries({ queryKey: keys.lists() });
}

/**
 * Helper to invalidate a specific detail query
 * @param {Object} queryClient - React Query client instance
 * @param {string} entityName - The name of the entity
 * @param {string|number} id - The entity ID
 */
export function invalidateEntityDetail(queryClient, entityName, id) {
  const keys = createEntityQueryKeys(entityName);
  return queryClient.invalidateQueries({ queryKey: keys.detail(id) });
}

/**
 * Helper to set query data for a detail
 * @param {Object} queryClient - React Query client instance
 * @param {string} entityName - The name of the entity
 * @param {string|number} id - The entity ID
 * @param {*} data - The data to set
 */
export function setEntityDetailData(queryClient, entityName, id, data) {
  const keys = createEntityQueryKeys(entityName);
  return queryClient.setQueryData(keys.detail(id), data);
}

/**
 * Standard onSuccess handler for create mutations
 * @param {Object} queryClient - React Query client instance
 * @param {string} entityName - The name of the entity
 * @returns {Function} onSuccess handler
 */
export function createOnSuccessHandler(queryClient, entityName) {
  return (data) => {
    // Invalidate all queries for this entity
    invalidateEntityQueries(queryClient, entityName);

    // Invalidate list queries
    invalidateEntityLists(queryClient, entityName);

    // Set detail data if available
    if (data?.data?.id) {
      setEntityDetailData(queryClient, entityName, data.data.id, data.data);
    } else if (data?.id) {
      setEntityDetailData(queryClient, entityName, data.id, data);
    }
  };
}

/**
 * Standard onSuccess handler for update mutations
 * @param {Object} queryClient - React Query client instance
 * @param {string} entityName - The name of the entity
 * @returns {Function} onSuccess handler
 */
export function updateOnSuccessHandler(queryClient, entityName) {
  return (data) => {
    // Invalidate list queries
    invalidateEntityLists(queryClient, entityName);

    // Update or invalidate detail query
    const id = data?.data?.id || data?.id;
    if (id) {
      invalidateEntityDetail(queryClient, entityName, id);
    }
  };
}

/**
 * Standard onSuccess handler for delete mutations
 * @param {Object} queryClient - React Query client instance
 * @param {string} entityName - The name of the entity
 * @returns {Function} onSuccess handler
 */
export function deleteOnSuccessHandler(queryClient, entityName) {
  return () => {
    // Invalidate all queries for this entity
    invalidateEntityQueries(queryClient, entityName);

    // Invalidate list queries
    invalidateEntityLists(queryClient, entityName);
  };
}
