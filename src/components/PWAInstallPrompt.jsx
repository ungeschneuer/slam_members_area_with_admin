import React, { useState, useEffect } from 'react';
import pwaService from '../services/pwaService.js';

export default function PWAInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    // Listen for PWA events
    const handleInstallAvailable = (event) => {
      setCanInstall(event.detail.canInstall);
      if (event.detail.canInstall) {
        setShowInstallPrompt(true);
      }
    };

    const handleOnlineStatus = (event) => {
      setIsOnline(event.detail.isOnline);
    };

    const handleUpdateAvailable = (event) => {
      setUpdateAvailable(event.detail.updateAvailable);
      if (event.detail.updateAvailable) {
        setShowUpdatePrompt(true);
      }
    };

    // Add event listeners
    window.addEventListener('pwa:install-available', handleInstallAvailable);
    window.addEventListener('pwa:online-status', handleOnlineStatus);
    window.addEventListener('pwa:update-available', handleUpdateAvailable);

    // Get initial status
    const status = pwaService.getStatus();
    setIsInstalled(status.isInstalled);
    setIsOnline(status.isOnline);
    setUpdateAvailable(status.updateAvailable);
    setCanInstall(status.canInstall);

    return () => {
      window.removeEventListener('pwa:install-available', handleInstallAvailable);
      window.removeEventListener('pwa:online-status', handleOnlineStatus);
      window.removeEventListener('pwa:update-available', handleUpdateAvailable);
    };
  }, []);

  const handleInstall = async () => {
    const success = await pwaService.installPWA();
    if (success) {
      setShowInstallPrompt(false);
      setIsInstalled(true);
    }
  };

  const handleUpdate = async () => {
    const success = await pwaService.updateServiceWorker();
    if (success) {
      setShowUpdatePrompt(false);
      setUpdateAvailable(false);
    }
  };

  const handleRequestNotifications = async () => {
    await pwaService.requestNotificationPermission();
  };

  const handleShare = async () => {
    await pwaService.shareContent({
      title: 'SLAM25 Poetry Slam',
      text: 'Entdecke die SLAM25 Poetry Slam Community!',
      url: window.location.href
    });
  };

  if (isInstalled && !updateAvailable && !showInstallPrompt) {
    return null;
  }

  return (
    <>
      {/* Install Prompt */}
      {showInstallPrompt && canInstall && !isInstalled && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-300 text-lg">📱</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">SLAM25 installieren</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Für die beste Erfahrung installieren Sie die App
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowInstallPrompt(false)}
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Später
              </button>
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Installieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Prompt */}
      {showUpdatePrompt && updateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <span className="text-green-600 dark:text-green-300 text-lg">🔄</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Update verfügbar</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Eine neue Version ist verfügbar
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowUpdatePrompt(false)}
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Später
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Aktualisieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Status */}
      {!isOnline && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600 dark:text-yellow-300">⚠️</span>
            <span className="text-yellow-800 dark:text-yellow-200 text-sm font-medium">
              Sie sind offline. Einige Funktionen sind möglicherweise nicht verfügbar.
            </span>
          </div>
        </div>
      )}

      {/* PWA Features Menu (for installed PWA) */}
      {isInstalled && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="relative group">
            <button className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
              <span className="text-lg">⚙️</span>
            </button>
            
            <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 min-w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="space-y-1">
                <button
                  onClick={handleRequestNotifications}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center space-x-2"
                >
                  <span>🔔</span>
                  <span>Benachrichtigungen</span>
                </button>
                
                {navigator.share && (
                  <button
                    onClick={handleShare}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center space-x-2"
                  >
                    <span>📤</span>
                    <span>Teilen</span>
                  </button>
                )}
                
                <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                
                <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  <div>Status: {isOnline ? '🟢 Online' : '🔴 Offline'}</div>
                  <div>Installiert: {isInstalled ? '✅ Ja' : '❌ Nein'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}













