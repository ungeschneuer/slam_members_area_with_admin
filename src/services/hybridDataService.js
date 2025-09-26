// Hybrid Data Service for SLAM25 Application
// Manages data with database priority and localStorage fallback

import databaseService from './databaseService.js';
import websocketService from './websocketService.js';
import cacheService from './cacheService.js';

class HybridDataService {
  constructor() {
    this.initialized = false;
    this.isConnected = false;
    this.subscribers = new Map();
    this.lastUpdate = null;
    this.cacheEnabled = true;
    this.updateDebounceTimers = new Map();
  }

  async initializeData() {
    if (this.initialized) return;

    try {
      // Initialize database service first
      if (typeof databaseService.init === 'function') {
        await databaseService.init();
      }
      
      // Check database connection with fallback
      try {
        if (typeof databaseService.checkHealth === 'function') {
          console.log('HybridDataService: Checking database health...');
          this.isConnected = await databaseService.checkHealth();
          console.log('HybridDataService: Database health result:', this.isConnected);
        } else {
          // Fallback: try a simple API call to test connection
          console.log('HybridDataService: Using fallback API call for health check...');
          const testData = await databaseService.getData('participants', null);
          this.isConnected = testData !== null;
        }
      } catch (healthError) {
        console.warn('HybridDataService: Health check failed, trying direct API call:', healthError);
        try {
          // Direct API call as last resort
          console.log('HybridDataService: Trying direct health API call...');
          
          // Create a timeout promise
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Health check timeout')), 5000);
          });
          
          // Create the fetch promise
          const fetchPromise = fetch('http://localhost:3001/api/health', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'omit'
          });
          
          // Race between fetch and timeout
          const response = await Promise.race([fetchPromise, timeoutPromise]);
          this.isConnected = response.ok;
          console.log('HybridDataService: Direct health check result:', this.isConnected);
        } catch (directError) {
          console.warn('HybridDataService: Direct API call also failed:', directError);
          this.isConnected = false;
        }
      }
      
      if (this.isConnected) {
        // Initialize WebSocket connection for real-time updates
        try {
          await websocketService.connect();
          websocketService.subscribe(this.handleWebSocketUpdate.bind(this));
        } catch (wsError) {
          console.warn('HybridDataService: WebSocket connection failed:', wsError);
        }
      }

      this.initialized = true;
    } catch (error) {
      console.error('HybridDataService: Initialization failed:', error);
      this.isConnected = false;
      this.initialized = true;
    }
  }

  handleWebSocketUpdate(type, updateData) {
    // Debounce updates to prevent excessive re-renders
    if (this.updateDebounceTimers.has(type)) {
      clearTimeout(this.updateDebounceTimers.get(type));
    }

    const timer = setTimeout(() => {
      this.notifySubscribers(type);
      this.updateDebounceTimers.delete(type);
    }, 100);

    this.updateDebounceTimers.set(type, timer);
  }

  subscribe(callback) {
    const id = Math.random().toString(36).substr(2, 9);
    this.subscribers.set(id, callback);
    
    return () => {
      this.subscribers.delete(id);
    };
  }

  notifySubscribers(type) {
    this.subscribers.forEach((callback, id) => {
      try {
        callback(type);
      } catch (error) {
        console.error(`HybridDataService: Error in subscriber ${id}:`, error);
      }
    });
  }

  async getData(type, id = null) {
    if (!this.initialized) await this.initializeData();

    try {
      // Ensure database service is initialized
      if (typeof databaseService.init === 'function' && !databaseService.isConnected) {
        await databaseService.init();
      }

      // Check cache first
      if (this.cacheEnabled) {
        const cacheKey = id ? `${type}_${id}` : type;
        const cachedData = cacheService.get(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }

      // Fetch from database
      let data = null;
      if (typeof databaseService.getData === 'function') {
        data = await databaseService.getData(type, id);
      } else {
        // Fallback: direct API call
        console.warn('HybridDataService: Using fallback API call for', type);
        try {
          const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
          const endpoint = id ? `/${type}/${id}` : `/${type}`;
          
          // Create a timeout promise
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 10000);
          });
          
          // Create the fetch promise
          const fetchPromise = fetch(`${baseURL}${endpoint}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          // Race between fetch and timeout
          const response = await Promise.race([fetchPromise, timeoutPromise]);
          
          if (response.ok) {
            data = await response.json();
          } else {
            console.error('HybridDataService: Fallback API call failed:', response.status);
          }
        } catch (fallbackError) {
          console.error('HybridDataService: Fallback API call error:', fallbackError);
        }
      }
      
      // Cache the result
      if (this.cacheEnabled && data) {
        const cacheKey = id ? `${type}_${id}` : type;
        cacheService.set(cacheKey, data, 300); // 5 minutes cache
      }

      return data;
    } catch (error) {
      console.error(`HybridDataService: Error getting ${type} data:`, error);
      return null;
    }
  }

  async setData(type, data, id = null) {
    if (!this.initialized) await this.initializeData();
    
    try {
      if (typeof databaseService.setData !== 'function') {
        console.error('HybridDataService: databaseService.setData is not available');
        return false;
      }
      const success = await databaseService.setData(type, data, id);
      
      if (success) {
        // Invalidate cache
        if (this.cacheEnabled) {
          cacheService.delete(type);
          if (id) cacheService.delete(`${type}_${id}`);
        }
        
        // Notify subscribers
        this.notifySubscribers(type);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`HybridDataService: Error setting ${type} data:`, error);
      return false;
    }
  }

  async deleteData(type, id) {
    if (!this.initialized) await this.initializeData();
    
    try {
      if (typeof databaseService.deleteData !== 'function') {
        console.error('HybridDataService: databaseService.deleteData is not available');
        return false;
      }
      const success = await databaseService.deleteData(type, id);
      
      if (success) {
        // Invalidate cache
        if (this.cacheEnabled) {
          cacheService.delete(type);
          cacheService.delete(`${type}_${id}`);
        }
        
        // Notify subscribers
        this.notifySubscribers(type);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`HybridDataService: Error deleting ${type} data:`, error);
      return false;
    }
  }

  // Specialized methods that can't be handled by generic CRUD
  async getInfoPageBySlug(slug) {
    if (!this.initialized) await this.initializeData();
    
    try {
      if (typeof databaseService.getInfoPageBySlug === 'function') {
        return await databaseService.getInfoPageBySlug(slug);
      } else {
        // Fallback: direct API call
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 10000);
        });
        
        // Create the fetch promise
        const fetchPromise = fetch(`${baseURL}/info-pages/slug/${slug}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        // Race between fetch and timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (response.ok) {
          return await response.json();
        } else {
          console.error('HybridDataService: getInfoPageBySlug fallback failed:', response.status);
          return null;
        }
      }
    } catch (error) {
      console.error('HybridDataService: Error getting info page by slug:', error);
      return null;
    }
  }

  getDatabaseStatus() {
    return {
      isConnected: this.isConnected || databaseService.isConnected,
      initialized: this.initialized,
      lastUpdate: this.lastUpdate,
      subscribers: this.subscribers.size
    };
  }

  destroy() {
    // Clear debounce timers
    this.updateDebounceTimers.forEach(timer => clearTimeout(timer));
    this.updateDebounceTimers.clear();
    
    // Clear subscribers and cache
    this.subscribers.clear();
    if (this.cacheEnabled) {
      cacheService.clear();
    }
  }
}

const hybridDataService = new HybridDataService();
export default hybridDataService;
