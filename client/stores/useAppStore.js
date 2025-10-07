import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Factory to allow conditional middleware
const createAppStore = () => {
  const baseCreator = (set, get) => ({
    // UI State (no persistence to localStorage)
    theme: 'light',
    areas: ['Teilnehmer*innen', 'Runden', 'Neuigkeiten', 'Zeitplan', 'Stadt-Tipps', 'Links', 'Info'],
    mobileMenuOpen: false,
    configLoaded: false,

    // Auth State
    isAdmin: false,

    // Service State (consolidated from useServiceStore)
    registeredServices: [],
    isInitialized: false,
    serviceHealth: {}, // { [name]: { status: 'healthy'|'unhealthy'|'pending', responseTime?: number } }
    serviceErrors: {},  // { [name]: { message, count } }

    // WebSocket State (consolidated from useWebSocketStore)
    isConnected: false,
    isConnecting: false,
    connectionStatus: 'unknown',
    offlineMode: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    lastUpdate: null,
    pendingMessages: 0,
    sessionInfo: null,
    wsErrors: {},
    isHealthy: false,

    // Cache State (consolidated from useCacheStore)
    cacheStats: null,
    dependencyMetrics: null,
    dependencyAnalysis: null,
    lastRefresh: null,
    isRefreshing: false,
    invalidationQueue: [],

    // Dashboard State
    stats: {
      participants: 0,
      rounds: 0,
      news: 0
    },
    systemHealth: {
      database: 'unknown',
      websocket: 'unknown',
      overall: 'unknown'
    },
    lastHealthUpdate: null,
    recentActivity: [],

    // Actions - UI
    setTheme: (theme) => set({ theme }),
    toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
    setAreas: (areas) => set({ areas }),
    setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
    setConfigLoaded: (loaded) => set({ configLoaded: loaded }),
    setIsAdmin: (isAdmin) => set({ isAdmin }),

    // Actions - Service
    setInitialized: (value) => set({ isInitialized: !!value }),
    registerService: (name) => set((state) => ({
      registeredServices: state.registeredServices.includes(name)
        ? state.registeredServices
        : [...state.registeredServices, name]
    })),
    unregisterService: (name) => set((state) => {
      const next = state.registeredServices.filter(n => n !== name);
      const { [name]: _removed, ...restHealth } = state.serviceHealth;
      const { [name]: _errRemoved, ...restErrors } = state.serviceErrors;
      return { registeredServices: next, serviceHealth: restHealth, serviceErrors: restErrors };
    }),
    setServiceHealth: (name, health) => {
      try {
        set((state) => ({
          serviceHealth: { ...state.serviceHealth, [name]: { ...(state.serviceHealth[name] || {}), ...health } }
        }));
      } catch (error) {
        console.error('Failed to update service health:', error);
      }
    },
    setServiceError: (name, error) => {
      try {
        set((state) => ({
          serviceErrors: { ...state.serviceErrors, [name]: error }
        }));
      } catch (error) {
        console.error('Failed to set service error:', error);
      }
    },
    clearServiceError: (name) => set((state) => {
      const { [name]: _removed, ...rest } = state.serviceErrors;
      return { serviceErrors: rest };
    }),

    // Actions - WebSocket
    setConnectionStatus: (status) => set({ connectionStatus: status }),
    setConnected: (connected) => set({ isConnected: connected }),
    setConnecting: (connecting) => set({ isConnecting: connecting }),
    setOfflineMode: (offline) => set({ offlineMode: offline }),
    updateLastUpdate: () => set({ lastUpdate: new Date().toISOString() }),
    incReconnectAttempts: () => set((s) => ({ reconnectAttempts: s.reconnectAttempts + 1 })),
    resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),
    setPendingMessages: (count) => set({ pendingMessages: count }),
    setSessionInfo: (info) => set({ sessionInfo: info }),
    setHealth: (healthy) => {
      try {
        set({ isHealthy: !!healthy });
      } catch (error) {
        console.error('Failed to update health status:', error);
      }
    },
    setWsErrors: (errors) => {
      try {
        set({ wsErrors: errors || {} });
      } catch (error) {
        console.error('Failed to update errors:', error);
      }
    },

    // Actions - Cache
    setCacheStats: (stats) => set({ cacheStats: stats }),
    setDependencyMetrics: (metrics) => set({ dependencyMetrics: metrics }),
    setDependencyAnalysis: (analysis) => set({ dependencyAnalysis: analysis }),
    setLastRefresh: (time) => set({ lastRefresh: time }),
    setRefreshing: (refreshing) => set({ isRefreshing: refreshing }),
    queueInvalidation: (queryKey) => set((state) => ({
      invalidationQueue: [...state.invalidationQueue, queryKey]
    })),
    flushInvalidations: (queryClient) => {
      const { invalidationQueue } = get();
      if (invalidationQueue.length === 0) return;
      const jsonSafe = (key) => {
        try {
          JSON.stringify(key);
          return true;
        } catch {
          return false;
        }
      };
      const unique = invalidationQueue
        .filter(jsonSafe)
        .filter((k, i, arr) => i === arr.findIndex(x => JSON.stringify(x) === JSON.stringify(k)));
      unique.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
      set({ invalidationQueue: [] });
    },

    // Actions - Dashboard
    updateStats: (newStats) => set((state) => ({ 
      stats: { ...state.stats, ...newStats } 
    })),
    setSystemHealth: (health) => set({ systemHealth: health }),
    setLastHealthUpdate: (time) => set({ lastHealthUpdate: time }),
    setRecentActivity: (activity) => set({ recentActivity: activity }),

    // Reset all state
    resetState: () => set({
      theme: 'light',
      areas: ['Teilnehmer*innen', 'Runden', 'Neuigkeiten', 'Zeitplan', 'Stadt-Tipps', 'Links', 'Info'],
      mobileMenuOpen: false,
      configLoaded: false,
      isAdmin: false,
      registeredServices: [],
      isInitialized: false,
      serviceHealth: {},
      serviceErrors: {},
      isConnected: false,
      isConnecting: false,
      connectionStatus: 'unknown',
      offlineMode: false,
      reconnectAttempts: 0,
      maxReconnectAttempts: 10,
      lastUpdate: null,
      pendingMessages: 0,
      sessionInfo: null,
      wsErrors: {},
      isHealthy: false,
      cacheStats: null,
      dependencyMetrics: null,
      dependencyAnalysis: null,
      lastRefresh: null,
      isRefreshing: false,
      invalidationQueue: [],
      stats: { participants: 0, rounds: 0, news: 0 },
      systemHealth: { database: 'unknown', websocket: 'unknown', overall: 'unknown' },
      lastHealthUpdate: null,
      recentActivity: [],
    }),

    // Computed helpers
    isDarkMode: () => get().theme === 'dark',
    hasAdminAccess: () => get().isAdmin === true,
    canReconnect: () => get().reconnectAttempts < get().maxReconnectAttempts,
    getRegisteredServiceSet: () => new Set(get().registeredServices),
    getHealthyServices: () => Object.entries(get().serviceHealth)
      .filter(([, h]) => h?.status === 'healthy')
      .map(([n]) => n),
    getUnhealthyServices: () => Object.entries(get().serviceHealth)
      .filter(([, h]) => h?.status === 'unhealthy')
      .map(([n]) => n),
  });

  if (import.meta && import.meta.env && import.meta.env.DEV) {
    return create(devtools(baseCreator, { name: 'AppStore' }));
  }
  return create(baseCreator);
};

// Export singleton store instance
export const useAppStore = createAppStore();

// Ergonomic selectors for performance (component-level selective subscriptions)

// UI Selectors
export const useTheme = () => useAppStore(s => s.theme);
export const useSetTheme = () => useAppStore(s => s.setTheme);
export const useToggleTheme = () => useAppStore(s => s.toggleTheme);
export const useAreas = () => useAppStore(s => s.areas);
export const useSetAreas = () => useAppStore(s => s.setAreas);
export const useMobileMenuOpen = () => useAppStore(s => s.mobileMenuOpen);
export const useSetMobileMenuOpen = () => useAppStore(s => s.setMobileMenuOpen);
export const useConfigLoaded = () => useAppStore(s => s.configLoaded);
export const useSetConfigLoaded = () => useAppStore(s => s.setConfigLoaded);

// Auth Selectors
export const useIsAdmin = () => useAppStore(s => s.isAdmin);
export const useSetIsAdmin = () => useAppStore(s => s.setIsAdmin);

// Service Selectors
export const useServiceHealth = () => useAppStore(s => s.serviceHealth);
export const useSetServiceHealth = () => useAppStore(s => s.setServiceHealth);
export const useServiceErrors = () => useAppStore(s => s.serviceErrors);
export const useSetServiceError = () => useAppStore(s => s.setServiceError);
export const useClearServiceError = () => useAppStore(s => s.clearServiceError);
export const useRegisteredServices = () => useAppStore(s => s.registeredServices);
export const useRegisterService = () => useAppStore(s => s.registerService);
export const useUnregisterService = () => useAppStore(s => s.unregisterService);

// WebSocket Selectors
export const useWsConnected = () => useAppStore(s => s.isConnected);
export const useWsConnecting = () => useAppStore(s => s.isConnecting);
export const useWsStatus = () => useAppStore(s => s.connectionStatus);
export const useWsHealth = () => useAppStore(s => s.isHealthy);
export const useWsPending = () => useAppStore(s => s.pendingMessages);
export const useSetConnected = () => useAppStore(s => s.setConnected);
export const useSetConnecting = () => useAppStore(s => s.setConnecting);
export const useSetConnectionStatus = () => useAppStore(s => s.setConnectionStatus);
export const useSetHealth = () => useAppStore(s => s.setHealth);
export const useSetPendingMessages = () => useAppStore(s => s.setPendingMessages);
export const useSetOfflineMode = () => useAppStore(s => s.setOfflineMode);
export const useUpdateLastUpdate = () => useAppStore(s => s.updateLastUpdate);

// Cache Selectors
export const useCacheStats = () => useAppStore(s => s.cacheStats);
export const useSetCacheStats = () => useAppStore(s => s.setCacheStats);
export const useQueueInvalidation = () => useAppStore(s => s.queueInvalidation);
export const useFlushInvalidations = () => useAppStore(s => s.flushInvalidations);

// Dashboard Selectors
export const useStats = () => useAppStore(s => s.stats);
export const useUpdateStats = () => useAppStore(s => s.updateStats);
export const useSystemHealth = () => useAppStore(s => s.systemHealth);
export const useSetSystemHealth = () => useAppStore(s => s.setSystemHealth);
export const useLastHealthUpdate = () => useAppStore(s => s.lastHealthUpdate);
export const useSetLastHealthUpdate = () => useAppStore(s => s.setLastHealthUpdate);
export const useRecentActivity = () => useAppStore(s => s.recentActivity);
export const useSetRecentActivity = () => useAppStore(s => s.setRecentActivity);

// Reset selector
export const useResetAppState = () => useAppStore(s => s.resetState);


