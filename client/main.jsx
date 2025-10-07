import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ErrorBoundary } from 'react-error-boundary'
import App from './App.jsx'
import ErrorFallback from './components/ErrorFallback.jsx'
import databaseService from './services/databaseService.js'
import websocketService from './services/websocketService.js'
import errorReportingService from './services/errorReportingService.js'
import pwaService from './services/pwaService.js'
import './index.css'
import { useAppStore } from './stores/useAppStore.js'
import { useConfigStore } from './stores/useConfigStore.js'

console.log('Main.jsx loading...');


// Initialize PWA service
pwaService.init();

// Initialize WebSocket service with delay
setTimeout(() => {
  websocketService.connect().catch(error => {
    console.error('Failed to connect WebSocket:', error);
  });
}, 2000); // 2 second delay to ensure server is ready

// Initialize database services asynchronously
async function initializeServices() {
  try {
    console.log('Starting service initialization...');
    
    // Initialize database service first (without resilience wrapper for init)
    if (databaseService && typeof databaseService.init === 'function') {
      await databaseService.init();
      console.log('Database service initialized');
    } else {
      console.warn('Database service init method not available');
    }
    
    // Service registry removed; health monitoring is handled elsewhere
    
    // Resilience wrapper removed from client side
    console.log('All services initialized successfully');
  } catch (error) {
    errorReportingService.logError(error, null, 'ServiceInitialization');
    console.error('Service initialization failed:', error);
  }
}

// Initialize services with delay to ensure server is ready
setTimeout(() => {
  initializeServices();
}, 2000); // Wait 2 seconds for server to be ready

// Register service worker with proper error handling
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', {
    scope: '/'
  }).then((registration) => {
    console.log('Service Worker registered successfully:', registration);
    
    // Check for updates
    registration.addEventListener('updatefound', () => {
      console.log('Service Worker update found');
      const newWorker = registration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('New service worker installed, reload to activate');
        }
      });
    });
  }).catch((error) => {
    console.error('Service Worker registration failed:', error);
  });
}

// Create QueryClient with optimized configuration and centralized error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      onError: (error) => {
        errorReportingService.logError(error, null, 'Query');
      },
    },
    mutations: {
      retry: false,
      onError: (error) => {
        errorReportingService.logError(error, null, 'Mutation');
      },
    },
  },
});

// Bootstrap configuration synchronously before first render
try {
  const { getConfig } = useConfigStore.getState();
  const initialTheme = getConfig('theme');
  const initialAreas = getConfig('areas');
  useAppStore.setState({ theme: initialTheme, areas: initialAreas, configLoaded: true });
} catch (e) {
  // Safe fallback if stores are not available for any reason
  useAppStore.setState({ configLoaded: true });
}

const root = createRoot(document.getElementById('root'));
console.log('Rendering React app...');
root.render(
  <React.StrictMode>
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        errorReportingService.logError(error, errorInfo, 'App');
      }}
      onReset={() => {
        window.location.reload();
      }}
    >
      <QueryClientProvider client={queryClient}>
        <App />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

console.log('React app rendered');
