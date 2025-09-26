// Cache Service for SLAM25 Application
// Implements Redis-like caching with localStorage fallback

class CacheService {
  constructor() {
    this.memoryCache = new Map();
    this.cacheExpiry = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default
    this.maxMemorySize = 50 * 1024 * 1024; // 50MB max memory cache
    this.currentMemorySize = 0;
    
    // Initialize cache cleanup
    this.startCleanupInterval();
  }

  // Set cache with TTL
  set(key, value, ttl = this.defaultTTL) {
    const expiry = Date.now() + ttl;
    const cacheEntry = {
      value,
      expiry,
      size: this.calculateSize(value)
    };

    // Check memory size limit
    if (this.currentMemorySize + cacheEntry.size > this.maxMemorySize) {
      this.evictOldest();
    }

    this.memoryCache.set(key, cacheEntry);
    this.cacheExpiry.set(key, expiry);
    this.currentMemorySize += cacheEntry.size;

    // Also store in localStorage for persistence
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify({
        value,
        expiry,
        size: cacheEntry.size
      }));
    } catch (error) {
      console.warn('Failed to store in localStorage:', error);
    }

    return true;
  }

  // Get cache value
  get(key) {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && Date.now() < memoryEntry.expiry) {
      return memoryEntry.value;
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        const entry = JSON.parse(stored);
        if (Date.now() < entry.expiry) {
          // Restore to memory cache
          this.memoryCache.set(key, entry);
          this.cacheExpiry.set(key, entry.expiry);
          this.currentMemorySize += entry.size;
          return entry.value;
        } else {
          // Remove expired entry
          localStorage.removeItem(`cache_${key}`);
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve from localStorage:', error);
    }

    return null;
  }

  // Delete cache entry
  delete(key) {
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      this.currentMemorySize -= memoryEntry.size;
      this.memoryCache.delete(key);
      this.cacheExpiry.delete(key);
    }

    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }

    return true;
  }

  // Clear all cache
  clear() {
    this.memoryCache.clear();
    this.cacheExpiry.clear();
    this.currentMemorySize = 0;

    // Clear localStorage cache entries
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage cache:', error);
    }
  }

  // Check if key exists and is not expired
  has(key) {
    return this.get(key) !== null;
  }

  // Get cache statistics
  getStats() {
    const memoryEntries = Array.from(this.memoryCache.entries());
    const localStorageEntries = this.getLocalStorageCacheEntries();

    return {
      memorySize: this.currentMemorySize,
      memoryEntries: memoryEntries.length,
      localStorageEntries: localStorageEntries.length,
      totalEntries: memoryEntries.length + localStorageEntries.length,
      maxMemorySize: this.maxMemorySize,
      memoryUsagePercent: (this.currentMemorySize / this.maxMemorySize) * 100
    };
  }

  // Calculate approximate size of value
  calculateSize(value) {
    try {
      return new Blob([JSON.stringify(value)]).size;
    } catch (error) {
      return 1024; // Default 1KB if calculation fails
    }
  }

  // Evict oldest entries when memory limit is reached
  evictOldest() {
    const entries = Array.from(this.cacheExpiry.entries())
      .sort((a, b) => a[1] - b[1]);

    for (const [key, expiry] of entries) {
      const entry = this.memoryCache.get(key);
      if (entry) {
        this.currentMemorySize -= entry.size;
        this.memoryCache.delete(key);
        this.cacheExpiry.delete(key);
      }

      if (this.currentMemorySize < this.maxMemorySize * 0.8) {
        break; // Stop when we're under 80% of max size
      }
    }
  }

  // Get localStorage cache entries
  getLocalStorageCacheEntries() {
    const entries = [];
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const entry = JSON.parse(stored);
            if (Date.now() < entry.expiry) {
              entries.push({
                key: key.replace('cache_', ''),
                ...entry
              });
            }
          }
        }
      });
    } catch (error) {
      console.warn('Failed to get localStorage cache entries:', error);
    }
    return entries;
  }

  // Start cleanup interval
  startCleanupInterval() {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now();

    // Cleanup memory cache
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now > expiry) {
        const entry = this.memoryCache.get(key);
        if (entry) {
          this.currentMemorySize -= entry.size;
        }
        this.memoryCache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }

    // Cleanup localStorage
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const entry = JSON.parse(stored);
            if (now > entry.expiry) {
              localStorage.removeItem(key);
            }
          }
        }
      });
    } catch (error) {
      console.warn('Failed to cleanup localStorage:', error);
    }
  }

  // Cache API responses with automatic key generation
  async cacheApiResponse(url, response, ttl = this.defaultTTL) {
    const key = `api_${this.hashString(url)}`;
    return this.set(key, {
      url,
      response,
      timestamp: Date.now()
    }, ttl);
  }

  // Get cached API response
  getCachedApiResponse(url) {
    const key = `api_${this.hashString(url)}`;
    const cached = this.get(key);
    return cached ? cached.response : null;
  }

  // Simple string hash function
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Cache session data
  setSessionData(key, value, ttl = 24 * 60 * 60 * 1000) { // 24 hours default
    const sessionKey = `session_${key}`;
    return this.set(sessionKey, value, ttl);
  }

  // Get session data
  getSessionData(key) {
    const sessionKey = `session_${key}`;
    return this.get(sessionKey);
  }

  // Clear session data
  clearSessionData(key) {
    const sessionKey = `session_${key}`;
    return this.delete(sessionKey);
  }

  // Clear all session data
  clearAllSessionData() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_session_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear session data:', error);
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

export default cacheService;
