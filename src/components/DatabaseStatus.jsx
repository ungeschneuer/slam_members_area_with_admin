import React, { useState, useEffect } from 'react';
import hybridDataService from '../services/hybridDataService.js';
import websocketService from '../services/websocketService.js';

export default function DatabaseStatus() {
  const [status, setStatus] = useState({
    useDatabase: false,
    connectionStatus: 'disconnected',
    lastUpdate: null,
    websocketConnected: false
  });



  useEffect(() => {
    const updateStatus = async () => {
      try {
        // Ensure services are initialized
        if (typeof hybridDataService.initializeData === 'function') {
          await hybridDataService.initializeData();
        }
        
        // Direct health check as fallback
        let isConnected = false;
        try {
          console.log('DatabaseStatus: Performing direct health check...');
          const response = await fetch('/api/health', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000)
          });
          if (response.ok) {
            const healthData = await response.json();
            isConnected = healthData.status === 'OK' || healthData.status === 'healthy';
            console.log('DatabaseStatus: Direct health check result:', isConnected);
          } else {
            console.warn('DatabaseStatus: Health check returned status:', response.status);
          }
        } catch (healthError) {
          console.warn('DatabaseStatus: Direct health check failed:', healthError);
        }
        
        const dbStatus = hybridDataService.getDatabaseStatus();
        const wsStatus = websocketService.getConnectionStatus();
        
        setStatus({
          useDatabase: isConnected || dbStatus?.isConnected || false,
          connectionStatus: (isConnected || dbStatus?.isConnected) ? 'connected' : 'disconnected',
          lastUpdate: new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' }),
          websocketConnected: wsStatus?.isConnected || false
        });
      } catch (error) {
        console.error('DatabaseStatus: Error updating status:', error);
        setStatus(prev => ({
          ...prev,
          useDatabase: false,
          connectionStatus: 'error',
          websocketConnected: false,
          lastUpdate: new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })
        }));
      }
    };

    // Update immediately
    updateStatus();

    // Update every 5 seconds
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);



  const getStatusColor = () => {
    if (status?.useDatabase && status?.connectionStatus === 'connected') {
      return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
    } else if (status?.connectionStatus === 'fallback') {
      return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
    } else {
      return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
    }
  };

  const getStatusIcon = () => {
    if (status?.useDatabase && status?.connectionStatus === 'connected') {
      return '🟢';
    } else if (status?.connectionStatus === 'fallback') {
      return '🟡';
    } else {
      return '🔴';
    }
  };

  const getStatusText = () => {
    if (status?.useDatabase && status?.connectionStatus === 'connected') {
      return 'Datenbank verbunden';
    } else if (status?.connectionStatus === 'fallback') {
      return 'Lokaler Speicher';
    } else {
      return 'Nicht verbunden';
    }
  };

  const getWebSocketIcon = () => {
    return status?.websocketConnected ? '🔌' : '🔌';
  };

  // Debug logging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('DatabaseStatus: Current status:', status);
    }
  }, [status]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`px-3 py-2 rounded-lg shadow-lg border text-sm font-medium ${getStatusColor()}`}>
        <div className="flex items-center space-x-2">
          <span>{getStatusIcon()}</span>
          <span>{getStatusText()}</span>
          <span className={`text-xs ${status?.websocketConnected ? 'text-green-600' : 'text-gray-400'}`}>
            {getWebSocketIcon()}
          </span>
          {status?.lastUpdate && (
            <span className="text-xs opacity-75">
              {status.lastUpdate}
            </span>
          )}

        </div>
        
        {/* Debug info - only show in development */}
        {import.meta.env.DEV && (
          <div className="text-xs opacity-50 mt-1">
            DB: {status?.connectionStatus || 'unknown'} | WS: {status?.websocketConnected ? 'on' : 'off'}
          </div>
        )}
        

      </div>
    </div>
  );
}
