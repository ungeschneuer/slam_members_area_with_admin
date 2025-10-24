// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock side-effect-heavy hooks to keep smoke test stable
// WebSocket hooks removed - using simple polling instead

// Database service removed - operations handled directly in hooks
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

// PollingService removed - React Query handles refetching

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


