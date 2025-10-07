import React, { useState, useEffect } from 'react';
import { useParticipants } from '../../hooks/useParticipants.js';
import { useRounds } from '../../hooks/useRounds.js';
import { useNews } from '../../hooks/useNews.js';
import { useTimetable } from '../../hooks/useTimetable.js';
import { useCityTips } from '../../hooks/useCityTips.js';
import { useInfoPages } from '../../hooks/useInfoPages.js';
import LoadingSpinner from '../LoadingSpinner.jsx';
import { 
  useServiceHealth, 
  useSetServiceHealth
} from '../../stores/useAppStore.js';
import websocketService from '../../services/websocketService.js';

// Dashboard Components
import QuickStats from './dashboard/QuickStats.jsx';
import QuickActions from './dashboard/QuickActions.jsx';

// Ensure websocketService is properly imported
if (!websocketService) {
  console.error('WebSocket service not properly imported');
}

export default function AdminDashboard() {
  // Use TanStack Query hooks for data fetching
  const { data: participants = [], isLoading: participantsLoading, error: participantsError } = useParticipants();
  const { data: rounds = [], isLoading: roundsLoading, error: roundsError } = useRounds();
  const { data: news = [], isLoading: newsLoading, error: newsError } = useNews();
  const { data: timetable = [], isLoading: timetableLoading, error: timetableError } = useTimetable();
  const { data: cityTips = [], isLoading: cityTipsLoading, error: cityTipsError } = useCityTips();
  const { data: infoPages = [], isLoading: infoPagesLoading, error: infoPagesError } = useInfoPages();

  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);

  // Simplified dashboard state

  // Initialize default health status

  const loading = participantsLoading || roundsLoading || newsLoading || timetableLoading || cityTipsLoading || infoPagesLoading;
  const error = participantsError || roundsError || newsError || timetableError || cityTipsError || infoPagesError;

  // Initialize WebSocket connection on component mount
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize WebSocket connection
        if (websocketService && !websocketService.isConnected) {
          console.log('AdminDashboard: Initializing WebSocket connection...');
          await websocketService.connect();
        }
        if (websocketService) {
          websocketService.joinAdminRoom();
        }

        // Load dashboard data
        await loadDashboardData();
      } catch (error) {
        console.warn('AdminDashboard: Service initialization failed:', error);
      }
    };

    initializeServices();
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
      // Initialize WebSocket connection for admin
      try {
        if (websocketService && !websocketService.isConnected) {
          console.log('Connecting WebSocket for admin dashboard...');
          await websocketService.connect();
        }
        if (websocketService) {
          websocketService.joinAdminRoom();
        }
      } catch (wsError) {
        console.warn('WebSocket connection failed:', wsError);
      }

      
      // Debug logging
      console.log('AdminDashboard: Loaded data:', {
        participants: participants.length,
        rounds: rounds.length,
        news: news.length,
        timetable: timetable.length,
        cityTips: cityTips.length,
        infoPages: infoPages.length
      });

      console.log('AdminDashboard: Dashboard data loaded successfully');
    } catch (err) {
      setDashboardError(err.message);
      console.error('Error loading dashboard data:', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    // Removed automatic polling - rely on WebSocket updates for real-time data
  }, []);



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
        <p className="text-red-800 dark:text-red-200">Fehler beim Laden der Dashboard-Daten: {error}</p>
      </div>
    );
  }

  return (
    <div data-testid="admin-dashboard" className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Admin Dashboard</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">SLAM25 Wettbewerb und Inhalte verwalten</p>
      </div>


      {/* Quick Stats */}
      <QuickStats
        stats={stats}
        loading={loading}
      />


      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
}