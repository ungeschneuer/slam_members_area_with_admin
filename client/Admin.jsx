import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import authService from './services/authService.js';
import { AdminLayout } from './components/admin/AdminLayout.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { usePageTitle } from './hooks/index.js';

// Import all admin components
import AdminDashboard from './components/admin/AdminDashboard.jsx';
import AdminParticipants from './components/admin/AdminParticipants';
import TeamsAdmin from './components/admin/TeamsAdmin.jsx';
import AdminRounds from './components/admin/AdminRounds';
import AdminNews from './components/admin/AdminNews';
import AdminNewsCreate from './components/admin/AdminNewsCreate.jsx';
import AdminTimetable from './components/admin/AdminTimetable';
import AdminCityTips from './components/admin/AdminCityTips';
import AdminInfoPages from './components/admin/AdminInfoPages';
import AdminLinks from './components/admin/AdminLinks';
import AdminSchnellzugriff from './components/admin/AdminSchnellzugriff.jsx';
import AdminCountdown from './components/admin/AdminCountdown';
// AdminPerformance and AdminSecurity removed as part of simplification
// AdminAnalytics, AdminCache, and OperationLogViewer removed as part of simplification

function AdminLogin({ onLogin }) {
  usePageTitle('Admin Login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [rememberMe, setRememberMe] = useState(false);

  async function login(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Use the unified authService for all environments
      const result = await authService.login(email, password, rememberMe);
      
      if (result.success) {
        setLoginAttempts(0);
        onLogin();
      } else {
        setLoginAttempts(prev => prev + 1);
        setError(result.error || "Login failed. Please try again.");
        
        // Lock out after 5 failed attempts
        if (loginAttempts >= 4) {
          setError("Too many failed attempts. Please try again later.");
          setLoading(true);
          setTimeout(() => {
            setLoading(false);
            setLoginAttempts(0);
          }, 30000); // 30 second lockout
          return;
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError("Login failed. Please try again.");
    }
    
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Access
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Enter your credentials to manage SLAM25
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={login}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all duration-200"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all duration-200"
              disabled={loading}
              required
            />
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Remember me for 7 days
            </label>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{error?.message || error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              {loading ? 'Signing in...' : 'Sign in to Admin Panel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Admin Panel with routing
function AdminPanel() {
  return (
    <AdminLayout>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<AdminDashboard />} />
        
        {/* Competition */}
        <Route path="/participants" element={<AdminParticipants />} />
        <Route path="/teams" element={<TeamsAdmin />} />
        <Route path="/rounds" element={<AdminRounds />} />
        <Route path="/timetable" element={<AdminTimetable />} />
        
        {/* Content */}
        <Route path="/news" element={<AdminNews />} />
        <Route path="/news/new" element={<AdminNewsCreate />} />
        <Route path="/city-tips" element={<AdminCityTips />} />
        <Route path="/info-pages" element={<AdminInfoPages />} />
        
        {/* Settings */}
        <Route path="/links" element={<AdminLinks />} />
        <Route path="/schnellzugriff" element={<AdminSchnellzugriff />} />
        <Route path="/countdown" element={<AdminCountdown />} />
        
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return <AdminLogin onLogin={() => setAuthed(true)} />;
  }

  return (
    <ErrorBoundary name="AdminPanel" showDetails>
      <AdminPanel />
    </ErrorBoundary>
  );
}

export const __testExports = { AdminLogin };
