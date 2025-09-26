import React, { useState, useEffect } from 'react';
import hybridDataService from '../../services/hybridDataService.js';
import healthMonitor from '../../services/healthMonitor.js';
import errorHandler from '../../services/errorHandler.js';
import LoadingSpinner from '../LoadingSpinner.jsx';

export default function AdminDashboard({ setCurrentView }) {
  const [stats, setStats] = useState({
    participants: 0,
    rounds: 0,
    news: 0,
    events: 0,
    cityTips: 0,
    infoPages: 0
  });
  const [systemHealth, setSystemHealth] = useState({
    database: 'unknown',
    websocket: 'unknown',
    overall: 'unknown'
  });
  const [lastHealthUpdate, setLastHealthUpdate] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Ensure health monitor is started
      if (!healthMonitor.isMonitoring) {
        console.log('Starting health monitor...');
        healthMonitor.startMonitoring();
      }
      
      // Load all data in parallel with better error handling
      const dataPromises = [
        hybridDataService.getData('participants').catch(err => {
          console.error('Error loading participants:', err);
          return [];
        }),
        hybridDataService.getData('rounds').catch(err => {
          console.error('Error loading rounds:', err);
          return [];
        }),
        hybridDataService.getData('news').catch(err => {
          console.error('Error loading news:', err);
          return [];
        }),
        hybridDataService.getData('timetable').catch(err => {
          console.error('Error loading timetable:', err);
          return [];
        }),
        hybridDataService.getData('city-tips').catch(err => {
          console.error('Error loading city tips:', err);
          return [];
        }),
        hybridDataService.getData('info-pages').catch(err => {
          console.error('Error loading info pages:', err);
          return [];
        })
      ];

      const [participants, rounds, news, timetable, cityTips, infoPages] = await Promise.all(dataPromises);

      // Debug logging
      console.log('AdminDashboard: Loaded data:', {
        participants: participants?.length || 0,
        rounds: rounds?.length || 0,
        news: news?.length || 0,
        timetable: timetable?.length || 0,
        cityTips: cityTips?.length || 0,
        infoPages: infoPages?.length || 0
      });

      setStats({
        participants: participants?.length || 0,
        rounds: rounds?.length || 0,
        news: news?.length || 0,
        events: timetable?.length || 0,
        cityTips: cityTips?.length || 0,
        infoPages: infoPages?.length || 0
      });

      // Get system health
      const health = healthMonitor.getOverallHealth();
      const services = healthMonitor.getAllServiceStatuses();
      const databaseService = services.find(s => s.name === 'database');
      
      // If no database service is registered, try to check health directly
      let databaseStatus = databaseService?.status || 'unknown';
      if (databaseStatus === 'unknown') {
        try {
          const response = await fetch('/api/health', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000),
            credentials: 'omit'
          });
          if (response.ok) {
            const healthData = await response.json();
            databaseStatus = healthData.status === 'OK' || healthData.status === 'healthy' ? 'healthy' : 'unhealthy';
          } else {
            databaseStatus = 'unhealthy';
          }
        } catch (error) {
          console.warn('Direct health check failed:', error);
          databaseStatus = 'unhealthy';
        }
      }
      
      // Check WebSocket connection
      let websocketStatus = 'unknown';
      try {
        // Import and check WebSocket service directly
        const wsService = await import('../../services/websocketService.js');
        const wsStatus = wsService.default.getConnectionStatus();
        console.log('WebSocket status check:', wsStatus);
        
        if (wsStatus?.isConnected) {
          websocketStatus = 'connected';
        } else {
          websocketStatus = 'disconnected';
          // If not connected, try to connect
          console.log('WebSocket not connected, attempting to connect...');
          wsService.default.connect();
          
          // Wait a moment and check again
          setTimeout(async () => {
            const newStatus = wsService.default.getConnectionStatus();
            if (newStatus?.isConnected) {
              setSystemHealth(prev => ({
                ...prev,
                websocket: 'connected',
                overall: prev.database === 'healthy' && 'connected' === 'connected' ? 'healthy' : 'unhealthy'
              }));
            }
          }, 2000);
        }
      } catch (error) {
        console.warn('WebSocket health check failed:', error);
        websocketStatus = 'disconnected';
      }
      
      setSystemHealth({
        database: databaseStatus,
        websocket: websocketStatus,
        overall: (health.isHealthy || databaseStatus === 'healthy') && websocketStatus === 'connected' ? 'healthy' : 'unhealthy'
      });
      setLastHealthUpdate(new Date());

      // Generate recent activity
      const activity = generateRecentActivity(participants, rounds, news, timetable);
      setRecentActivity(activity);

    } catch (err) {
      setError(err.message);
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Refresh data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);

    return () => clearInterval(interval);
  }, []);

  const generateRecentActivity = (participants, rounds, news, timetable) => {
    const activity = [];
    
    // Add recent participants
    if (participants?.length > 0) {
      const recentParticipants = participants
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 3);
      
      recentParticipants.forEach(p => {
        activity.push({
          type: 'participant',
          title: `Neuer Teilnehmer: ${p.name}`,
          description: `${p.role} aus ${p.region}`,
          timestamp: p.createdAt,
          icon: '👥'
        });
      });
    }

    // Add recent news
    if (news?.length > 0) {
      const recentNews = news
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 2);
      
      recentNews.forEach(n => {
        activity.push({
          type: 'news',
          title: `Neue Nachricht: ${n.title}`,
          description: n.excerpt || n.content?.substring(0, 100) + '...',
          timestamp: n.createdAt,
          icon: '📰'
        });
      });
    }

    // Add upcoming events
    if (timetable?.length > 0) {
      const upcomingEvents = timetable
        .filter(e => new Date(e.startDateTime) > new Date())
        .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime))
        .slice(0, 2);
      
      upcomingEvents.forEach(e => {
        activity.push({
          type: 'event',
          title: `Anstehende Veranstaltung: ${e.title}`,
          description: new Date(e.startDateTime).toLocaleDateString('de-DE'),
          timestamp: e.startDateTime,
          icon: '📅'
        });
      });
    }

    return activity.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  };

  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'connected': 
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400';
      case 'unhealthy':
      case 'disconnected': 
        return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-400';
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
      case 'unknown': return 'Unbekannt';
      default: return status;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Fehler beim Laden der Dashboard-Daten: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Admin Dashboard</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">SLAM25 Wettbewerb und Inhalte verwalten</p>
      </div>

      {/* System Health Status */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">System Status</h2>
          <button
            onClick={() => {
              setLoading(true);
              setTimeout(() => {
                loadDashboardData();
              }, 100);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            🔄 Aktualisieren
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg ${getHealthColor(systemHealth.database)}`}>
            <div className="flex items-center space-x-2">
              <span className="text-lg">{getHealthIcon(systemHealth.database)}</span>
              <span className="font-medium">Datenbank</span>
            </div>
            <p className="text-sm mt-1">{getStatusDisplayText(systemHealth.database)}</p>
          </div>
          <div className={`p-4 rounded-lg ${getHealthColor(systemHealth.websocket)}`}>
            <div className="flex items-center space-x-2">
              <span className="text-lg">{getHealthIcon(systemHealth.websocket)}</span>
              <span className="font-medium">WebSocket</span>
            </div>
            <p className="text-sm mt-1">{getStatusDisplayText(systemHealth.websocket)}</p>
          </div>
          <div className={`p-4 rounded-lg ${getHealthColor(systemHealth.overall)}`}>
            <div className="flex items-center space-x-2">
              <span className="text-lg">{getHealthIcon(systemHealth.overall)}</span>
              <span className="font-medium">Gesamtsystem</span>
            </div>
            <p className="text-sm mt-1">{getStatusDisplayText(systemHealth.overall)}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Schnellübersicht</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mx-auto mb-2">
              <span className="text-xl">👥</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Teilnehmer</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.participants}</p>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center mx-auto mb-2">
              <span className="text-xl">🎭</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Runden</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.rounds}</p>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center mx-auto mb-2">
              <span className="text-xl">📰</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Nachrichten</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.news}</p>
          </div>
          <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-xl flex items-center justify-center mx-auto mb-2">
              <span className="text-xl">📅</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Veranstaltungen</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.events}</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-xl flex items-center justify-center mx-auto mb-2">
              <span className="text-xl">🗺️</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Stadt-Tipps</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.cityTips}</p>
          </div>
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-xl flex items-center justify-center mx-auto mb-2">
              <span className="text-xl">📋</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Info-Seiten</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.infoPages}</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Letzte Aktivitäten</h2>
        <div className="space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-lg">{activity.icon}</span>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">{activity.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {new Date(activity.timestamp).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">Keine aktuellen Aktivitäten</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Schnellaktionen</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => setCurrentView('participants')}
            className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-left"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">👥</span>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Teilnehmer hinzufügen</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Neuen Teilnehmer registrieren</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => setCurrentView('news')}
            className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors text-left"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📰</span>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Nachricht erstellen</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Neue Ankündigung veröffentlichen</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => setCurrentView('timetable')}
            className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors text-left"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📅</span>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Event planen</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Neue Veranstaltung hinzufügen</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
