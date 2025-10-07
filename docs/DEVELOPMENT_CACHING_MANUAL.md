# Development Mode Caching Manual

## Overview

This manual covers the development mode caching system for the SLAM25 Members Area application. The caching system is optimized for development workflows while maintaining reliability and performance.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Cache Architecture](#cache-architecture)
3. [Development Mode Features](#development-mode-features)
4. [Cache Management](#cache-management)
5. [Debug Tools](#debug-tools)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)
8. [API Reference](#api-reference)

## Quick Start

### Enable Development Mode
Development mode is automatically enabled when running on `localhost` or `127.0.0.1`.

```bash
# Start development server
npm run dev
```

### Access Cache Manager
Navigate to the admin panel and go to `/admin/cache` to access the cache management interface.

### Basic Cache Operations
```javascript
// In browser console
window.cacheDebug.stats()        // View cache statistics
window.cacheDebug.clear()        // Clear all caches
window.cacheDebug.keys()         // List all cache keys
```

## Cache Architecture

### Multi-Layer Caching System

```
┌─────────────────────────────────────┐
│ L1: Memory Cache (Fastest, 2min)   │
├─────────────────────────────────────┤
│ L2: Service Worker (Network, 5s)   │
├─────────────────────────────────────┤
│ L3: localStorage (Persistent)       │
├─────────────────────────────────────┤
│ L4: Backend Cache (DB, 5min)        │
└─────────────────────────────────────┘
```

### Cache Types

| Cache Type | TTL | Purpose | Development Behavior |
|------------|-----|---------|---------------------|
| **Memory Cache** | 2 minutes | Fastest access | Reduced size (25MB) |
| **Service Worker** | 5 seconds | Network requests | Minimal caching |
| **localStorage** | Persistent | Offline support | Optional persistence |
| **Backend Cache** | 5 minutes | Database queries | Same as production |

## Development Mode Features

### 1. Stable Cache Versioning
- **Stable Version**: `dev-1.0.0-stable`
- **No Constant Clearing**: Cache persists across hot reloads
- **Manual Control**: Force version changes when needed

### 2. Optimized Cache Settings
```javascript
// Development-specific settings
{
  defaultTTL: 2 * 60 * 1000,        // 2 minutes (vs 5min prod)
  maxMemorySize: 25 * 1024 * 1024,  // 25MB (vs 50MB prod)
  apiCacheTTL: 5 * 1000,            // 5 seconds (vs 30s prod)
  persistence: 'optional'             // Configurable persistence
}
```

### 3. Service Worker Optimization
- **Separate Cache Names**: `slam-cache-dev`, `slam-api-dev`
- **Minimal Static Caching**: Skip static assets in dev mode
- **Aggressive Cache Busting**: 5-second TTL for API responses
- **Network-First Strategy**: Always try network first

## Cache Management

### Cache Manager UI

The development cache manager provides real-time control over the caching system:

#### Statistics Display
- **Version**: Current cache version
- **Entries**: Total cache entries
- **Memory**: Memory usage percentage
- **Size**: Cache size in KB
- **Tracked Keys**: Number of tracked cache keys
- **Persistence**: Cache persistence status

#### Control Buttons
- **Refresh Stats**: Update cache statistics
- **Clear All Caches**: Remove all cached data
- **Force Version Change**: Trigger cache invalidation
- **Toggle Persistence**: Enable/disable cache persistence
- **Set Cache TTL**: Configure cache time-to-live

### Cache Persistence Control

#### Enable Persistence
```javascript
// Enable cache persistence across sessions
window.cacheDebug.enablePersistence();
```

#### Disable Persistence
```javascript
// Disable persistence (clear on every reload)
window.cacheDebug.disablePersistence();
```

#### Check Persistence Status
```javascript
// Check if persistence is enabled
localStorage.getItem('cache_persistence') === 'true';
```

## Debug Tools

### Browser Console API

All debug tools are available via `window.cacheDebug`:

#### Statistics and Monitoring
```javascript
// Get detailed cache statistics
window.cacheDebug.stats();
// Returns: { version, entries, memory, size, trackedKeys, persistence }

// Get current cache version
window.cacheDebug.version();
// Returns: "dev-1.0.0-stable"

// List all cache keys
window.cacheDebug.keys();
// Returns: ["rounds", "participants", "news", ...]
```

#### Cache Operations
```javascript
// Clear all caches
window.cacheDebug.clear();

// Force cache version change (clears all caches)
window.cacheDebug.forceVersionChange();
```

#### Configuration
```javascript
// Set custom cache TTL (in milliseconds)
window.cacheDebug.setTTL(30000); // 30 seconds

// Enable cache persistence
window.cacheDebug.enablePersistence();

// Disable cache persistence
window.cacheDebug.disablePersistence();
```

### Service Worker Debug

#### Check Service Worker Status
```javascript
// Check if service worker is active
navigator.serviceWorker.controller;

// Get service worker registration
navigator.serviceWorker.getRegistration();
```

#### Clear Service Worker Caches
```javascript
// Clear all service worker caches
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

## Troubleshooting

### Common Issues

#### 1. Stale Data in Development
**Problem**: Seeing old data after making changes
**Solution**: 
```javascript
// Force cache invalidation
window.cacheDebug.forceVersionChange();
```

#### 2. Cache Not Clearing
**Problem**: Cache persists despite clearing attempts
**Solution**:
```javascript
// Clear all caches and force reload
window.cacheDebug.clear();
window.location.reload(true);
```

#### 3. Service Worker Conflicts
**Problem**: Service worker interfering with development
**Solution**:
```javascript
// Unregister service worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
});
```

#### 4. Memory Issues
**Problem**: High memory usage in development
**Solution**:
```javascript
// Reduce cache TTL
window.cacheDebug.setTTL(10000); // 10 seconds

// Clear caches regularly
setInterval(() => window.cacheDebug.clear(), 60000); // Every minute
```

### Debug Commands

#### Check Cache Health
```javascript
// Comprehensive cache health check
function checkCacheHealth() {
  const stats = window.cacheDebug.stats();
  console.log('Cache Health Check:', {
    version: stats.cacheVersion,
    entries: stats.totalEntries,
    memoryUsage: `${stats.memoryUsagePercent}%`,
    size: `${Math.round(stats.memorySize / 1024)} KB`,
    persistence: localStorage.getItem('cache_persistence') === 'true' ? 'ON' : 'OFF'
  });
}
```

#### Monitor Cache Performance
```javascript
// Monitor cache hit/miss ratio
let hits = 0, misses = 0;
const originalGet = window.cacheDebug.service.get;
window.cacheDebug.service.get = function(key) {
  const result = originalGet.call(this, key);
  if (result) hits++; else misses++;
  console.log(`Cache ${result ? 'HIT' : 'MISS'}: ${key} (${hits}/${hits + misses})`);
  return result;
};
```

## Best Practices

### 1. Development Workflow
- **Enable Persistence**: For stable development sessions
- **Disable Persistence**: When testing cache invalidation
- **Regular Clearing**: Clear caches when switching features
- **Monitor Performance**: Watch memory usage and cache statistics

### 2. Cache Configuration
```javascript
// Recommended development settings
window.cacheDebug.setTTL(120000);        // 2 minutes
window.cacheDebug.enablePersistence();   // Stable development
```

### 3. Debugging Strategies
- **Use Statistics**: Monitor cache performance regularly
- **Force Invalidation**: When testing cache behavior
- **Clear Regularly**: Prevent memory buildup
- **Monitor Console**: Watch for cache-related logs

### 4. Performance Optimization
- **Shorter TTL**: Use 2-minute TTL for faster updates
- **Memory Limits**: 25MB limit prevents memory issues
- **Network-First**: Always try network for fresh data
- **Selective Caching**: Cache only necessary data

## API Reference

### CacheService Methods

#### Core Methods
```javascript
// Set cache entry
cacheService.set(key, value, ttl);

// Get cache entry
cacheService.get(key);

// Delete cache entry
cacheService.delete(key);

// Clear all caches
cacheService.clear();
```

#### Development Methods
```javascript
// Get cache statistics
cacheService.getStats();

// Get current version
cacheService.getCurrentVersion();

// Get keys by pattern
cacheService.getKeysByPattern(pattern);
```

### Service Worker Events

#### Cache Events
```javascript
// Listen for cache events
self.addEventListener('message', (event) => {
  if (event.data.type === 'CLEAR_CACHE') {
    // Handle cache clearing
  }
});
```

### Environment Variables

#### Development Settings
```bash
# Development mode detection
NODE_ENV=development

# Cache settings
VITE_CACHE_TTL=120000
VITE_CACHE_PERSISTENCE=true
VITE_CACHE_DEBUG=true
```

#### Build Settings
```bash
# Version injection
VITE_BUILD_TIME=2025-10-05T09:33:37.007Z
VITE_GIT_HASH=6665931b
VITE_APP_VERSION=1.0.0
```

## Advanced Usage

### Custom Cache Strategies
```javascript
// Implement custom cache strategy
class CustomCacheStrategy {
  constructor() {
    this.cache = new Map();
    this.ttl = 60000; // 1 minute
  }
  
  set(key, value) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl
    });
  }
  
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }
}
```

### Cache Analytics
```javascript
// Implement cache analytics
class CacheAnalytics {
  constructor() {
    this.hits = 0;
    this.misses = 0;
    this.startTime = Date.now();
  }
  
  recordHit() { this.hits++; }
  recordMiss() { this.misses++; }
  
  getStats() {
    const total = this.hits + this.misses;
    return {
      hitRatio: this.hits / total,
      missRatio: this.misses / total,
      totalRequests: total,
      uptime: Date.now() - this.startTime
    };
  }
}
```

## Conclusion

The development mode caching system provides a robust, flexible, and debuggable caching solution optimized for development workflows. Use the tools and techniques described in this manual to maintain optimal cache performance and reliability during development.

For additional support or questions, refer to the main application documentation or contact the development team.
