// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock side-effect-heavy hooks to keep smoke test stable
vi.mock('./hooks/useSocketIOIntegration.js', () => ({
  useSocketIOIntegration: () => ({
    invalidateQueries: () => {},
    updateCacheItem: () => {},
    queryClient: null
  })
}));

vi.mock('./hooks/useCacheInvalidation.js', () => ({
  useCacheInvalidation: () => ({
    invalidateEntity: () => {},
    clearAllCache: () => {},
    getCacheStats: () => ({})
  })
}));

// Stub heavy services
vi.mock('./services/databaseService.js', () => ({
  default: {
    init: async () => false,
    checkHealth: async () => false,
    query: async () => ([]),
    getData: async () => ([]),
    setData: async () => ({}),
    deleteData: async () => ({}),
    getInfoPageBySlug: async () => ({}),
    destroy: () => {}
  }
}));


vi.mock('./services/authService.js', () => ({
  default: {
    init: async () => {},
    isAdmin: () => false,
    isLoggedIn: () => false,
    authenticatedRequest: async () => ({ ok: true, json: async () => ({}) })
  }
}));

vi.mock('./services/websocketService.js', () => ({
  default: {
    subscribe: () => () => {},
    getConnectionStatus: () => ({ isConnected: false, isConnecting: false, offlineMode: false, reconnectAttempts: 0 }),
    connect: () => {},
    disconnect: () => {},
    emit: () => {},
    setSocket: () => {}
  }
}));

// Stub UI components that might cause side-effects
vi.mock('./components/BreakingNews', () => ({ default: () => null }));
vi.mock('./components/PWAInstallPrompt.jsx', () => ({ default: () => null }));
vi.mock('./components/admin/PerformanceMonitor.jsx', () => ({ default: () => null }));
vi.mock('./services/imageService.js', () => ({ default: class { constructor() {} } }));
vi.mock('./services/pwaService.js', () => ({ default: class { constructor() {} init() {} } }));
vi.mock('leaflet', () => ({ default: {}, __esModule: true }));
vi.mock('react-leaflet', () => ({
  __esModule: true,
  MapContainer: () => null,
  TileLayer: () => null,
  Marker: () => null,
  Popup: () => null
}));

import App from './App.jsx';

// The App renders a navigation bar and routes; by default "configLoaded" is false,
// so we expect to see the loading UI. This aligns with current store defaults.
describe('App smoke test', () => {
  it('renders loading state initially', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
    expect(!!screen.getByText('Lade Konfiguration...')).toBe(true);
  });
});


