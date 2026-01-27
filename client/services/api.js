/**
 * Centralized Axios API Client with Interceptors
 *
 * Replaces the fetch monkey-patching approach with a proper HTTP client.
 *
 * Features:
 * - Automatic token refresh on 401 errors
 * - Request/response logging
 * - Automatic JSON parsing
 * - Race condition protection during token refresh
 * - Clean error handling
 */

import axios from 'axios';
import logger from './logger.js';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3005/api',
  timeout: 10000, // 10 seconds (reduced from 30 for better UX)
  withCredentials: true, // Important: Include cookies for JWT
  headers: {
    'Content-Type': 'application/json'
  }
});

// Track token refresh state to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue = [];

/**
 * Process queued requests after token refresh
 */
const processQueue = (error, token = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};

/**
 * Request Interceptor
 * Logs outgoing requests in development
 */
api.interceptors.request.use(
  (config) => {
    // Log requests in development
    if (import.meta.env.DEV) {
      logger.debug('API Request', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL
      });
    }

    return config;
  },
  (error) => {
    logger.error('Request interceptor error', { error: error.message });
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles token refresh on 401 errors
 */
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      logger.debug('API Response', {
        status: response.status,
        url: response.config.url
      });
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if it's a 401 error and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {

      // Don't retry auth endpoints (would cause infinite loop)
      if (originalRequest.url?.includes('/auth/login') ||
          originalRequest.url?.includes('/auth/logout') ||
          originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      // If we're already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
        .then(() => {
          return api(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
      }

      // Mark request as retried to prevent infinite loop
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the token
        logger.debug('Attempting token refresh');

        await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            timeout: 10000 // 10 second timeout for refresh
          }
        );

        logger.debug('Token refresh successful');

        // Token refreshed successfully
        isRefreshing = false;
        processQueue(null);

        // Retry the original request
        return api(originalRequest);

      } catch (refreshError) {
        // Token refresh failed
        logger.warn('Token refresh failed, logging out user');

        isRefreshing = false;
        processQueue(refreshError);

        // Clear authentication and redirect to login
        window.dispatchEvent(new CustomEvent('slam:auth-expired'));

        // Redirect to login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/admin/login';
        }

        return Promise.reject(refreshError);
      }
    }

    // Handle other error types
    if (error.response) {
      // Server responded with error status
      logger.error('API Error Response', {
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config?.url,
        data: error.response.data
      });
    } else if (error.request) {
      // Request made but no response received
      logger.error('API No Response', {
        url: error.config?.url,
        message: 'No response received from server'
      });
    } else {
      // Error in request configuration
      logger.error('API Request Setup Error', {
        message: error.message
      });
    }

    return Promise.reject(error);
  }
);

/**
 * Helper function to extract error message from axios error
 */
export const getErrorMessage = (error) => {
  // Handle network/timeout errors with German messages
  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
    return 'Netzwerkfehler - Bitte überprüfe deine Internetverbindung';
  }
  if (error.request && !error.response) {
    return 'Keine Antwort vom Server - Bitte überprüfe deine Internetverbindung';
  }

  // Handle API error responses
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'Ein unbekannter Fehler ist aufgetreten';
};

/**
 * Helper function to check if error is a network error
 */
export const isNetworkError = (error) => {
  return !error.response && error.request;
};

/**
 * Helper function to check if error is a timeout
 */
export const isTimeoutError = (error) => {
  return error.code === 'ECONNABORTED' || error.message.includes('timeout');
};

export default api;
