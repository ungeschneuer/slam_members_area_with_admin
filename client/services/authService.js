/**
 * Simplified Authentication Service for SLAM25
 * Simple JWT-in-httpOnly-cookie authentication without client-side complexity
 */

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
        console.warn('Auth initialization failed:', error.message);
      }
      
      return false;
    }
  }

  /**
   * Login with email and password
   */
  async login(email, password, rememberMe = false) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: Include cookies in requests
        body: JSON.stringify({
          email,
          password,
          rememberMe
        })
      });

      const data = await response.json();

      if (response.ok) {
        this.user = data.user;
        this.isAuthenticated = true;
        
        console.log('Login successful:', { user: this.user });
        
        // Dispatch auth change event
        this.dispatchAuthEvent(true, this.user);
        
        return { success: true, user: this.user };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
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
      console.error('Logout error:', error);
    } finally {
      // Clear local state
      this.user = null;
      this.isAuthenticated = false;
      
      console.log('Logged out successfully');
      
      // Dispatch auth change event
      this.dispatchAuthEvent(false, null);

      // Auto-refresh the page on logout (avoid in tests)
      try {
        const isTest = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
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
        console.error('Authentication error:', response.status, response.statusText);
        this.user = null;
        this.isAuthenticated = false;
        throw new Error('Authentication failed');
      }
    } catch (error) {
      // Only log network errors, not expected 401s
      if (error.name !== 'TypeError' && !error.message.includes('Not authenticated')) {
        console.error('Get current user error:', error);
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
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    const defaultOptions = {
      credentials: 'include', // Important: Include cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const response = await fetch(url, { ...defaultOptions, ...options });

    // If we get a 401, the session might be expired
    if (response.status === 401) {
      console.warn('Session expired, logging out');
      await this.logout();
      throw new Error('Session expired');
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
      console.warn('Failed to dispatch auth event:', error);
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
if (import.meta.env.DEV) {
  window.authDebug = {
    service: authService,
    getState: () => authService.getAuthState(),
    testLogin: (email, password) => authService.login(email, password),
    testLogout: () => authService.logout(),
    testMe: () => authService.getCurrentUser()
  };
}

export default authService;
