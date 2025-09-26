// Database Service for SLAM25 Application
// Handles all database operations using PostgreSQL

import errorHandler from './errorHandler.js';
import healthMonitor from './healthMonitor.js';

class DatabaseService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    this.serverURL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    this.isConnected = false;
    this.healthCheckInterval = null;
  }

  async init() {
    try {
      // Register with health monitor
      healthMonitor.registerService('database', 
        () => this.checkHealth(),
        { critical: true, timeout: 10000 }
      );
      
      this.isConnected = await this.checkHealth();
      
      if (this.isConnected) {
        // Start periodic health checks
        this.startHealthChecks();
        // Start health monitoring
        healthMonitor.startMonitoring();
      }
      
      return this.isConnected;
    } catch (error) {
      errorHandler.handleError(error, 'DatabaseService.init');
      this.isConnected = false;
      return false;
    }
  }

  async checkHealth() {
    const retryCheck = async () => {
      try {
        // Use serverURL for health checks to avoid double /api
        const healthURL = `${this.serverURL}/api/health`;
        console.log('DatabaseService: Checking health at:', healthURL);
        
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
        
        console.log('DatabaseService: Health response status:', response.status);
        
        if (response.ok) {
          const healthData = await response.json();
          console.log('DatabaseService: Health data:', healthData);
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
    // Clear existing interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Check health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      const wasConnected = this.isConnected;
      this.isConnected = await this.checkHealth();
      
      if (wasConnected && !this.isConnected) {
        console.warn('DatabaseService: Connection lost');
      } else if (!wasConnected && this.isConnected) {
        console.log('DatabaseService: Connection restored');
      }
    }, 30000);
  }

  async query(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000);
      });
      
      // Create the fetch promise
      const fetchPromise = fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
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

  // Generic CRUD operations - these are the core methods
  async getData(type, id = null) {
    const endpoint = id ? `/${type}/${id}` : `/${type}`;
    return this.query(endpoint);
  }

  async setData(type, data, id = null) {
    const endpoint = id ? `/${type}/${id}` : `/${type}`;
    const method = id ? 'PUT' : 'POST';
    
    return this.query(endpoint, {
      method,
      body: JSON.stringify(data)
    });
  }

  async deleteData(type, id) {
    const endpoint = `/${type}/${id}`;
    return this.query(endpoint, {
      method: 'DELETE'
    });
  }

  // Specialized methods that can't be handled by generic CRUD
  async getInfoPageBySlug(slug) {
    return this.query(`/info-pages/slug/${slug}`);
  }

  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

const databaseService = new DatabaseService();
export default databaseService;
