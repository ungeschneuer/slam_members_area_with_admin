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
 */

import logger from './logger.js';

class AuthService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL;
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
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: Include cookies in requests
        body: JSON.stringify({
          identifier,
          password,
          rememberMe
        })
      });

      const data = await response.json();

      if (response.ok) {
        this.user = data.user;
        this.isAuthenticated = true;
        
        // Login successful
        
        // Dispatch auth change event
        this.dispatchAuthEvent(true, this.user);
        
        return { success: true, user: this.user };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      // Login error - handled by error state
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      // Call logout endpoint to clear server-side session
      await fetch(`${this.baseURL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      // Logout error - handled by error state
    } finally {
      // Clear local state
      this.user = null;
      this.isAuthenticated = false;
      
      // Logged out successfully
      
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
      const response = await fetch(`${this.baseURL}/auth/me`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        this.user = data.user;
        this.isAuthenticated = true;
        
        // Dispatch auth change event
        this.dispatchAuthEvent(true, this.user);
        
        return this.user;
      } else if (response.status === 401) {
        // 401 is expected when not authenticated - don't log as error
        this.user = null;
        this.isAuthenticated = false;
        throw new Error('Not authenticated');
      } else {
        // Other errors should be logged
        // Authentication error - handled by error state
        this.user = null;
        this.isAuthenticated = false;
        throw new Error('Authentication failed');
      }
    } catch (error) {
      // Only log network errors, not expected 401s
      if (error.name !== 'TypeError' && !error.message.includes('Not authenticated')) {
        // Get current user error - handled by error state
      }
      this.user = null;
      this.isAuthenticated = false;
      throw error;
    }
  }

  /**
   * Make authenticated request
   */
  async authenticatedRequest(url, options = {}) {
    logger.debug('AuthService authenticatedRequest called', { url, options });

    if (!this.isAuthenticated) {
      logger.error('AuthService: Not authenticated, throwing error');
      throw new Error('Not authenticated');
    }

    const defaultOptions = {
      credentials: 'include', // Important: Include cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    logger.debug('AuthService: Making request', { url, options: { ...defaultOptions, ...options } });

    const response = await fetch(url, { ...defaultOptions, ...options });

    logger.debug('AuthService: Response received', {
      status: response.status,
      statusText: response.statusText,
      url: response.url
    });

    // Handle different HTTP status codes
    if (response.status === 401) {
      logger.warn('Session expired, logging out');
      await this.logout();
      throw new Error('Session expired');
    }

    // Handle client errors (400-499)
    if (response.status >= 400 && response.status < 500) {
      let errorMessage = `Client error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // If we can't parse JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      logger.error('Client error in authenticated request', {
        url,
        status: response.status,
        statusText: response.statusText,
        error: errorMessage
      });
      throw new Error(errorMessage);
    }

    // Handle server errors (500-599)
    if (response.status >= 500) {
      let errorMessage = `Server error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }
      logger.error('Server error in authenticated request', {
        url,
        status: response.status,
        statusText: response.statusText,
        error: errorMessage
      });
      throw new Error(errorMessage);
    }

    return response;
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
  isInitializing() {
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
