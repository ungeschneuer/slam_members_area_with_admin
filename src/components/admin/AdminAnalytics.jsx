import React, { useState, useEffect } from 'react';
import hybridDataService from '../../services/hybridDataService.js';

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState({
    participants: {
      total: 0,
      byRegion: {},
      byRole: {},
      growth: []
    },
    rounds: {
      total: 0,
      completed: 0,
      upcoming: 0,
      participation: []
    },
    news: {
      total: 0,
      byCategory: {},
      engagement: []
    },
    events: {
      total: 0,
      upcoming: 0,
      past: 0,
      attendance: []
    }
  });
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const [participants, rounds, news, timetable, cityTips, infoPages] = await Promise.all([
        hybridDataService.getData('participants'),
        hybridDataService.getData('rounds'),
        hybridDataService.getData('news'),
        hybridDataService.getData('timetable'),
        hybridDataService.getData('city-tips'),
        hybridDataService.getData('info-pages')
      ]);

      const analyticsData = generateAnalytics(participants, rounds, news, timetable, cityTips, infoPages);
      setAnalytics(analyticsData);

    } catch (err) {
      setError(err.message);
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateAnalytics = (participants, rounds, news, timetable, cityTips, infoPages) => {
    // Participants analytics
    const participantAnalytics = {
      total: participants?.length || 0,
      byRegion: {},
      byRole: {},
      growth: []
    };

    if (participants) {
      participants.forEach(p => {
        // By region
        participantAnalytics.byRegion[p.region] = (participantAnalytics.byRegion[p.region] || 0) + 1;
        // By role
        participantAnalytics.byRole[p.role] = (participantAnalytics.byRole[p.role] || 0) + 1;
      });
    }

    // Rounds analytics
    const roundAnalytics = {
      total: rounds?.length || 0,
      completed: 0,
      upcoming: 0,
      participation: []
    };

    if (rounds) {
      const now = new Date();
      rounds.forEach(r => {
        const roundDate = new Date(r.startDateTime);
        if (roundDate < now) {
          roundAnalytics.completed++;
        } else {
          roundAnalytics.upcoming++;
        }
      });
    }

    // News analytics
    const newsAnalytics = {
      total: news?.length || 0,
      byCategory: {},
      engagement: []
    };

    if (news) {
      news.forEach(n => {
        const category = n.category || 'general';
        newsAnalytics.byCategory[category] = (newsAnalytics.byCategory[category] || 0) + 1;
      });
    }

    // Events analytics
    const eventAnalytics = {
      total: timetable?.length || 0,
      upcoming: 0,
      past: 0,
      attendance: []
    };

    if (timetable) {
      const now = new Date();
      timetable.forEach(e => {
        const eventDate = new Date(e.startDateTime);
        if (eventDate < now) {
          eventAnalytics.past++;
        } else {
          eventAnalytics.upcoming++;
        }
      });
    }

    return {
      participants: participantAnalytics,
      rounds: roundAnalytics,
      news: newsAnalytics,
      events: eventAnalytics
    };
  };

  const exportReport = (type) => {
    const reportData = {
      timestamp: new Date().toISOString(),
      timeRange,
      analytics
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slam25_analytics_${type}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTopRegions = () => {
    const regions = Object.entries(analytics.participants.byRegion)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    return regions;
  };

  const getTopRoles = () => {
    const roles = Object.entries(analytics.participants.byRole)
      .sort(([,a], [,b]) => b - a);
    return roles;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Fehler beim Laden der Analytics: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Analytics & Berichte</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">Datenanalyse und Einblicke für SLAM25</p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Zeitraum:</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="7d">Letzte 7 Tage</option>
              <option value="30d">Letzte 30 Tage</option>
              <option value="90d">Letzte 90 Tage</option>
              <option value="1y">Letztes Jahr</option>
              <option value="all">Gesamter Zeitraum</option>
            </select>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => exportReport('summary')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Export Zusammenfassung
            </button>
            <button
              onClick={() => exportReport('detailed')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Export Detailliert
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Gesamt Teilnehmer</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.participants.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
              <span className="text-xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Aktive Runden</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.rounds.upcoming}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center">
              <span className="text-xl">🎭</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Veröffentlichte Nachrichten</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.news.total}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center">
              <span className="text-xl">📰</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Anstehende Events</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.events.upcoming}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-xl flex items-center justify-center">
              <span className="text-xl">📅</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Participants by Region */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Teilnehmer nach Region</h2>
          <div className="space-y-3">
            {getTopRegions().map(([region, count]) => (
              <div key={region} className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">{region}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(count / analytics.participants.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Participants by Role */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Teilnehmer nach Rolle</h2>
          <div className="space-y-3">
            {getTopRoles().map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">{role}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full" 
                      style={{ width: `${(count / analytics.participants.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* News by Category */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Nachrichten nach Kategorie</h2>
          <div className="space-y-3">
            {Object.entries(analytics.news.byCategory).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300 capitalize">{category}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(count / analytics.news.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Round Status */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Runden Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Abgeschlossen</span>
              <span className="text-2xl font-bold text-green-600">{analytics.rounds.completed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Anstehend</span>
              <span className="text-2xl font-bold text-blue-600">{analytics.rounds.upcoming}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Gesamt</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.rounds.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Einblicke & Empfehlungen</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📈 Teilnehmer-Wachstum</h3>
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                {analytics.participants.total > 20 
                  ? `Starkes Wachstum mit ${analytics.participants.total} Teilnehmern!` 
                  : `Weitere Teilnehmer-Werbung empfohlen. Aktuell: ${analytics.participants.total}`
                }
              </p>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">🎯 Engagement</h3>
              <p className="text-green-800 dark:text-green-200 text-sm">
                {analytics.news.total > 10 
                  ? 'Gute Kommunikation mit regelmäßigen Updates' 
                  : 'Mehr Nachrichten für bessere Teilnehmer-Engagement empfohlen'
                }
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">📅 Event-Planung</h3>
              <p className="text-purple-800 dark:text-purple-200 text-sm">
                {analytics.events.upcoming > 0 
                  ? `${analytics.events.upcoming} anstehende Events geplant` 
                  : 'Weitere Events für bessere Teilnehmer-Bindung empfohlen'
                }
              </p>
            </div>
            
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">⚡ Optimierung</h3>
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                {analytics.rounds.completed > analytics.rounds.upcoming 
                  ? 'Gute Balance zwischen abgeschlossenen und anstehenden Runden' 
                  : 'Mehr Runden-Aktivität für kontinuierliches Engagement empfohlen'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
