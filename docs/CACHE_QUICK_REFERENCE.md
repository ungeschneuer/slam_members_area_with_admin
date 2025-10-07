# Cache Quick Reference Card

## 🚀 Quick Start

```bash
# Start development server
npm run dev

# Access cache manager
# Navigate to: /admin/cache
```

## 🔧 Essential Commands

### Browser Console
```javascript
// View cache statistics
window.cacheDebug.stats()

// Clear all caches
window.cacheDebug.clear()

// List cache keys
window.cacheDebug.keys()

// Get cache version
window.cacheDebug.version()
```

### Cache Management
```javascript
// Enable persistence (stable dev sessions)
window.cacheDebug.enablePersistence()

// Disable persistence (fresh cache on reload)
window.cacheDebug.disablePersistence()

// Set custom TTL (in milliseconds)
window.cacheDebug.setTTL(120000) // 2 minutes

// Force cache invalidation
window.cacheDebug.forceVersionChange()
```

## 📊 Cache Statistics

| Metric | Description | Good Values |
|--------|-------------|-------------|
| **Version** | Cache version | `dev-1.0.0-stable` |
| **Entries** | Total cache entries | < 100 |
| **Memory** | Memory usage | < 50% |
| **Size** | Cache size | < 10MB |
| **Persistence** | Cache persistence | ON/OFF |

## 🛠️ Troubleshooting

### Stale Data
```javascript
// Force cache invalidation
window.cacheDebug.forceVersionChange()
```

### Memory Issues
```javascript
// Clear caches and reduce TTL
window.cacheDebug.clear()
window.cacheDebug.setTTL(60000) // 1 minute
```

### Service Worker Issues
```javascript
// Clear service worker caches
caches.keys().then(names => {
  names.forEach(name => caches.delete(name))
})
```

## ⚙️ Development Settings

### Recommended Configuration
```javascript
// Stable development setup
window.cacheDebug.enablePersistence()
window.cacheDebug.setTTL(120000) // 2 minutes
```

### Testing Setup
```javascript
// Fresh cache for testing
window.cacheDebug.disablePersistence()
window.cacheDebug.setTTL(5000) // 5 seconds
```

## 📈 Performance Monitoring

### Cache Health Check
```javascript
function checkCacheHealth() {
  const stats = window.cacheDebug.stats()
  console.log('Cache Health:', {
    version: stats.cacheVersion,
    entries: stats.totalEntries,
    memory: `${stats.memoryUsagePercent}%`,
    size: `${Math.round(stats.memorySize / 1024)} KB`
  })
}
```

### Monitor Cache Performance
```javascript
// Track cache hits/misses
let hits = 0, misses = 0
const originalGet = window.cacheDebug.service.get
window.cacheDebug.service.get = function(key) {
  const result = originalGet.call(this, key)
  if (result) hits++ else misses++
  console.log(`Cache ${result ? 'HIT' : 'MISS'}: ${key}`)
  return result
}
```

## 🔄 Cache Lifecycle

### Development Mode
1. **Start**: Cache initializes with stable version
2. **Load**: Data cached with 2-minute TTL
3. **Update**: Cache invalidated on version change
4. **Clear**: Manual clearing via debug tools

### Production Mode
1. **Build**: Version injected with git hash
2. **Deploy**: Cache version changes automatically
3. **Invalidate**: All caches cleared on version mismatch
4. **Warm**: Cache populated with fresh data

## 📝 Best Practices

### ✅ Do
- Enable persistence for stable development
- Monitor cache statistics regularly
- Clear caches when switching features
- Use shorter TTL for faster updates

### ❌ Don't
- Ignore memory usage warnings
- Use production cache settings in dev
- Forget to clear caches after major changes
- Rely on cache for critical data

## 🆘 Emergency Commands

### Nuclear Option
```javascript
// Clear everything and reload
window.cacheDebug.clear()
localStorage.clear()
sessionStorage.clear()
window.location.reload(true)
```

### Service Worker Reset
```javascript
// Unregister service worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister())
})
```

### Complete Cache Reset
```javascript
// Reset all cache settings
localStorage.removeItem('dev_cache_version')
localStorage.removeItem('cache_version')
localStorage.removeItem('cache_persistence')
window.cacheDebug.clear()
```

## 📚 Additional Resources

- **Full Manual**: `docs/DEVELOPMENT_CACHING_MANUAL.md`
- **Cache Manager UI**: `/admin/cache`
- **Debug Console**: `window.cacheDebug`
- **Service Worker**: `public/sw.js`

---

**Need Help?** Check the full manual or use the debug tools in the browser console.
