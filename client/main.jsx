import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ErrorBoundary } from 'react-error-boundary'
import App from './App.jsx'
import ErrorFallback from './components/ErrorFallback.jsx'
import './index.css'




// Initialize database services asynchronously
async function initializeServices() {
  try {
    
    // Database operations handled directly in hooks using fetch
    
    // Service registry removed; health monitoring is handled elsewhere
    
    // Services simplified - no complex initialization needed
  } catch (error) {
    // Service initialization failed - handled silently
  }
}

// Initialize services with delay to ensure server is ready
setTimeout(() => {
  initializeServices();
}, 2000); // Wait 2 seconds for server to be ready

// CRITICAL: Unregister any existing service workers to prevent caching issues
// Run in both development and production to ensure clean state
if ('serviceWorker' in navigator) {
  const SW_CLEANUP_KEY = 'slam25-sw-cleanup-done';
  
  // Check if cleanup was already done this session
  if (!sessionStorage.getItem(SW_CLEANUP_KEY)) {
    const cleanupServiceWorkers = async () => {
      try {
        // Unregister all service workers
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log(`Found ${registrations.length} ServiceWorker registrations to clean up`);
        
        const unregisterPromises = registrations.map(registration => 
          registration.unregister().catch(err => {
            // Log error but continue with other registrations
            console.warn('Failed to unregister service worker:', err);
          })
        );
        
        await Promise.all(unregisterPromises);
        
        // Clear all caches after unregistration
        if ('caches' in window) {
          try {
            const cacheNames = await caches.keys();
            console.log(`Found ${cacheNames.length} caches to clear`);
            
            const deletePromises = cacheNames.map(cacheName => 
              caches.delete(cacheName).catch(err => {
                // Log error but continue with other caches
                console.warn('Failed to delete cache:', cacheName, err);
              })
            );
            
            await Promise.all(deletePromises);
            
            // Mark cleanup as done for this session
            sessionStorage.setItem(SW_CLEANUP_KEY, 'true');
            
            console.log('Service Worker cleanup completed');
            
            // If we found ServiceWorkers, reload to ensure clean state
            if (registrations.length > 0) {
              console.log('ServiceWorkers found - reloading page for clean state');
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }
          } catch (cacheError) {
            console.warn('Cache cleanup failed:', cacheError);
            // Fallback: Force cache busting for critical resources
            forceCacheBusting();
          }
        }
      } catch (error) {
        console.error('Service Worker cleanup failed:', error);
        // Fallback: Force cache busting for critical resources
        forceCacheBusting();
      }
    };
    
    // Fallback cache busting function
    const forceCacheBusting = () => {
      // Add cache-busting parameter to critical resources
      const timestamp = Date.now();
      const links = document.querySelectorAll('link[rel="stylesheet"], script[src]');
      links.forEach(link => {
        const href = link.href || link.src;
        if (href && !href.includes('?')) {
          const separator = href.includes('#') ? '&' : '?';
          if (link.href) {
            link.href = href + separator + 'cb=' + timestamp;
          } else if (link.src) {
            link.src = href + separator + 'cb=' + timestamp;
          }
        }
      });
    };
    
    // Run cleanup asynchronously to not block page load
    cleanupServiceWorkers();
  }
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
        // Query error - handled by error boundaries
      },
    },
    mutations: {
      retry: false,
      onError: (error) => {
        // Mutation error - handled by error boundaries
      },
    },
  },
});

// Configuration now handled by React Context providers in App.jsx

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        // App error - handled by error boundary
      }}
      onReset={() => {
        window.location.reload();
      }}
    >
      <QueryClientProvider client={queryClient}>
        <App />
        {/* Temporarily disabled to debug WebSocket error */}
        {/* {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />} */}
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

