import React, { useState, useEffect } from 'react';
import cacheService from '../../services/cacheService.js';
import rateLimitService from '../../services/rateLimitService.js';
import databaseOptimizationService from '../../services/databaseOptimizationService.js';
import imageService from '../../services/imageService.js';

const PerformanceMonitor = () => {
  const [cacheStats, setCacheStats] = useState(null);
  const [rateLimitStats, setRateLimitStats] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  const [imageStats, setImageStats] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const refreshStats = async () => {
    setIsRefreshing(true);
    try {
      setCacheStats(cacheService.getStats());
      setRateLimitStats(rateLimitService.getStats());
      setDbStats(databaseOptimizationService.getQueryStats());
      setImageStats(imageService.getCacheStats());
    } catch (error) {
      console.error('Error refreshing performance stats:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const clearCache = () => {
    cacheService.clear();
    refreshStats();
  };

  const clearImageCache = () => {
    imageService.clearCache();
    refreshStats();
  };

  const clearQueryCache = () => {
    databaseOptimizationService.clearQueryCache();
    refreshStats();
  };

  const resetRateLimits = () => {
    // Reset for current user/IP
    rateLimitService.resetLimits('admin');
    refreshStats();
  };

  if (!cacheStats || !rateLimitStats || !dbStats || !imageStats) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Performance Monitor</h2>
        <div className="flex space-x-2">
          <button
            onClick={refreshStats}
            disabled={isRefreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isRefreshing ? 'Aktualisiere...' : 'Aktualisieren'}
          </button>
        </div>
      </div>

      {/* Cache Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Cache Statistiken</h3>
          <button
            onClick={clearCache}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Cache leeren
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{cacheStats.memoryEntries}</div>
            <div className="text-sm text-gray-600">Memory Einträge</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{cacheStats.localStorageEntries}</div>
            <div className="text-sm text-gray-600">localStorage Einträge</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {cacheStats.memoryUsagePercent.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Memory Nutzung</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {(cacheStats.memorySize / 1024 / 1024).toFixed(2)} MB
            </div>
            <div className="text-sm text-gray-600">Memory Größe</div>
          </div>
        </div>
      </div>

      {/* Rate Limiting Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Rate Limiting</h3>
          <button
            onClick={resetRateLimits}
            className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
          >
            Limits zurücksetzen
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{rateLimitStats.totalRequests}</div>
            <div className="text-sm text-gray-600">Gesamt Anfragen</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{rateLimitStats.blockedRequests}</div>
            <div className="text-sm text-gray-600">Blockierte Anfragen</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{rateLimitStats.activeBlocks}</div>
            <div className="text-sm text-gray-600">Aktive Blocks</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {Object.keys(rateLimitStats.endpoints).length}
            </div>
            <div className="text-sm text-gray-600">Überwachte Endpoints</div>
          </div>
        </div>
      </div>

      {/* Database Performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Datenbank Performance</h3>
          <button
            onClick={clearQueryCache}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Query Cache leeren
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{dbStats.totalQueries}</div>
            <div className="text-sm text-gray-600">Gesamt Queries</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{dbStats.cacheHits}</div>
            <div className="text-sm text-gray-600">Cache Hits</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{dbStats.cacheMisses}</div>
            <div className="text-sm text-gray-600">Cache Misses</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{dbStats.slowQueries}</div>
            <div className="text-sm text-gray-600">Langsame Queries</div>
          </div>
        </div>
        
        {/* Top Queries */}
        {dbStats.topQueries.length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Top Queries</h4>
            <div className="space-y-2">
              {dbStats.topQueries.slice(0, 5).map((query, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {query.query.substring(0, 50)}...
                    </div>
                    <div className="text-xs text-gray-500">
                      {query.total} Ausführungen • {query.cacheHitRate} Cache Hit Rate
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {query.success} ✓ / {query.error} ✗
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Optimization */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Bild Optimierung</h3>
          <button
            onClick={clearImageCache}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Bild Cache leeren
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{imageStats.cachedImages}</div>
            <div className="text-sm text-gray-600">Gecachte Bilder</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {imageStats.webpSupported ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600">WebP Support</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {imageStats.retinaSupported ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600">Retina Support</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {imageStats.cdnConfigured ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600">CDN Konfiguriert</div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Gesundheit</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cache Performance</span>
              <span className={`text-sm font-medium ${
                cacheStats.memoryUsagePercent < 70 ? 'text-green-600' : 'text-red-600'
              }`}>
                {cacheStats.memoryUsagePercent < 70 ? 'Gut' : 'Kritisch'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Rate Limiting</span>
              <span className={`text-sm font-medium ${
                rateLimitStats.activeBlocks < 5 ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {rateLimitStats.activeBlocks < 5 ? 'Normal' : 'Erhöht'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Query Performance</span>
              <span className={`text-sm font-medium ${
                dbStats.slowQueries < 10 ? 'text-green-600' : 'text-red-600'
              }`}>
                {dbStats.slowQueries < 10 ? 'Gut' : 'Verbesserung nötig'}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Bild Optimierung</span>
              <span className="text-sm font-medium text-green-600">
                {imageStats.webpSupported ? 'Optimal' : 'Standard'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cache Hit Rate</span>
              <span className={`text-sm font-medium ${
                dbStats.totalQueries > 0 && (dbStats.cacheHits / dbStats.totalQueries) > 0.7 
                  ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {dbStats.totalQueries > 0 
                  ? `${((dbStats.cacheHits / dbStats.totalQueries) * 100).toFixed(1)}%`
                  : 'N/A'
                }
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">System Status</span>
              <span className="text-sm font-medium text-green-600">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
