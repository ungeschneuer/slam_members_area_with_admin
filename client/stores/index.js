// Consolidated store exports
export { useAppStore } from './useAppStore.js';
export { useConfigStore } from './useConfigStore.js';

// All selectors from consolidated store
export { 
  // UI Selectors
  useTheme, 
  useSetTheme, 
  useToggleTheme, 
  useAreas, 
  useSetAreas, 
  useMobileMenuOpen,
  useSetMobileMenuOpen,
  useConfigLoaded,
  useSetConfigLoaded,
  
  // Auth Selectors
  useIsAdmin, 
  useSetIsAdmin,
  
  // Service Selectors
  useServiceHealth,
  useSetServiceHealth,
  useServiceErrors,
  useSetServiceError,
  useClearServiceError,
  useRegisteredServices,
  useRegisterService,
  useUnregisterService,
  
  // WebSocket Selectors
  useWsConnected,
  useWsConnecting,
  useWsStatus,
  useWsHealth,
  useWsPending,
  useSetConnected,
  useSetConnecting,
  useSetConnectionStatus,
  useSetHealth,
  useSetPendingMessages,
  
  // Cache Selectors
  useCacheStats,
  useSetCacheStats,
  useQueueInvalidation,
  useFlushInvalidations,
  
  // Dashboard Selectors
  useStats,
  useUpdateStats,
  useSystemHealth,
  useSetSystemHealth,
  useLastHealthUpdate,
  useSetLastHealthUpdate,
  useRecentActivity,
  useSetRecentActivity,
  
  // Reset selector
  useResetAppState
} from './useAppStore.js';

// Config selectors
export { useConfigValue, useSetConfig } from './useConfigStore.js';

