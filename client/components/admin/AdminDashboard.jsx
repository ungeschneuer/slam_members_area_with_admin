import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useParticipants } from '../../hooks/useParticipants.js';
import { useRounds } from '../../hooks/useRounds.js';
import { useNews } from '../../hooks/useNews.js';
import { useTimetable } from '../../hooks/useTimetable.js';
import { useCityTips } from '../../hooks/useCityTips.js';
import { useInfoPages } from '../../hooks/useInfoPages.js';
import LoadingSpinner from '../LoadingSpinner.jsx';
import logger from '../../services/logger.js';
// Service health monitoring removed - using simple polling instead

// Dashboard Components
// QuickStats component removed as part of simplification
// QuickActions component removed as part of simplification

// WebSocket service removed - using simple polling instead

export default function AdminDashboard() {
  // Use TanStack Query hooks for data fetching with admin flag for immediate updates
  const { data: participantsData = { data: [] }, isLoading: participantsLoading, error: participantsError } = useParticipants(undefined, true);
  const { data: rounds = [], isLoading: roundsLoading, error: roundsError } = useRounds(undefined, true);
  const { data: news = [], isLoading: newsLoading, error: newsError } = useNews(undefined, true);
  const { data: timetable = [], isLoading: timetableLoading, error: timetableError } = useTimetable(undefined, true);
  
  // Extract the actual participants array from the data structure
  const participants = participantsData?.data || [];
  const { data: cityTips = [], isLoading: cityTipsLoading, error: cityTipsError } = useCityTips(undefined, true);
  const { data: infoPages = [], isLoading: infoPagesLoading, error: infoPagesError } = useInfoPages(undefined, true);

  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);

  // Simplified dashboard state

  // Initialize default health status

  const loading = participantsLoading || roundsLoading || newsLoading || timetableLoading || cityTipsLoading || infoPagesLoading;
  const error = participantsError || roundsError || newsError || timetableError || cityTipsError || infoPagesError;

  // WebSocket service removed - using simple polling instead
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadDashboardData();
      } catch (error) {
        logger.warn('AdminDashboard: Data loading failed', { error: error.message });
      }
    };

    loadData();
  }, []);

  // Calculate stats from TanStack Query data
  const stats = React.useMemo(() => ({
    participants: participants.length,
    rounds: rounds.length,
    news: news.length,
    events: timetable.length,
    cityTips: cityTips.length,
    infoPages: infoPages.length
  }), [participants, rounds, news, timetable, cityTips, infoPages]);

  const loadDashboardData = async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      // WebSocket service removed - using simple polling instead

      
      logger.debug('AdminDashboard: Loaded data', {
        participants: participants.length,
        rounds: rounds.length,
        news: news.length,
        timetable: timetable.length,
        cityTips: cityTips.length,
        infoPages: infoPages.length
      });
    } catch (err) {
      setDashboardError(err.message);
      logger.error('Error loading dashboard data', { error: err.message });
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    // Log counts when data changes
    logger.debug('AdminDashboard: Current counts', {
      participants: participants.length,
      rounds: rounds.length,
      news: news.length,
      timetable: timetable.length,
      cityTips: cityTips.length,
      infoPages: infoPages.length
    });
  }, [participants, rounds, news, timetable, cityTips, infoPages]);



  const handleRefresh = () => {
    setDashboardLoading(true);
    setTimeout(() => {
      loadDashboardData();
    }, 100);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Fehler beim Laden der Dashboard-Daten: {error?.message || error}</p>
      </div>
    );
  }

  return (
    <div data-testid="admin-dashboard" className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Admin-Dashboard</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">SLAM25 Wettbewerb und Inhalte verwalten</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Teilnehmer*innen" value={stats.participants} to="/admin/participants" icon="👥" />
        <StatCard label="Runden" value={stats.rounds} to="/admin/rounds" icon="🎭" />
        <StatCard label="Nachrichten" value={stats.news} to="/admin/news" icon="📰" />
        <StatCard label="Zeitplan-Einträge" value={stats.events} to="/admin/timetable" icon="📅" />
        <StatCard label="Stadt-Tipps" value={stats.cityTips} to="/admin/city-tips" icon="🗺️" />
        <StatCard label="Info-Seiten" value={stats.infoPages} to="/admin/info-pages" icon="📋" />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/admin/news/new" className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
          + Neue Nachricht
        </Link>
        <Link to="/admin/participants" className="inline-flex items-center px-3 py-2 rounded-lg bg-gray-900 hover:bg-black text-white text-sm font-medium transition-colors dark:bg-gray-700 dark:hover:bg-gray-600">
          Teilnehmer*innen verwalten
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, to, icon }) {
  return (
    <Link to={to} className="block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-300">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</div>
        </div>
        <div className="text-2xl" aria-hidden>{icon}</div>
      </div>
    </Link>
  );
}