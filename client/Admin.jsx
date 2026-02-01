import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import authService from './services/authService.js';
import { AdminLayout } from './components/admin/AdminLayout.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { usePageTitle } from './hooks/index.js';
import LoginForm from './components/LoginForm.jsx';

// Import all admin components
import AdminDashboard from './components/admin/AdminDashboard.jsx';
import AdminParticipants from './components/admin/AdminParticipants';
import AdminParticipantsForm from './components/admin/AdminParticipantsForm.jsx';
import TeamsAdmin from './components/admin/TeamsAdmin.jsx';
import AdminTeamsForm from './components/admin/AdminTeamsForm.jsx';
import AdminRounds from './components/admin/AdminRounds';
import AdminNews from './components/admin/AdminNews';
import AdminNewsCreate from './components/admin/AdminNewsCreate.jsx';
import AdminNewsEdit from './components/admin/AdminNewsEdit.jsx';
import AdminTimetable from './components/admin/AdminTimetable';
import AdminCityTips from './components/admin/AdminCityTips';
import AdminCityTipsForm from './components/admin/AdminCityTipsForm.jsx';
import AdminInfoPages from './components/admin/AdminInfoPages';
import AdminLinks from './components/admin/AdminLinks';
import AdminLinksForm from './components/admin/AdminLinksForm.jsx';
import AdminSchnellzugriff from './components/admin/AdminSchnellzugriff.jsx';
import AdminCountdown from './components/admin/AdminCountdown';
import AdminUserPassword from './components/admin/AdminUserPassword.jsx';
import AdminSiteSettings from './components/admin/AdminSiteSettings.jsx';
// AdminPerformance and AdminSecurity removed as part of simplification
// AdminAnalytics, AdminCache, and OperationLogViewer removed as part of simplification


// Admin Panel with routing
function AdminPanel() {
  return (
    <AdminLayout>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<AdminDashboard />} />

        {/* Competition */}
        <Route path="/participants" element={<AdminParticipants />} />
        <Route path="/participants/new" element={<AdminParticipantsForm />} />
        <Route path="/participants/:id/edit" element={<AdminParticipantsForm />} />

        <Route path="/teams" element={<TeamsAdmin />} />
        <Route path="/teams/new" element={<AdminTeamsForm />} />
        <Route path="/teams/:id/edit" element={<AdminTeamsForm />} />

        <Route path="/rounds" element={<AdminRounds />} />
        <Route path="/timetable" element={<AdminTimetable />} />

        {/* Content */}
        <Route path="/news" element={<AdminNews />} />
        <Route path="/news/new" element={<AdminNewsCreate />} />
        <Route path="/news/:id/edit" element={<AdminNewsEdit />} />

        <Route path="/city-tips" element={<AdminCityTips />} />
        <Route path="/city-tips/new" element={<AdminCityTipsForm />} />
        <Route path="/city-tips/:id/edit" element={<AdminCityTipsForm />} />

        <Route path="/info-pages" element={<AdminInfoPages />} />

        {/* Settings */}
        <Route path="/links" element={<AdminLinks />} />
        <Route path="/links/new" element={<AdminLinksForm />} />
        <Route path="/links/:id/edit" element={<AdminLinksForm />} />
        <Route path="/schnellzugriff" element={<AdminSchnellzugriff />} />
        <Route path="/countdown" element={<AdminCountdown />} />
        <Route path="/user-password" element={<AdminUserPassword />} />
        <Route path="/site-settings" element={<AdminSiteSettings />} />

        {/* System routes removed as part of simplification */}

        {/* Redirect unknown routes to dashboard */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
}



export default function Admin() {
  usePageTitle('Admin Dashboard');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize authentication on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (import.meta.env.DEV) console.log('Initializing admin authentication with cookies...');
        
        // Prefer adminAuthService if available (test/mocked env)
        let adminAuthed = false;
        try {
          const state = typeof adminAuthService.getAuthState === 'function' ? adminAuthService.getAuthState() : null;
          if (state && typeof state.isAuthenticated !== 'undefined') {
            adminAuthed = !!state.isAuthenticated;
          } else if (typeof adminAuthService.isAuthenticated === 'function') {
            const maybePromise = adminAuthService.isAuthenticated();
            adminAuthed = await Promise.resolve(maybePromise);
          }
        } catch {}

        if (adminAuthed) {
          if (import.meta.env.DEV) console.log('AdminAuthService indicates authenticated state');
          setAuthed(true);
        } else {
          // Initialize the authService and fallback check (only if not already initializing)
          if (typeof authService.isInitializing !== 'function' || !authService.isInitializing()) {
            if (typeof authService.init === 'function') {
              await Promise.resolve(authService.init());
            }
          }
          if (typeof authService.isLoggedIn === 'function' && authService.isLoggedIn()) {
            if (import.meta.env.DEV) console.log('Authentication successful via service:', authService.getCurrentUserSync?.());
            setAuthed(true);
          } else {
            if (import.meta.env.DEV) console.log('No valid authentication found');
            setAuthed(false);
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error('Authentication initialization failed:', error);
        setAuthed(false);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Check authentication status periodically
  useEffect(() => {
    if (authed) {
      const interval = setInterval(async () => {
        try {
          // Use authService to check authentication
          if (!authService.isLoggedIn()) {
            if (import.meta.env.DEV) console.log('Authentication expired, logging out');
            setAuthed(false);
          }
        } catch (error) {
          if (import.meta.env.DEV) console.error('Authentication check failed:', error);
          setAuthed(false);
        }
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [authed]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return <LoginForm onLogin={() => setAuthed(true)} />;
  }

  return (
    <ErrorBoundary name="AdminPanel" showDetails>
      <AdminPanel />
    </ErrorBoundary>
  );
}

