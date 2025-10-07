import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import websocketService from '../services/websocketService.js';
import { useAppStore } from '../stores/useAppStore.js';

/**
 * Enhanced Socket.io integration for TanStack Query
 * Provides optimized real-time updates with intelligent cache management
 */
export function useSocketIOIntegration() {
  let queryClient;
  try {
    queryClient = useQueryClient();
  } catch {
    // Fallback no-op client for environments without a provider (tests)
    queryClient = {
      invalidateQueries: () => {},
      setQueryData: () => {},
      removeQueries: () => {},
      getQueryCache: () => ({ getAll: () => [] }),
    };
  }
  // Read actions from the store without subscribing to avoid re-renders
  const { queueInvalidation, flushInvalidations } = useAppStore.getState();
  const lastInvalidationTime = useRef(0);
  const DEBOUNCE_DELAY = 50; // 50ms debounce for production performance

  // Debounced invalidation to prevent excessive cache updates
  const debouncedInvalidate = useCallback((queryKey) => {
    const now = Date.now();
    const timeSinceLastInvalidation = now - lastInvalidationTime.current;
    
    if (timeSinceLastInvalidation < DEBOUNCE_DELAY) {
      queueInvalidation(queryKey);
      return;
    }
    
    // Process immediately
    queryClient.invalidateQueries({ queryKey });
    lastInvalidationTime.current = now;
    
    // Process queue after delay
    setTimeout(() => {
      flushInvalidations(queryClient);
    }, DEBOUNCE_DELAY);
  }, [queryClient, queueInvalidation, flushInvalidations]);

  // Smart cache update for specific items
  const updateCacheItem = useCallback((queryKey, item, operation) => {
    if (!item?.id) return;

    try {
      if (operation === 'upsert') {
        // Update specific item in cache
        queryClient.setQueryData(queryKey.detail(item.id), item);
        
        // Update in list cache
        queryClient.setQueryData(queryKey.lists(), (oldData) => {
          if (!oldData) return [item];
          const existingIndex = oldData.findIndex(d => d.id === item.id);
          if (existingIndex >= 0) {
            const newData = [...oldData];
            newData[existingIndex] = item;
            return newData;
          }
          return [...oldData, item];
        });
      } else if (operation === 'delete') {
        // Remove from cache
        queryClient.removeQueries({ queryKey: queryKey.detail(item.id) });
        queryClient.setQueryData(queryKey.lists(), (oldData) => {
          if (!oldData) return [];
          return oldData.filter(d => d.id !== item.id);
        });
      }
    } catch (error) {
      console.error('Error updating cache item:', error);
    }
  }, [queryClient]);

  // Handle data updates with Socket.io optimization
  const handleDataUpdate = useCallback((payload) => {
    if (!payload?.type) return;

    // Map data types to query keys
    const queryKeyMap = {
      'participants': { all: ['participants'], lists: () => ['participants', 'list'], detail: (id) => ['participants', 'detail', id] },
      'rounds': { all: ['rounds'], lists: () => ['rounds', 'list'], detail: (id) => ['rounds', 'detail', id] },
      'news': { all: ['news'], lists: () => ['news', 'list'], detail: (id) => ['news', 'detail', id] },
      'timetable': { all: ['timetable'], lists: () => ['timetable', 'list'], detail: (id) => ['timetable', 'detail', id] },
      'city-tips': { all: ['city-tips'], lists: () => ['city-tips', 'list'], detail: (id) => ['city-tips', 'detail', id] },
      'info-pages': { all: ['info-pages'], lists: () => ['info-pages', 'list'], detail: (id) => ['info-pages', 'detail', id] },
      'links': { all: ['links'], lists: () => ['links', 'list'], detail: (id) => ['links', 'detail', id] },
      'schnellzugriff': { all: ['schnellzugriff'], lists: () => ['schnellzugriff', 'list'], detail: (id) => ['schnellzugriff', 'detail', id] },
      'breaking-news': { all: ['news'], lists: () => ['news', 'list'], detail: (id) => ['news', 'detail', id] },
      'countdown': { all: ['countdown'], lists: () => ['countdown', 'current'], detail: (id) => ['countdown', 'detail', id] },
    };

    const queryKey = queryKeyMap[payload.type];
    if (!queryKey) return;

    // Handle specific item updates
    if (payload.item && payload.op) {
      updateCacheItem(queryKey, payload.item, payload.op);
    } else {
      // General invalidation for the data type
      debouncedInvalidate(queryKey.all);
    }

    // Handle related data types
    if (payload.type === 'news' || payload.type === 'breaking-news') {
      debouncedInvalidate(['news']);
    }

    // Handle timestamp-based updates for better performance
    if (payload.timestamp) {
      const now = Date.now();
      const age = now - payload.timestamp;
      if (age > 5000) { // Skip updates older than 5 seconds
        if (import.meta.env.DEV) {
          console.log('Skipping stale update:', payload.type, 'age:', age + 'ms');
        }
        return;
      }
    }
  }, [debouncedInvalidate, updateCacheItem]);

  // Handle admin updates
  const handleAdminUpdate = useCallback((payload) => {
    if (!payload?.type) return;

    const queryKeyMap = {
      'participants': ['participants'],
      'rounds': ['rounds'],
      'news': ['news'],
      'timetable': ['timetable'],
      'city-tips': ['city-tips'],
      'info-pages': ['info-pages'],
      'links': ['links'],
      'schnellzugriff': ['schnellzugriff'],
      'breaking-news': ['news'],
      'countdown': ['countdown'],
    };

    const queryKey = queryKeyMap[payload.type];
    if (queryKey) {
      debouncedInvalidate(queryKey);
    }
  }, [debouncedInvalidate]);

  // Handle cache invalidation events from Socket.io
  const handleCacheInvalidation = useCallback((payload) => {
    if (!payload?.queryKeys) return;

    // Process cache invalidation for specific query keys
    payload.queryKeys.forEach(queryKey => {
      if (Array.isArray(queryKey)) {
        debouncedInvalidate(queryKey);
      } else {
        debouncedInvalidate([queryKey]);
      }
    });
  }, [debouncedInvalidate]);

  useEffect(() => {
    // Subscribe to Socket.io events
    const unsubscribeDataUpdate = websocketService.subscribe('data-update', handleDataUpdate);
    const unsubscribeAdminUpdate = websocketService.subscribe('admin-update', handleAdminUpdate);
    const unsubscribeCacheInvalidation = websocketService.subscribe('cache-invalidation', handleCacheInvalidation);

    // Cleanup subscriptions
    return () => {
      if (typeof unsubscribeDataUpdate === 'function') {
        unsubscribeDataUpdate();
      }
      if (typeof unsubscribeAdminUpdate === 'function') {
        unsubscribeAdminUpdate();
      }
      if (typeof unsubscribeCacheInvalidation === 'function') {
        unsubscribeCacheInvalidation();
      }
    };
  }, [handleDataUpdate, handleAdminUpdate, handleCacheInvalidation]);

  // Return utility functions for manual cache management
  return {
    invalidateQueries: debouncedInvalidate,
    updateCacheItem,
    queryClient
  };
}

/**
 * Hook for Socket.io connection status
 */
export function useSocketIOStatus() {
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    isConnecting: false,
    offlineMode: false,
    reconnectAttempts: 0
  });

  useEffect(() => {
    const unsubscribe = websocketService.subscribe('connection-status', (status) => {
      setConnectionStatus(prev => ({
        ...prev,
        ...status
      }));
    });

    // Get initial status
    const initialStatus = websocketService.getConnectionStatus();
    setConnectionStatus(initialStatus);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  return connectionStatus;
}

/**
 * Hook for Socket.io message handling with retry logic
 */
export function useSocketIOMessages() {
  const queryClient = useQueryClient();
  const messageQueue = useRef([]);
  const isProcessingMessages = useRef(false);

  const processMessageQueue = useCallback(async () => {
    if (isProcessingMessages.current || messageQueue.current.length === 0) return;

    isProcessingMessages.current = true;

    while (messageQueue.current.length > 0) {
      const message = messageQueue.current.shift();
      
      try {
        // Process message based on type
        if (message.type === 'data-update') {
          const queryKey = message.payload?.type ? [message.payload.type] : null;
          if (queryKey) {
            queryClient.invalidateQueries({ queryKey });
          }
        } else if (message.type === 'admin-update') {
          const queryKey = message.payload?.type ? [message.payload.type] : null;
          if (queryKey) {
            queryClient.invalidateQueries({ queryKey });
          }
        } else if (message.type === 'cache-invalidation') {
          const queryKeys = message.payload?.queryKeys || [];
          queryKeys.forEach(key => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      } catch (error) {
        console.error('Error processing Socket.io message:', error);
        // Re-queue message for retry
        messageQueue.current.push(message);
      }
    }

    isProcessingMessages.current = false;
  }, [queryClient]);

  useEffect(() => {
    const unsubscribe = websocketService.subscribe('message', (message) => {
      messageQueue.current.push(message);
      processMessageQueue();
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [processMessageQueue]);

  return {
    queueLength: messageQueue.current.length,
    processQueue: processMessageQueue,
  };
}
