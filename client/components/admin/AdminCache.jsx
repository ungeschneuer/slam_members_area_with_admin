import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AdminCard from './ui/AdminCard.jsx';

export default function AdminCache() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);

  useEffect(() => {
    // Load browser cache statistics
    (async () => {
      const storage = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : {};
      const cacheNames = 'caches' in window ? await caches.keys() : [];
      const localCount = Object.keys(localStorage).filter(k => k.startsWith('cache_')).length;
      setCacheStats({
        localStorageEntries: localCount,
        cacheApiEntries: cacheNames.length,
        usage: storage.usage || 0,
        quota: storage.quota || 0,
        cacheVersion: 'browser'
      });
    })();

    // Get TanStack Query cache info
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.getAll();

  }, [queryClient]);

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate all TanStack Query caches
      await queryClient.invalidateQueries();
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to force refresh:', error);
      alert('Fehler beim Aktualisieren der Daten');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearCache = () => {
    if (window.confirm('Möchten Sie wirklich alle Caches löschen?')) {
      // Clear Cache API
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            caches.delete(cacheName);
          });
        });
      }

      // Clear localStorage cache
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });

      // Use TanStack Query refresh instead of hard reload
      queryClient.invalidateQueries();
    }
  };


  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Cache Verwaltung</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">Verwalten Sie Anwendungs-Caches und Datenaktualisierung</p>
      </div>

      <AdminCard
        title="Cache Operationen"
        icon="💾"
        footerActions={
          <div className="flex space-x-3">
            <button
              onClick={handleForceRefresh}
              disabled={isRefreshing}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isRefreshing
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isRefreshing ? 'Aktualisiere...' : 'Daten aktualisieren'}
            </button>
            
            <button
              onClick={handleClearCache}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Alle Caches löschen
            </button>
            
          </div>
        }
      >
        {lastRefresh && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Letzte Aktualisierung: {lastRefresh}
          </p>
        )}
        
        {cacheStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm font-medium text-gray-900 dark:text-white">Version</div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{cacheStats.cacheVersion}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm font-medium text-gray-900 dark:text-white">localStorage</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">{cacheStats.localStorageEntries}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm font-medium text-gray-900 dark:text-white">Cache API</div>
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{cacheStats.cacheApiEntries}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm font-medium text-gray-900 dark:text-white">Speicher</div>
              <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {cacheStats.quota ? `${Math.round(((cacheStats.usage || 0)/ cacheStats.quota) * 100)}%` : '—'}
              </div>
            </div>
          </div>
        )}


        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Hinweis:</strong> Wenn Sie veraltete Daten sehen, verwenden Sie "Daten aktualisieren" 
            um alle Caches zu leeren und frische Daten vom Server zu laden.
          </p>
        </div>
      </AdminCard>
    </div>
  );
}
