# SLAM25 Development Documentation

This directory contains comprehensive documentation for the SLAM25 Members Area application, with a focus on development workflows and caching strategies.

## 📚 Documentation Files

### Caching Documentation
- **[Development Caching Manual](DEVELOPMENT_CACHING_MANUAL.md)** - Complete guide to development mode caching
- **[Cache Quick Reference](CACHE_QUICK_REFERENCE.md)** - Quick reference card for developers

### Additional Documentation
- **[Main README](../README.md)** - Project overview and setup
- **[Production Deployment](../PRODUCTION_DEPLOYMENT.md)** - Production deployment guide
- **[Uberspace Deployment](../UBERSPACE_DEPLOYMENT.md)** - Uberspace-specific deployment

## 🚀 Quick Start

### For Developers
1. **Read the Quick Reference**: Start with [Cache Quick Reference](CACHE_QUICK_REFERENCE.md)
2. **Deep Dive**: Study the [Development Caching Manual](DEVELOPMENT_CACHING_MANUAL.md)
3. **Practice**: Use the debug tools in the browser console

### For New Team Members
1. **Setup**: Follow the main [README](../README.md)
2. **Development**: Read the caching documentation
3. **Deployment**: Check production deployment guides

## 🔧 Development Workflow

### Cache Management
```bash
# Start development server
npm run dev

# Access cache manager
# Navigate to: /admin/cache

# Use debug tools
# Open browser console: window.cacheDebug
```

### Key Features
- **Stable Caching**: No constant cache clearing in dev mode
- **Debug Tools**: Full cache control and monitoring
- **Persistence Control**: Choose between persistent or fresh caches
- **Performance Monitoring**: Real-time cache statistics

## 📊 Cache Architecture

The application uses a multi-layer caching system optimized for development:

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

## 🛠️ Debug Tools

### Browser Console API
```javascript
// Essential commands
window.cacheDebug.stats()        // View cache statistics
window.cacheDebug.clear()        // Clear all caches
window.cacheDebug.keys()         // List cache keys
window.cacheDebug.version()      // Get cache version
```

### Cache Manager UI
- **Real-time Statistics**: Cache version, entries, memory usage
- **Control Buttons**: Clear cache, force invalidation, toggle persistence
- **Debug Console**: Access to advanced operations

## 📈 Performance Monitoring

### Cache Health Check
```javascript
// Check cache health
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

### Performance Metrics
- **Hit Ratio**: Cache hit/miss ratio
- **Memory Usage**: Memory consumption percentage
- **Cache Size**: Total cache size in KB
- **Response Time**: Cache response times

## 🔄 Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| **Cache TTL** | 2 minutes | 5 minutes |
| **API Cache TTL** | 5 seconds | 30 seconds |
| **Memory Limit** | 25MB | 50MB |
| **Version Checking** | Optional | Aggressive |
| **Debug Tools** | Full | None |
| **Persistence** | Configurable | Always |

## 🆘 Troubleshooting

### Common Issues
1. **Stale Data**: Use `window.cacheDebug.forceVersionChange()`
2. **Memory Issues**: Clear caches and reduce TTL
3. **Service Worker Conflicts**: Clear service worker caches
4. **Cache Not Clearing**: Force reload with `window.location.reload(true)`

### Emergency Commands
```javascript
// Nuclear option - clear everything
window.cacheDebug.clear()
localStorage.clear()
sessionStorage.clear()
window.location.reload(true)

// Service worker reset
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister())
})
```

## 📝 Best Practices

### Development
- Enable persistence for stable development sessions
- Monitor cache statistics regularly
- Clear caches when switching features
- Use shorter TTL for faster updates

### Production
- Use build-time version injection
- Enable aggressive cache invalidation
- Monitor cache performance
- Implement cache warming strategies

## 🤝 Contributing

### Documentation Updates
1. Update relevant documentation files
2. Test changes in development mode
3. Update quick reference if needed
4. Submit pull request with changes

### Code Changes
1. Follow existing patterns
2. Update documentation as needed
3. Test cache behavior thoroughly
4. Document any new debug tools

## 📞 Support

### Getting Help
- **Documentation**: Check this directory first
- **Debug Tools**: Use browser console tools
- **Cache Manager**: Use the admin panel interface
- **Team**: Contact development team for complex issues

### Reporting Issues
1. Check existing documentation
2. Try debug tools and troubleshooting steps
3. Document the issue with steps to reproduce
4. Include cache statistics and console logs

---

**Last Updated**: October 2025  
**Version**: 1.0.0  
**Maintainer**: SLAM25 Development Team
