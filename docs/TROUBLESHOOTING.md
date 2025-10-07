# Cache Troubleshooting Guide

## 🚨 Common Issues and Solutions

### 1. Stale Data in Development

**Symptoms:**
- Seeing old data after making changes
- Cache not updating with new data
- UI showing outdated information

**Solutions:**
```javascript
// Force cache invalidation
window.cacheDebug.forceVersionChange()

// Clear all caches
window.cacheDebug.clear()

// Disable persistence for fresh cache
window.cacheDebug.disablePersistence()
```

**Prevention:**
- Enable cache persistence for stable development
- Clear caches when switching features
- Monitor cache statistics regularly

### 2. Cache Not Clearing

**Symptoms:**
- Cache persists despite clearing attempts
- Old data still showing after clear
- Cache statistics not updating

**Solutions:**
```javascript
// Nuclear option - clear everything
window.cacheDebug.clear()
localStorage.clear()
sessionStorage.clear()
window.location.reload(true)

// Clear service worker caches
caches.keys().then(names => {
  names.forEach(name => caches.delete(name))
})
```

**Prevention:**
- Use proper cache invalidation methods
- Check cache persistence settings
- Monitor cache statistics

### 3. Service Worker Conflicts

**Symptoms:**
- Service worker interfering with development
- Cache not updating properly
- Network requests being cached incorrectly

**Solutions:**
```javascript
// Unregister service worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister())
})

// Clear service worker caches
caches.keys().then(names => {
  names.forEach(name => caches.delete(name))
})
```

**Prevention:**
- Use development-specific cache names
- Monitor service worker behavior
- Clear caches regularly

### 4. Memory Issues

**Symptoms:**
- High memory usage in development
- Browser becoming slow
- Cache statistics showing high memory usage

**Solutions:**
```javascript
// Reduce cache TTL
window.cacheDebug.setTTL(60000) // 1 minute

// Clear caches regularly
setInterval(() => window.cacheDebug.clear(), 60000) // Every minute

// Monitor memory usage
const stats = window.cacheDebug.stats()
console.log('Memory usage:', stats.memoryUsagePercent + '%')
```

**Prevention:**
- Use shorter TTL in development
- Clear caches regularly
- Monitor memory usage
- Use memory limits

### 5. Cache Version Issues

**Symptoms:**
- Cache version not updating
- Version compatibility errors
- Cache not invalidating on changes

**Solutions:**
```javascript
// Force version change
window.cacheDebug.forceVersionChange()

// Reset version settings
localStorage.removeItem('dev_cache_version')
localStorage.removeItem('cache_version')
window.cacheDebug.clear()
```

**Prevention:**
- Use stable version in development
- Monitor version changes
- Clear caches on version mismatch

## 🔍 Diagnostic Tools

### Cache Health Check
```javascript
function checkCacheHealth() {
  const stats = window.cacheDebug.stats()
  const health = {
    version: stats.cacheVersion,
    entries: stats.totalEntries,
    memory: stats.memoryUsagePercent,
    size: Math.round(stats.memorySize / 1024),
    persistence: localStorage.getItem('cache_persistence') === 'true'
  }
  
  console.log('Cache Health:', health)
  
  // Check for issues
  if (health.memory > 80) {
    console.warn('High memory usage:', health.memory + '%')
  }
  
  if (health.entries > 100) {
    console.warn('Too many cache entries:', health.entries)
  }
  
  return health
}
```

### Performance Monitoring
```javascript
// Monitor cache performance
let hits = 0, misses = 0
const originalGet = window.cacheDebug.service.get

window.cacheDebug.service.get = function(key) {
  const result = originalGet.call(this, key)
  if (result) hits++ else misses++
  
  const total = hits + misses
  const hitRatio = (hits / total * 100).toFixed(1)
  
  console.log(`Cache ${result ? 'HIT' : 'MISS'}: ${key} (${hitRatio}% hit ratio)`)
  return result
}
```

### Memory Usage Monitor
```javascript
// Monitor memory usage
function monitorMemoryUsage() {
  const stats = window.cacheDebug.stats()
  const memoryUsage = stats.memoryUsagePercent
  
  if (memoryUsage > 70) {
    console.warn('High memory usage:', memoryUsage + '%')
    console.log('Consider clearing caches or reducing TTL')
  }
  
  return memoryUsage
}

// Check every 30 seconds
setInterval(monitorMemoryUsage, 30000)
```

## 🛠️ Advanced Troubleshooting

### Complete Cache Reset
```javascript
// Reset all cache settings and data
function resetAllCaches() {
  // Clear all caches
  window.cacheDebug.clear()
  
  // Clear localStorage
  localStorage.clear()
  
  // Clear sessionStorage
  sessionStorage.clear()
  
  // Clear service worker caches
  caches.keys().then(names => {
    names.forEach(name => caches.delete(name))
  })
  
  // Unregister service worker
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.unregister())
  })
  
  // Reload page
  window.location.reload(true)
}
```

### Cache Debug Mode
```javascript
// Enable detailed cache debugging
function enableCacheDebugMode() {
  const originalSet = window.cacheDebug.service.set
  const originalGet = window.cacheDebug.service.get
  const originalDelete = window.cacheDebug.service.delete
  
  window.cacheDebug.service.set = function(key, value, ttl) {
    console.log('Cache SET:', key, 'TTL:', ttl)
    return originalSet.call(this, key, value, ttl)
  }
  
  window.cacheDebug.service.get = function(key) {
    const result = originalGet.call(this, key)
    console.log('Cache GET:', key, 'Result:', result ? 'HIT' : 'MISS')
    return result
  }
  
  window.cacheDebug.service.delete = function(key) {
    console.log('Cache DELETE:', key)
    return originalDelete.call(this, key)
  }
  
  console.log('Cache debug mode enabled')
}
```

### Network Request Monitoring
```javascript
// Monitor network requests and caching
function monitorNetworkRequests() {
  const originalFetch = window.fetch
  
  window.fetch = function(url, options) {
    console.log('Network request:', url, options)
    
    return originalFetch.call(this, url, options)
      .then(response => {
        console.log('Network response:', url, response.status)
        return response
      })
      .catch(error => {
        console.log('Network error:', url, error)
        throw error
      })
  }
  
  console.log('Network monitoring enabled')
}
```

## 📊 Performance Metrics

### Cache Statistics
```javascript
// Get detailed cache statistics
function getCacheStatistics() {
  const stats = window.cacheDebug.stats()
  
  return {
    version: stats.cacheVersion,
    entries: stats.totalEntries,
    memoryUsage: stats.memoryUsagePercent,
    size: Math.round(stats.memorySize / 1024),
    trackedKeys: stats.trackedKeys,
    persistence: localStorage.getItem('cache_persistence') === 'true'
  }
}
```

### Performance Analysis
```javascript
// Analyze cache performance
function analyzeCachePerformance() {
  const stats = getCacheStatistics()
  
  const analysis = {
    health: 'good',
    issues: [],
    recommendations: []
  }
  
  // Check memory usage
  if (stats.memoryUsage > 80) {
    analysis.health = 'poor'
    analysis.issues.push('High memory usage: ' + stats.memoryUsage + '%')
    analysis.recommendations.push('Clear caches or reduce TTL')
  }
  
  // Check cache size
  if (stats.size > 10) {
    analysis.issues.push('Large cache size: ' + stats.size + ' KB')
    analysis.recommendations.push('Consider clearing old entries')
  }
  
  // Check entry count
  if (stats.entries > 100) {
    analysis.issues.push('Too many cache entries: ' + stats.entries)
    analysis.recommendations.push('Clear caches or reduce TTL')
  }
  
  return analysis
}
```

## 🆘 Emergency Procedures

### Complete System Reset
```javascript
// Nuclear option - reset everything
function nuclearReset() {
  console.log('Performing nuclear reset...')
  
  // Clear all caches
  window.cacheDebug.clear()
  
  // Clear all storage
  localStorage.clear()
  sessionStorage.clear()
  
  // Clear service worker caches
  caches.keys().then(names => {
    names.forEach(name => caches.delete(name))
  })
  
  // Unregister service worker
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.unregister())
  })
  
  // Clear all cookies
  document.cookie.split(";").forEach(cookie => {
    const eqPos = cookie.indexOf("=")
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
  })
  
  // Reload page
  window.location.reload(true)
}
```

### Safe Mode
```javascript
// Enable safe mode with minimal caching
function enableSafeMode() {
  // Disable persistence
  window.cacheDebug.disablePersistence()
  
  // Set very short TTL
  window.cacheDebug.setTTL(5000) // 5 seconds
  
  // Clear existing caches
  window.cacheDebug.clear()
  
  console.log('Safe mode enabled - minimal caching')
}
```

## 📞 Getting Help

### Before Asking for Help
1. **Check this guide** for common solutions
2. **Use diagnostic tools** to identify the issue
3. **Try troubleshooting steps** in order
4. **Document the problem** with steps to reproduce

### When Reporting Issues
Include the following information:
- **Cache statistics**: `window.cacheDebug.stats()`
- **Console logs**: Any error messages
- **Steps to reproduce**: Detailed steps
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens

### Emergency Contacts
- **Development Team**: For complex cache issues
- **Documentation**: Check this guide first
- **Debug Tools**: Use browser console tools
- **Cache Manager**: Use the admin panel interface

---

**Remember**: Most cache issues can be resolved with the diagnostic tools and troubleshooting steps in this guide. Use the emergency procedures only when necessary.
