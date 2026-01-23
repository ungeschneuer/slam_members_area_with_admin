/**
 * Unified Authentication Service for SLAM25
 *
 * This is the SINGLE authentication service for the entire application.
 * Previously, there were multiple auth services (authService + adminAuthService),
 * but they have been consolidated into this single service.
 *
 * Features:
 * - JWT-in-httpOnly-cookie authentication
 * - Automatic session management
 * - Role-based access control (admin/organizer)
 * - Event-driven authentication state changes
 * - Uses Axios with interceptors for all HTTP requests
 */

import api, { getErrorMessage } from './api.js';
import logger from './logger.js';

class AuthService {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.initializationPromise = null;
    this.isInitializing = false;
  }

  /**
   * Initialize the auth service (singleton pattern to prevent multiple calls)
   */
  async init() {
    // If already initializing, return the existing promise
    if (this.isInitializing && this.initializationPromise) {
      return this.initializationPromise;
    }

    // If already initialized and authenticated, return immediately
    if (this.isAuthenticated && this.user) {
      return true;
    }

    // Start initialization
    this.isInitializing = true;
    this.initializationPromise = this._performInit();

    try {
      const result = await this.initializationPromise;
      return result;
    } finally {
      this.isInitializing = false;
      this.initializationPromise = null;
    }
  }

  /**
   * Internal initialization method
   */
  async _performInit() {
    try {
      // Check if user is already authenticated by calling /me endpoint
      await this.getCurrentUser();
      return true;
    } catch (error) {
      // Not authenticated or session expired - this is normal
      this.user = null;
      this.isAuthenticated = false;

      // Only log if it's not an expected authentication failure
      if (!error.message.includes('Not authenticated')) {
        // Auth initialization failed - handled silently
      }

      return false;
    }
  }

  /**
   * Login with username/email and password
   */
  async login(identifier, password, rememberMe = false) {
    try {
      const { data } = await api.post('/auth/login', {
        identifier,
        password,
        rememberMe
      });

      // Login successful
      this.user = data.user;
      this.isAuthenticated = true;

      // Dispatch auth change event
      this.dispatchAuthEvent(true, this.user);

      return { success: true, user: this.user };

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.warn('Login failed', { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      // Call logout endpoint to clear server-side session
      await api.post('/auth/logout');
    } catch (error) {
      // Logout error - handled by error state
      logger.debug('Logout endpoint error (continuing anyway)', { error: error.message });
    } finally {
      // Clear local state
      this.user = null;
      this.isAuthenticated = false;

      // Dispatch auth change event
      this.dispatchAuthEvent(false, null);

      // Auto-refresh the page on logout (avoid in tests)
      try {
        const isTest = import.meta.env.MODE === 'test';
        if (!isTest) {
          setTimeout(() => window.location.reload(), 50);
        }
      } catch {}
    }
  }

  /**
   * Get current user from server
   */
  async getCurrentUser() {
    try {
      const { data } = await api.get('/auth/me');

      this.user = data.user;
      this.isAuthenticated = true;

      // Dispatch auth change event
      this.dispatchAuthEvent(true, this.user);

      return this.user;

    } catch (error) {
      // 401 is expected when not authenticated
      if (error.response?.status === 401) {
        this.user = null;
        this.isAuthenticated = false;
        throw new Error('Not authenticated');
      }

      // Other errors
      logger.error('Get current user error', { error: getErrorMessage(error) });
      this.user = null;
      this.isAuthenticated = false;
      throw error;
    }
  }

  /**
   * Make authenticated request
   *
   * Note: With Axios interceptors, this method is now simplified.
   * The interceptor handles token refresh automatically.
   *
   * @deprecated Consider using the api client directly instead
   */
  async authenticatedRequest(url, options = {}) {
    logger.debug('AuthService authenticatedRequest called', { url, options });

    if (!this.isAuthenticated) {
      logger.error('AuthService: Not authenticated, throwing error');
      throw new Error('Not authenticated');
    }

    try {
      // Determine method and extract body if present
      const method = (options.method || 'GET').toLowerCase();
      const config = {
        ...options,
        headers: options.headers || {}
      };

      // Handle different HTTP methods
      let response;
      if (method === 'get' || method === 'delete') {
        response = await api[method](url, config);
      } else if (method === 'post' || method === 'put' || method === 'patch') {
        const body = options.body ? JSON.parse(options.body) : undefined;
        response = await api[method](url, body, config);
      } else {
        response = await api.request({ url, ...config });
      }

      // Return response in fetch-compatible format
      return {
        ok: true,
        status: response.status,
        statusText: response.statusText,
        json: async () => response.data,
        text: async () => JSON.stringify(response.data)
      };

    } catch (error) {
      if (error.response?.status === 401) {
        logger.warn('Session expired, logging out');
        await this.logout();
      }

      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Get current user (from memory)
   */
  getCurrentUserSync() {
    return this.user;
  }

  /**
   * Check if user is authenticated
   */
  isLoggedIn() {
    return this.isAuthenticated && this.user !== null;
  }

  /**
   * Check if user has admin role
   */
  isAdmin() {
    return this.isAuthenticated && this.user && (this.user.role === 'admin' || this.user.role === 'organizer');
  }

  /**
   * Dispatch authentication change event
   */
  dispatchAuthEvent(isAuthenticated, user) {
    try {
      window.dispatchEvent(new CustomEvent('slam:auth-changed', {
        detail: { isAuthenticated, user }
      }));
    } catch (error) {
      logger.warn('Failed to dispatch auth event', { error: error.message });
    }
  }

  /**
   * Get authentication state
   */
  getAuthState() {
    return {
      isAuthenticated: this.isAuthenticated,
      hasUser: !!this.user,
      isAdmin: this.isAdmin(),
      user: this.user
    };
  }

  /**
   * Check if authentication is currently being initialized
   */
  isInitializingAuth() {
    return this.isInitializing;
  }
}

// Create singleton instance
const authService = new AuthService();

// Make debug methods available globally for development
if (typeof window !== 'undefined' && import.meta && import.meta.env && import.meta.env.DEV) {
  window.authDebug = {
    service: authService,
    getState: () => authService.getAuthState(),
    testLogin: (identifier, password) => authService.login(identifier, password),
    testLogout: () => authService.logout(),
    testMe: () => authService.getCurrentUser()
  };
}

export default authService;
