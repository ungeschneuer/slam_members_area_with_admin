import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
// Client-side rate limiting removed; use server-side express-rate-limit
import imageService from '../../services/imageService.js';
import AdminCard from './ui/AdminCard.jsx';
import StatsCard from './ui/StatsCard.jsx';

export default function AdminPerformance() {
  const queryClient = useQueryClient();
  const [cacheStats, setCacheStats] = useState(null);
  const [rateLimitStats, setRateLimitStats] = useState({ totalRequests: 0, blockedRequests: 0, activeBlocks: 0, endpoints: {} });
  const [queryStats, setQueryStats] = useState(null);
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
      // Browser/storage cache statistics
      const storage = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : {};
      const localCacheKeys = Object.keys(localStorage).filter(k => k.startsWith('cache_'));
      const cacheNames = 'caches' in window ? await caches.keys() : [];
      setCacheStats({
        localStorageEntries: localCacheKeys.length,
        cacheApiEntries: cacheNames.length,
        quota: storage.quota || null,
        usage: storage.usage || null
      });
      // Rate limiting is server-side; show neutral/default stats
      setRateLimitStats({ totalRequests: 0, blockedRequests: 0, activeBlocks: 0, endpoints: {} });
      // React Query cache statistics
      const qc = queryClient.getQueryCache();
      const queries = qc.getAll();
      setQueryStats({
        totalQueries: queries.length,
        activeQueries: queries.filter(q => q.isActive()).length,
        staleQueries: queries.filter(q => q.isStale()).length
      });
      setImageStats(imageService.getCacheStats());
    } catch (error) {
      console.error('Error refreshing performance stats:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStoragePercentage = () => {
    if (!cacheStats?.quota || !cacheStats?.usage) return 0;
    return Math.round((cacheStats.usage / cacheStats.quota) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Performance Monitor</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">Überwachen Sie die Anwendungsleistung und Ressourcennutzung</p>
      </div>

      {/* Performance Overview */}
      <AdminCard
        title="Performance Übersicht"
        icon="📊"
        headerActions={
          <button
            onClick={refreshStats}
            disabled={isRefreshing}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isRefreshing
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isRefreshing ? 'Aktualisieren...' : 'Statistiken aktualisieren'}
          </button>
        }
        loading={isRefreshing}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            icon="💾"
            label="Speicherverbrauch"
            value={`${getStoragePercentage()}%`}
            color="blue"
            loading={!cacheStats}
          />
          <StatsCard
            icon="🔍"
            label="Aktive Abfragen"
            value={queryStats?.activeQueries || 0}
            color="green"
            loading={!queryStats}
          />
          <StatsCard
            icon="📊"
            label="Gesamte Abfragen"
            value={queryStats?.totalQueries || 0}
            color="purple"
            loading={!queryStats}
          />
          <StatsCard
            icon="🖼️"
            label="Gecachte Bilder"
            value={imageStats?.cachedImages || 0}
            color="orange"
            loading={!imageStats}
          />
        </div>
      </AdminCard>

      {/* Cache Statistics */}
      {cacheStats && (
        <AdminCard
          title="Cache Statistiken"
          icon="💾"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Browser Speicher</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">localStorage Einträge:</span>
                  <span className="font-medium">{cacheStats.localStorageEntries}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Cache API Einträge:</span>
                  <span className="font-medium">{cacheStats.cacheApiEntries}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Verwendeter Speicher:</span>
                  <span className="font-medium">{formatBytes(cacheStats.usage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Speicher Kontingent:</span>
                  <span className="font-medium">{formatBytes(cacheStats.quota)}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Speicherverbrauch</h4>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div 
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${getStoragePercentage()}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getStoragePercentage()}% des verfügbaren Speichers verwendet
              </p>
            </div>
          </div>
        </AdminCard>
      )}

      {/* Query Statistics */}
      {queryStats && (
        <AdminCard
          title="Abfrage Statistiken"
          icon="🔍"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm font-medium text-gray-900 dark:text-white">Gesamte Abfragen</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{queryStats.totalQueries}</div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-sm font-medium text-gray-900 dark:text-white">Aktive Abfragen</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{queryStats.activeQueries}</div>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-sm font-medium text-gray-900 dark:text-white">Veraltete Abfragen</div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{queryStats.staleQueries}</div>
            </div>
          </div>
        </AdminCard>
      )}

      {/* Image Cache Statistics */}
      {imageStats && (
        <AdminCard
          title="Bild Cache Statistiken"
          icon="🖼️"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Cached Images:</span>
                <span className="font-medium">{imageStats.cachedImages || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Cache Hits:</span>
                <span className="font-medium">{imageStats.cacheHits || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Cache Misses:</span>
                <span className="font-medium">{imageStats.cacheMisses || 0}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Hit Rate:</span>
                <span className="font-medium">
                  {imageStats.cacheHits && imageStats.cacheMisses 
                    ? `${Math.round((imageStats.cacheHits / (imageStats.cacheHits + imageStats.cacheMisses)) * 100)}%`
                    : '0%'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Requests:</span>
                <span className="font-medium">{(imageStats.cacheHits || 0) + (imageStats.cacheMisses || 0)}</span>
              </div>
            </div>
          </div>
        </AdminCard>
      )}

      {/* Rate Limiting Information */}
      <AdminCard
        title="Rate Limiting"
        icon="🛡️"
        variant="warning"
      >
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Server-side Rate Limiting:</strong> Rate limiting is handled by the server using express-rate-limit. 
            Client-side monitoring is not available for security reasons.
          </p>
        </div>
      </AdminCard>
    </div>
  );
}
