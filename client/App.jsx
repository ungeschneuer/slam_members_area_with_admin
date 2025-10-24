import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Admin from './Admin';
import Themes from './components/Themes';
import MemberDashboard from './components/MemberDashboard';
import Participants from './components/Participants';
import ParticipantDetail from './components/ParticipantDetail';
import TeamDetail from './components/TeamDetail';
import Rounds from './components/Rounds';
import RoundDetail from './components/RoundDetail';

import News from './components/News';
import NewsDetail from './components/NewsDetail';
import BreakingNews from './components/BreakingNews';

import Timetable from './components/Timetable';
import EventDetail from './components/EventDetail';
import CityTips from './components/CityTips';
import CityTipDetail from './components/CityTipDetail';
import Info from './components/Info';
import Links from './components/Links';
import PWAInstallPrompt from './components/PWAInstallPrompt.jsx';
import ErrorBoundary, { withErrorBoundary } from './components/ErrorBoundary.jsx';
import { ThemeProvider, useTheme } from './contexts/ThemeContext.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { UIProvider, useUI } from './contexts/UIContext.jsx';
import { RouteTransition, FadeIn, StaggeredContainer } from './components/Transitions.jsx';
import authService from './services/authService.js';

const Navigation = React.memo(function Navigation() {
  const location = useLocation();
  const isTestEnv = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
  const { theme, toggleTheme } = useTheme();
  const { areas, mobileMenuOpen, setMobileMenuOpen, configLoaded, setConfigLoaded } = useUI();
  const { isAdmin, setIsAdmin } = useAuth();
  // no local state writes during render

  // Apply theme to <html> only; no config writebacks here
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Initialize admin auth and track admin state
  useEffect(() => {
    if (isTestEnv) return;
    const initAdmin = async () => {
      try {
        // Only initialize if not already initializing
        if (!authService.isInitializing?.()) {
          await authService.init();
        }
      } catch {}
      const next = !!authService.isAdmin();
      if (next !== isAdmin) {
        setIsAdmin(next);
      }
    };
    initAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Intentionally empty dependency array - this effect should only run once on mount
  }, []);

  // configLoaded is now bootstrapped in main.jsx

  // React to global auth changes to update indicator immediately
  useEffect(() => {
    if (isTestEnv) return;
    const handler = (e) => {
      const next = !!(e && e.detail && e.detail.isAuthenticated);
      if (next !== isAdmin) {
        setIsAdmin(next);
      }
    };
    window.addEventListener('slam:auth-changed', handler);
    return () => window.removeEventListener('slam:auth-changed', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Intentionally empty dependency array - this effect should only run once on mount
  }, []);

  // Removed config writebacks to avoid render loops

  // Removed area mutation helpers to avoid unintended store writes

  // toggleTheme provided by store

  if (!configLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Lade Konfiguration...</p>
        </div>
      </div>
    );
  }

  const isActive = (path) => location.pathname === path;

  const areaPaths = {
    'Teilnehmer*innen': '/participants',
    'Runden': '/rounds',
    'Neuigkeiten': '/news',
    'Zeitplan': '/timetable',
    'Stadt-Tipps': '/city-tips',
    'Links': '/links',
    'Info': '/info'
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 touch-pan-x" role="navigation" aria-label="Hauptnavigation">
      {/* Skip to main content link */}
      <a href="#main-content" className="skip-link">
        Zum Hauptinhalt springen
      </a>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 nav-container">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link 
              to="/" 
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
              aria-label="SLAM25 - Zur Startseite"
            >
              <div className="w-10 h-10 flex items-center justify-center" aria-hidden="true">
                <img 
                  src="/icons/logo.png" 
                  alt="SLAM25 Logo" 
                  className="w-10 h-10 object-contain"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">SLAM25</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Szene-Bereich</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">SLAM25</h1>
              </div>
            </Link>
          </div>
          
          {/* Desktop Navigation - Only show on large screens to prevent overflow */}
          <div className="hidden lg:flex items-center space-x-2" role="menubar">
            {areas.map((area) => (
              <Link
                key={area}
                to={areaPaths[area]}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isActive(areaPaths[area])
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                role="menuitem"
                aria-current={isActive(areaPaths[area]) ? 'page' : undefined}
              >
                {area}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" aria-label="Admin angemeldet - zum Admin-Dashboard wechseln" data-testid="admin-indicator" className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
                Admin
              </Link>
            )}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              title={`Wechsel zu ${theme === 'light' ? 'dunklem' : 'hellem'} Modus`}
              aria-label={`Wechsel zu ${theme === 'light' ? 'dunklem' : 'hellem'} Modus`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>

          {/* Right side actions (mobile and tablet) */}
          <div className="lg:hidden flex items-center space-x-2">
            {isAdmin && (
              <Link to="/admin" aria-label="Admin angemeldet - zum Admin-Dashboard wechseln" data-testid="admin-indicator" className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
                Admin
              </Link>
            )}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              title={`Wechsel zu ${theme === 'light' ? 'dunklem' : 'hellem'} Modus`}
              aria-label={`Wechsel zu ${theme === 'light' ? 'dunklem' : 'hellem'} Modus`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              onKeyDown={handleKeyDown}
              className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 touch-target touch-feedback focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Menü öffnen"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div 
            id="mobile-menu"
            className="lg:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 mobile-keyboard-avoid"
            role="menu"
            aria-label="Mobile Navigation"
          >
            <div className="px-4 py-4 space-y-2 mobile-padding">
              {areas.map((area) => (
                <Link
                  key={area}
                  to={areaPaths[area]}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`mobile-nav-item ${
                    isActive(areaPaths[area])
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  role="menuitem"
                  aria-current={isActive(areaPaths[area]) ? 'page' : undefined}
                >
                  <div className="flex items-center justify-between">
                    <span className="mobile-text-base">{area}</span>
                    {isActive(areaPaths[area]) && (
                      <span className="text-blue-200" aria-hidden="true">✓</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
});

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UIProvider>
          <Router>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <Navigation />
              <BreakingNews />
              <main id="main-content" role="main" tabIndex="-1">
                <ErrorBoundary name="MainRoutes" showDetails>
                <Routes>
            <Route path="/" element={
              <ErrorBoundary name="MemberDashboard">
                <RouteTransition>
                  <FadeIn>
                    <MemberDashboard />
                  </FadeIn>
                </RouteTransition>
              </ErrorBoundary>
            } />
            <Route path="/participants" element={
              <ErrorBoundary name="Participants">
                <RouteTransition>
                  <FadeIn>
                    <Participants />
                  </FadeIn>
                </RouteTransition>
              </ErrorBoundary>
            } />
            <Route path="/participants/:slug" element={
              <RouteTransition>
                <FadeIn>
                  <ParticipantDetail />
                </FadeIn>
              </RouteTransition>
            } />

            <Route path="/teams/:slug" element={
              <RouteTransition>
                <FadeIn>
                  <TeamDetail />
                </FadeIn>
              </RouteTransition>
            } />

            <Route path="/rounds" element={
              <RouteTransition>
                <FadeIn>
                  <Rounds />
                </FadeIn>
              </RouteTransition>
            } />
            <Route path="/rounds/:slug" element={
              <RouteTransition>
                <FadeIn>
                  <RoundDetail />
                </FadeIn>
              </RouteTransition>
            } />
            <Route path="/news" element={
              <RouteTransition>
                <FadeIn>
                  <News />
                </FadeIn>
              </RouteTransition>
            } />
            <Route path="/news/:slug" element={
              <RouteTransition>
                <FadeIn>
                  <NewsDetail />
                </FadeIn>
              </RouteTransition>
            } />
            <Route path="/timetable" element={
              <RouteTransition>
                <FadeIn>
                  <Timetable />
                </FadeIn>
              </RouteTransition>
            } />
            <Route path="/timetable/event/:slug" element={
              <RouteTransition>
                <FadeIn>
                  <EventDetail />
                </FadeIn>
              </RouteTransition>
            } />
            <Route path="/city-tips" element={
              <RouteTransition>
                <FadeIn>
                  <CityTips />
                </FadeIn>
              </RouteTransition>
            } />
            <Route path="/city-tips/:slug" element={
              <RouteTransition>
                <FadeIn>
                  <CityTipDetail />
                </FadeIn>
              </RouteTransition>
            } />
            <Route path="/links" element={
              <RouteTransition>
                <FadeIn>
                  <Links />
                </FadeIn>
              </RouteTransition>
            } />
            <Route path="/info" element={
              <RouteTransition>
                <FadeIn>
                  <Info />
                </FadeIn>
              </RouteTransition>
            } />
            <Route path="/info/:slug" element={
              <RouteTransition>
                <FadeIn>
                  <Info />
                </FadeIn>
              </RouteTransition>
            } />
            <Route path="/admin/*" element={
              <RouteTransition>
                <FadeIn>
                  <Admin />
                </FadeIn>
              </RouteTransition>
            } />
          </Routes>
                </ErrorBoundary>
              </main>
              <PWAInstallPrompt />
            </div>
          </Router>
        </UIProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
