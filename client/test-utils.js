import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// Central test utilities for client tests

/**
 * Create a test wrapper with QueryClient for React Query hooks
 */
export const createQueryWrapper = (options = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
      ...options
    }
  });
  
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

/**
 * Database operations now handled directly in hooks
 */
export const mockDatabaseService = {
  getData: vi.fn(),
  setData: vi.fn(),
  deleteData: vi.fn(),
  query: vi.fn(),
  init: vi.fn(),
  checkHealth: vi.fn(),
  getInfoPageBySlug: vi.fn(),
  destroy: vi.fn()
};

/**
 * Mock authService with common methods
 */
export const mockCookieAuthService = {
  init: vi.fn(),
  isAdmin: vi.fn(),
  isLoggedIn: vi.fn(),
  authenticatedRequest: vi.fn(),
  login: vi.fn(),
  logout: vi.fn()
};

/**
 * PollingService removed - React Query handles refetching with refetchInterval
 */

/**
 * Mock pwaService with common methods
 */
export const mockPwaService = {
  init: vi.fn(),
  install: vi.fn(),
  isInstallable: vi.fn(() => false),
  isInstalled: vi.fn(() => false)
};

/**
 * Mock imageService with common methods
 */
export const mockImageService = {
  loadImage: vi.fn(),
  preloadImages: vi.fn(),
  getImageUrl: vi.fn()
};


/**
 * Mock responseHandler with common methods
 */
export const mockResponseHandler = {
  handleSuccess: vi.fn(),
  handleError: vi.fn(),
  handleNotFound: vi.fn()
};

/**
 * Mock console for error reporting
 */
export const mockErrorReportingService = {
  logError: vi.fn(),
  reportToExternalService: vi.fn(),
  categorizeError: vi.fn(),
  shouldSuppressDuplicate: vi.fn(),
  clearErrors: vi.fn(),
  getErrorStats: vi.fn(() => ({})),
  getStoredErrors: vi.fn(() => [])
};

/**
 * Mock console for error reporting
 */
export const mockCacheInvalidationService = {
  invalidateEntity: vi.fn(),
  clearAllCache: vi.fn(),
  getCacheStats: vi.fn(() => ({})),
  invalidateQueries: vi.fn(),
  updateCacheItem: vi.fn()
};

/**
 * Junction table service removed - using simple database queries
 */
export const mockJunctionTableService = {
  getJunctionData: vi.fn(),
  updateJunctionData: vi.fn(),
  deleteJunctionData: vi.fn()
};

/**
 * Mock adminAuthService with common methods
 */
export const mockAdminAuthService = {
  init: vi.fn(),
  isAdmin: vi.fn(),
  isLoggedIn: vi.fn(),
  authenticate: vi.fn(),
  authorize: vi.fn()
};

/**
 * Common mock data for tests
 */
export const mockData = {
  participants: [
    { id: 1, name: 'Alice', region: 'Berlin', pronouns: 'she/her' },
    { id: 2, name: 'Bob', region: 'Hamburg', pronouns: 'he/him' }
  ],
  rounds: [
    { id: 1, title: 'Round 1', slug: 'round-1', date: '2024-01-01' },
    { id: 2, title: 'Round 2', slug: 'round-2', date: '2024-01-02' }
  ],
  news: [
    { id: 1, title: 'News 1', content: 'Content 1', published: true },
    { id: 2, title: 'News 2', content: 'Content 2', published: false }
  ],
  cityTips: [
    { id: 1, title: 'Tip 1', content: 'Content 1', category: 'venue' },
    { id: 2, title: 'Tip 2', content: 'Content 2', category: 'food' }
  ]
};

/**
 * Setup common mocks for client tests
 */
export const setupClientMocks = () => {
  // Database service removed - operations handled directly in hooks

  vi.mock('./services/authService.js', () => ({
    default: mockCookieAuthService
  }));

  // PollingService removed - React Query handles refetching

  vi.mock('./services/pwaService.js', () => ({
    default: mockPwaService
  }));

  vi.mock('./services/imageService.js', () => ({
    default: mockImageService
  }));


  vi.mock('./services/responseHandler.js', () => ({
    default: mockResponseHandler
  }));

  vi.mock('./services/console.js', () => ({
    default: {
      logError: vi.fn(),
      reportToExternalService: vi.fn(),
      categorizeError: vi.fn(),
      shouldSuppressDuplicate: vi.fn(),
      clearErrors: vi.fn(),
      getErrorStats: vi.fn(() => ({})),
      getStoredErrors: vi.fn(() => [])
    }
  }));

  // WebSocket hooks removed - using simple polling instead

  // Junction table service removed - using simple database queries

  vi.mock('./services/adminAuthService.js', () => ({
    default: mockAdminAuthService
  }));

  // Mock UI components that might cause side-effects
  vi.mock('./components/BreakingNews', () => ({ default: () => null }));
  vi.mock('./components/PWAInstallPrompt.jsx', () => ({ default: () => null }));
  vi.mock('./components/admin/PerformanceMonitor.jsx', () => ({ default: () => null }));
  
  // Mock Leaflet components
  vi.mock('leaflet', () => ({ default: {}, __esModule: true }));
  vi.mock('react-leaflet', () => ({
    __esModule: true,
    MapContainer: () => null,
    TileLayer: () => null,
    Marker: () => null,
    Popup: () => null
  }));
};

/**
 * Clear all mocks
 */
export const clearAllMocks = () => {
  vi.clearAllMocks();
};

/**
 * Reset all mocks to default implementations
 */
export const resetAllMocks = () => {
  Object.values(mockDatabaseService).forEach(mock => mock.mockReset());
  Object.values(mockCookieAuthService).forEach(mock => mock.mockReset());
  // PollingService removed - no mocks to reset
  Object.values(mockPwaService).forEach(mock => mock.mockReset());
  Object.values(mockImageService).forEach(mock => mock.mockReset());
  Object.values(mockResponseHandler).forEach(mock => mock.mockReset());
  Object.values(mockErrorReportingService).forEach(mock => mock.mockReset());
  Object.values(mockCacheInvalidationService).forEach(mock => mock.mockReset());
  Object.values(mockJunctionTableService).forEach(mock => mock.mockReset());
  Object.values(mockAdminAuthService).forEach(mock => mock.mockReset());
};
