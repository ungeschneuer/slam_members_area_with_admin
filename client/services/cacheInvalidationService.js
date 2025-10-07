import { useQueryClient } from '@tanstack/react-query';
import websocketService from './websocketService.js';

/**
 * Cache invalidation service using TanStack Query and Socket.io
 * Automatically refreshes browser cache when content or code changes
 */
class CacheInvalidationService {
  constructor() {
    this.queryClient = null;
    this.isConnected = false;
    this.setupWebSocketListeners();
  }

  /**
   * Initialize the service with a query client
   * @param {QueryClient} queryClient - TanStack Query client instance
   */
  initialize(queryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Set up WebSocket listeners for cache invalidation
   */
  setupWebSocketListeners() {
    // Listen for data updates
    websocketService.subscribe('data-update', (data) => {
      this.handleDataUpdate(data);
    });

    // Listen for admin updates
    websocketService.subscribe('admin-update', (data) => {
      this.handleAdminUpdate(data);
    });

    // Listen for cache invalidation events from server
    websocketService.subscribe('cache-invalidation', (data) => {
      this.handleCacheInvalidation(data);
    });

    // Listen for code changes (development)
    websocketService.subscribe('code-change', (data) => {
      this.handleCodeChange(data);
    });

    // Listen for connection status
    websocketService.subscribe('connection-status', (status) => {
      this.isConnected = !!(status?.isConnected ?? status?.connected);
    });
  }

  /**
   * Handle data updates from server
   * @param {Object} data - Update data from server
   */
  handleDataUpdate(data) {
    if (!this.queryClient) return;

    const { type, entityType, timestamp } = data;
    
    console.log(`🔄 Cache invalidation: ${type} for ${entityType}`, { timestamp });

    // Invalidate specific entity type
    if (entityType) {
      this.queryClient.invalidateQueries({ 
        queryKey: [entityType],
        exact: false 
      });
    }

    // Invalidate related queries
    this.invalidateRelatedQueries(entityType);
  }

  /**
   * Handle admin updates
   * @param {Object} data - Admin update data
   */
  handleAdminUpdate(data) {
    if (!this.queryClient) return;

    const { type, entityType, timestamp } = data;
    
    console.log(`🔧 Admin cache invalidation: ${type} for ${entityType}`, { timestamp });

    // Invalidate admin-specific queries
    this.queryClient.invalidateQueries({ 
      queryKey: ['admin'],
      exact: false 
    });

    // Invalidate the specific entity
    if (entityType) {
      this.queryClient.invalidateQueries({ 
        queryKey: [entityType],
        exact: false 
      });
    }
  }

  /**
   * Handle cache invalidation events from server
   * @param {Object} data - Cache invalidation data from server
   */
  handleCacheInvalidation(data) {
    if (!this.queryClient) return;

    const { queryKeys, timestamp } = data;
    
    console.log(`🔄 Server cache invalidation: ${queryKeys.join(', ')}`, { timestamp });

    // Invalidate specific query keys from server
    queryKeys.forEach(queryKey => {
      const key = Array.isArray(queryKey) ? queryKey : [queryKey];
      this.queryClient.invalidateQueries({ 
        queryKey: key,
        exact: false 
      });
    });
  }

  /**
   * Handle code changes (development mode)
   * @param {Object} data - Code change data
   */
  handleCodeChange(data) {
    if (!this.queryClient) return;

    const { file, timestamp } = data;
    
    console.log(`💻 Code change detected: ${file}`, { timestamp });

    // Invalidate all queries to force refresh
    this.queryClient.invalidateQueries();
    
    // Optionally refetch all queries
    this.queryClient.refetchQueries();
  }

  /**
   * Invalidate related queries based on entity type
   * @param {string} entityType - Type of entity that changed
   */
  invalidateRelatedQueries(entityType) {
    if (!this.queryClient) return;

    const relatedQueries = {
      'participants': ['rounds', 'timetable'],
      'rounds': ['participants', 'timetable'],
      'timetable': ['participants', 'rounds'],
      'news': ['dashboard'],
      'city-tips': ['dashboard']
    };

    const related = relatedQueries[entityType] || [];
    
    related.forEach(relatedType => {
      this.queryClient.invalidateQueries({ 
        queryKey: [relatedType],
        exact: false 
      });
    });
  }

  /**
   * Manually invalidate cache for specific entity
   * @param {string} entityType - Entity type to invalidate
   */
  invalidateEntity(entityType) {
    if (!this.queryClient) return;

    this.queryClient.invalidateQueries({ 
      queryKey: [entityType],
      exact: false 
    });
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    if (!this.queryClient) return;

    this.queryClient.clear();
    console.log('🧹 All cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    if (!this.queryClient) return null;

    return {
      connected: this.isConnected,
      cacheSize: this.queryClient.getQueryCache().getAll().length,
      queries: this.queryClient.getQueryCache().getAll().map(query => ({
        queryKey: query.queryKey,
        state: query.state.status,
        dataUpdatedAt: query.state.dataUpdatedAt
      }))
    };
  }
}

// Export singleton instance
const cacheInvalidationService = new CacheInvalidationService();
export default cacheInvalidationService;
