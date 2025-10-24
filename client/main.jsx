import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ErrorBoundary } from 'react-error-boundary'
import App from './App.jsx'
import ErrorFallback from './components/ErrorFallback.jsx'
import pwaService from './services/pwaService.js'
import './index.css'

if (import.meta.env.DEV) console.log('Main.jsx loading...');


// Initialize PWA service
pwaService.init();

// WebSocket service removed - using simple polling instead

// Initialize database services asynchronously
async function initializeServices() {
  try {
    if (import.meta.env.DEV) console.log('Starting service initialization...');
    
    // Database operations handled directly in hooks using fetch
    
    // Service registry removed; health monitoring is handled elsewhere
    
    // Services simplified - no complex initialization needed
    if (import.meta.env.DEV) console.log('All services initialized successfully');
  } catch (error) {
    console.error('Service initialization failed:', error);
  }
}

// Initialize services with delay to ensure server is ready
setTimeout(() => {
  initializeServices();
}, 2000); // Wait 2 seconds for server to be ready

// Register service worker only in production to avoid dev HMR conflicts
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then((registration) => {
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker && newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New SW ready
          }
        });
      });
    })
    .catch((error) => {
      // Silent in prod
      console.error('Service Worker registration failed:', error);
    });
}

// Create QueryClient with optimized configuration and centralized error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - let individual hooks override this
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
      refetchInterval: false, // Disable polling by default - let individual hooks opt-in
      refetchIntervalInBackground: false,
      onError: (error) => {
        console.error('Query error:', error);
      },
    },
    mutations: {
      retry: false,
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

// Configuration now handled by React Context providers in App.jsx

const root = createRoot(document.getElementById('root'));
if (import.meta.env.DEV) console.log('Rendering React app...');
root.render(
  <React.StrictMode>
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('App error:', error, errorInfo);
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

if (import.meta.env.DEV) console.log('React app rendered');
