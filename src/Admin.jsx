import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import sessionService from './services/sessionService.js';
import hybridDataService from './services/hybridDataService.js';
import SessionStatus from './components/SessionStatus.jsx';

import AdminParticipants from './components/admin/AdminParticipants';
import AdminRounds from './components/admin/AdminRounds';
import AdminNews from './components/admin/AdminNews';
import AdminTimetable from './components/admin/AdminTimetable';
import AdminCityTips from './components/admin/AdminCityTips';
import AdminInfoPages from './components/admin/AdminInfoPages';
import PerformanceMonitor from './components/admin/PerformanceMonitor';
import AdminDashboard from './components/admin/AdminDashboard.jsx';
import AdminSecurity from './components/admin/AdminSecurity.jsx';
import AdminAnalytics from './components/admin/AdminAnalytics.jsx';

// In a real app, this would be stored securely on the server
const ADMIN_PASSWORD = "slamAdmin2025";

function AdminLogin({ onLogin }) {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [rememberMe, setRememberMe] = useState(false);

  async function login(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (pw === ADMIN_PASSWORD) {
      setLoginAttempts(0);
      
      // Start session with remember me option
      sessionService.startSession(rememberMe);
      
      onLogin();
    } else {
      setLoginAttempts(prev => prev + 1);
      setError("Invalid password. Please try again.");
      
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
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Admin Password
            </label>
            <input
              id="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Enter admin password"
              className="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all duration-200"
              type="password"
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
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
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

function AdminPanel({ onLogout, currentView, setCurrentView }) {
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  function logout() {
    sessionService.logout();
    onLogout();
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMoreMenu && !event.target.closest('.admin-tools-menu')) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoreMenu]);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <AdminDashboard setCurrentView={setCurrentView} />;
      case 'participants':
        return <AdminParticipants />;
      case 'rounds':
        return <AdminRounds />;
      case 'news':
        return <AdminNews />;
      case 'timetable':
        return <AdminTimetable />;
      case 'city-tips':
        return <AdminCityTips />;
      case 'info-pages':
        return <AdminInfoPages />;
      case 'analytics':
        return <AdminAnalytics />;
      case 'security':
        return <AdminSecurity />;
      case 'performance':
        return <PerformanceMonitor />;
      case 'content':
        return (
          <div className="p-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Content Management</h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">Manage news, city tips, and info pages</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {contentSubItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 text-left"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item.label}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Manage {item.label.toLowerCase()}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      case 'events':
        return (
          <div className="p-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Event Management</h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">Manage rounds and timetable</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {eventsSubItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 text-left"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item.label}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Manage {item.label.toLowerCase()}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      default:
        return <AdminDashboard setCurrentView={setCurrentView} />;
    }
  };


  
  const primaryNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'participants', label: 'Participants', icon: '👥' },
    { id: 'content', label: 'Content', icon: '📝' },
    { id: 'events', label: 'Events', icon: '📅' }
  ];

  const contentSubItems = [
    { id: 'news', label: 'News', icon: '📰' },
    { id: 'city-tips', label: 'City Tips', icon: '🗺️' },
    { id: 'info-pages', label: 'Info Pages', icon: '📋' }
  ];

  const eventsSubItems = [
    { id: 'rounds', label: 'Rounds', icon: '🎭' },
    { id: 'timetable', label: 'Timetable', icon: '📅' }
  ];

  const adminSubItems = [
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'security', label: 'Security', icon: '🔐' },
    { id: 'performance', label: 'Performance', icon: '⚡' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">SLAM25 Admin</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Management Panel</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* Primary Navigation Items */}
              {primaryNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`px-2 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentView === item.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={item.label}
                >
                  <span className="mr-1 sm:mr-2">{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
              
              {/* Admin Tools Dropdown */}
              <div className="relative admin-tools-menu">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className={`px-2 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    adminSubItems.some(item => item.id === currentView)
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title="Admin Tools"
                >
                  <span className="mr-1 sm:mr-2">🔧</span>
                  <span className="hidden sm:inline">Tools</span>
                </button>
                
                {showMoreMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    {adminSubItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentView(item.id);
                          setShowMoreMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          currentView === item.id
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="mr-2">{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <SessionStatus />
              <button
                onClick={logout}
                className="px-2 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                title="Logout"
              >
                <span className="mr-1 sm:mr-2">🚪</span>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Breadcrumb Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="max-w-7xl mx-auto">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
                >
                  Dashboard
                </button>
              </li>
              {currentView !== 'dashboard' && (
                <>
                  <li>
                    <span className="text-gray-400 dark:text-gray-500">/</span>
                  </li>
                  <li>
                    <span className="text-gray-900 dark:text-white text-sm font-medium">
                      {primaryNavItems.find(item => item.id === currentView)?.label ||
                       contentSubItems.find(item => item.id === currentView)?.label ||
                       eventsSubItems.find(item => item.id === currentView)?.label ||
                       adminSubItems.find(item => item.id === currentView)?.label ||
                       'Unknown'}
                    </span>
                  </li>
                </>
              )}
            </ol>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {renderCurrentView()}
      </div>
    </div>
  );
}



export default function Admin() {
  const [authed, setAuthed] = useState(() => {
    return sessionService.isSessionActive();
  });
  const [currentView, setCurrentView] = useState('dashboard');

  // Listen for session events
  useEffect(() => {
    const handleSessionEvent = (data) => {
      setAuthed(false);
    };

    sessionService.addListener('sessionExpired', handleSessionEvent);
    sessionService.addListener('sessionEnded', handleSessionEvent);

    return () => {
      // Cleanup listeners
      sessionService.removeListener('sessionExpired', handleSessionEvent);
      sessionService.removeListener('sessionEnded', handleSessionEvent);
    };
  }, []);

  // Check session validity periodically
  useEffect(() => {
    if (authed) {
      const interval = setInterval(() => {
        if (!sessionService.isSessionActive()) {
          setAuthed(false);
        }
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [authed]);

  if (!authed) {
    return <AdminLogin onLogin={() => setAuthed(true)} />;
  }

  return (
    <>
      <AdminPanel onLogout={() => setAuthed(false)} currentView={currentView} setCurrentView={setCurrentView} />
      
    </>
  );
}
