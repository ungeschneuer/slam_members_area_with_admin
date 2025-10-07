import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import cacheInvalidationService from '../services/cacheInvalidationService.js';

/**
 * Hook to set up automatic cache invalidation using TanStack Query and Socket.io
 * Minimal custom code - just initialize and let the service handle everything
 */
export const useCacheInvalidation = () => {
  const queryClient = useQueryClient();
  const initializedRef = useRef(false);

  useEffect(() => {
    // Initialize the cache invalidation service only in development to avoid
    // duplicate invalidations (production uses useSocketIOIntegration)
    if (import.meta && import.meta.env && import.meta.env.DEV) {
      if (!initializedRef.current) {
        cacheInvalidationService.initialize(queryClient);
        initializedRef.current = true;
      }
    }

    // Return cleanup function
    return () => {
      // Service handles its own cleanup
    };
  }, [queryClient]);

  // Return service methods for manual control if needed (DEV only active)
  return {
    invalidateEntity: (entityType) => cacheInvalidationService.invalidateEntity(entityType),
    clearAllCache: () => cacheInvalidationService.clearAllCache(),
    getCacheStats: () => cacheInvalidationService.getCacheStats()
  };
};

export default useCacheInvalidation;
