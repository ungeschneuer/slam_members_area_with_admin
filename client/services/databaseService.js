// Database Service for SLAM25 Application
// Handles all database operations using PostgreSQL

import errorReportingService from './errorReportingService.js';
import authService from './authService.js';

class DatabaseService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL;
    this.serverURL = import.meta.env.VITE_SERVER_URL;
    this.isConnected = false;
    this.healthCheckInterval = null;
    
    // Validate environment variables
    if (!this.baseURL) {
      console.error('DatabaseService: VITE_API_URL is not defined in environment variables');
    }
    if (!this.serverURL) {
      console.error('DatabaseService: VITE_SERVER_URL is not defined in environment variables');
    }
    
    // Debug logging
    if (import.meta.env.DEV) {
      console.log('DatabaseService: Configuration:', {
        baseURL: this.baseURL,
        serverURL: this.serverURL,
        VITE_API_URL: import.meta.env.VITE_API_URL,
        VITE_SERVER_URL: import.meta.env.VITE_SERVER_URL,
        NODE_ENV: import.meta.env.NODE_ENV
      });
    }
  }

  async init() {
    try {
      this.isConnected = await this.checkHealth();
      
      if (this.isConnected) {
        // Start periodic health checks
        this.startHealthChecks();
      }
      
      return this.isConnected;
    } catch (error) {
      errorReportingService.logError(error, null, 'DatabaseService.init');
      this.isConnected = false;
      return false;
    }
  }

  async checkHealth() {
    const retryCheck = async () => {
      try {
        // Use serverURL for health checks to avoid double /api
        const healthURL = `${this.serverURL}/api/health`;
        if (import.meta.env.DEV) {
          console.log('DatabaseService: Checking health at:', healthURL);
        }
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), 10000);
        });
        
        // Create the fetch promise
        const fetchPromise = fetch(healthURL, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'omit' // Don't send cookies for health check
        });
        
        // Race between fetch and timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (import.meta.env.DEV) {
          console.log('DatabaseService: Health response status:', response.status);
        }
        
        if (response.ok) {
          const healthData = await response.json();
          if (import.meta.env.DEV) {
            console.log('DatabaseService: Health data:', healthData);
          }
          return healthData.status === 'OK' || healthData.status === 'healthy';
        }
        
        console.warn('DatabaseService: Health check returned non-OK status:', response.status);
        return false;
      } catch (error) {
        console.error('DatabaseService: Health check failed:', error);
        throw error; // Re-throw for error handler
      }
    };

    try {
      const result = await retryCheck();
      return result;
    } catch (error) {
      console.error('DatabaseService: Health check failed:', error);
      return false;
    }
  }

  startHealthChecks() {
    // Removed automatic health check polling - now manual/event-driven only
    // Health checks are performed on-demand or when explicitly requested
    console.log('DatabaseService: Health checks are now manual/event-driven only');
  }

  async query(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000);
      });
      
      // Determine if this is an admin operation that requires authentication
      const isAdminOperation = this.isAdminOperation(endpoint, options.method);
      
      // Use authenticated request for admin operations or if auth service is available
      let fetchPromise;
      if (isAdminOperation && authService && authService.isLoggedIn()) {
        if (import.meta.env.DEV) {
          console.log('DatabaseService: Using authenticated request for admin operation:', endpoint);
        }
        fetchPromise = authService.authenticatedRequest(url, options);
      } else if (isAdminOperation) {
        console.warn('DatabaseService: Admin operation requires authentication but user is not logged in:', endpoint);
        throw new Error('Authentication required for admin operations');
      } else {
        // Use regular fetch for public endpoints
        if (import.meta.env.DEV) {
          console.log('DatabaseService: Using regular fetch for public endpoint:', endpoint);
        }
        fetchPromise = fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          },
          credentials: 'include', // Include cookies for all requests
          ...options
        });
      }
      
      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Database query failed:', error);
      throw error;
    }
  }

  // Helper method to determine if an operation requires admin authentication
  isAdminOperation(endpoint, method) {
    // Admin operations are POST, PUT, DELETE for most endpoints
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      return true;
    }
    
    // Specific admin-only GET endpoints
    const adminGetEndpoints = [
      '/dashboard',
      '/performance/compare',
      '/cache/stats'
    ];
    
    if (method === 'GET' && adminGetEndpoints.some(adminEndpoint => endpoint.includes(adminEndpoint))) {
      return true;
    }
    
    return false;
  }

  // Note: Generic CRUD methods removed - project now uses direct API calls with TanStack Query
  // This service is now focused on health monitoring only

  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

const databaseService = new DatabaseService();
export default databaseService;
