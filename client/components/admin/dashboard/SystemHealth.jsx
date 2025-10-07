import React from 'react';
import AdminCard from '../ui/AdminCard.jsx';

export default function SystemHealth({ 
  systemHealth, 
  serviceHealth, 
  onManualCheck,
  loading = false 
}) {
  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'connected': 
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400';
      case 'unhealthy':
      case 'disconnected': 
        return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-400';
      case 'checking':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-400';
      default: 
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-400';
    }
  };

  const getHealthIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'connected': 
        return '✅';
      case 'unhealthy':
      case 'disconnected': 
        return '❌';
      case 'checking':
        return '🔄';
      default: 
        return '⚠️';
    }
  };
  
  const getStatusDisplayText = (status) => {
    switch (status) {
      case 'connected': return 'Verbunden';
      case 'disconnected': return 'Getrennt';
      case 'healthy': return 'Gesund';
      case 'unhealthy': return 'Ungesund';
      case 'checking': return 'Prüfung...';
      case 'unknown': return 'Unbekannt';
      default: return status;
    }
  };

  const databaseStatus = (serviceHealth.database?.status) || systemHealth.database;
  const websocketStatus = (serviceHealth.websocket?.status) || systemHealth.websocket;
  const overallStatus = (serviceHealth.overall?.status) || systemHealth.overall;

  return (
    <AdminCard
      title="System Status"
      icon="🔍"
      headerActions={
        <div className="flex gap-2">
          <button
            onClick={onManualCheck}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
          >
            🔍 Gesundheitsprüfung
          </button>
        </div>
      }
      loading={loading}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg ${getHealthColor(databaseStatus)}`}>
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getHealthIcon(databaseStatus)}</span>
            <span className="font-medium">Datenbank</span>
          </div>
          <p className="text-sm mt-1">{getStatusDisplayText(databaseStatus)}</p>
        </div>
        
        <div className={`p-4 rounded-lg ${getHealthColor(websocketStatus)}`}>
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getHealthIcon(websocketStatus)}</span>
            <span className="font-medium">WebSocket</span>
          </div>
          <p className="text-sm mt-1">{getStatusDisplayText(websocketStatus)}</p>
        </div>
        
        <div className={`p-4 rounded-lg ${getHealthColor(overallStatus)}`}>
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getHealthIcon(overallStatus)}</span>
            <span className="font-medium">Gesamtsystem</span>
          </div>
          <p className="text-sm mt-1">{getStatusDisplayText(overallStatus)}</p>
        </div>
      </div>
    </AdminCard>
  );
}
