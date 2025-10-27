// Token Refresh Service
// Handles automatic token refresh for seamless user experience

class TokenRefreshService {
  constructor() {
    this.isRefreshing = false;
    this.failedQueue = [];
    this.setupInterceptors();
  }

  // Setup automatic token refresh
  setupInterceptors() {
    // Intercept API calls to check for token expiration
    const originalFetch = window.fetch;
    
    window.fetch = async (url, options = {}) => {
      // Only intercept API calls
      if (!url.includes('/api/')) {
        return originalFetch(url, options);
      }

      const response = await originalFetch(url, options);
      
      // Check if token expired
      if (response.status === 401) {
        const data = await response.clone().json();
        
        if (data.code === 'TOKEN_EXPIRED') {
          return this.handleTokenRefresh(url, options);
        }
      }
      
      return response;
    };
  }

  // Handle token refresh
  async handleTokenRefresh(originalUrl, originalOptions) {
    // If already refreshing, queue the request
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject, url: originalUrl, options: originalOptions });
      });
    }

    this.isRefreshing = true;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        // Token refreshed successfully, retry original request
        this.processQueue(null);
        
        // Retry the original request
        return fetch(originalUrl, originalOptions);
      } else {
        // Refresh failed, redirect to login
        this.processQueue(new Error('Token refresh failed'));
        this.redirectToLogin();
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      this.processQueue(error);
      this.redirectToLogin();
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  // Process queued requests
  processQueue(error) {
    this.failedQueue.forEach(({ resolve, reject, url, options }) => {
      if (error) {
        reject(error);
      } else {
        resolve(fetch(url, options));
      }
    });
    
    this.failedQueue = [];
  }

  // Redirect to login
  redirectToLogin() {
    // Clear any stored auth state
    document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Redirect to login page
    window.location.href = '/admin';
  }

  // Manual token refresh (for testing)
  async refreshToken() {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        console.log('Token refreshed successfully');
        return true;
      } else {
        console.error('Token refresh failed');
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  // Check if user is authenticated
  async checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      if (response.ok) {
        return true;
      } else if (response.status === 401) {
        // Try to refresh token
        const refreshSuccess = await this.refreshToken();
        if (refreshSuccess) {
          // Retry the auth check
          const retryResponse = await fetch('/api/auth/me', {
            credentials: 'include'
          });
          return retryResponse.ok;
        }
        return false;
      }
      return false;
    } catch (error) {
      console.error('Auth status check failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const tokenRefreshService = new TokenRefreshService();

export default tokenRefreshService;
