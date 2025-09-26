import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Admin from './Admin';
import Themes from './Themes';
import MemberDashboard from './components/MemberDashboard';
import Participants from './components/Participants';
import ParticipantDetail from './components/ParticipantDetail';
import Rounds from './components/Rounds';

import News from './components/News';

import Timetable from './components/Timetable';
import CityTips from './components/CityTips';
import Info from './components/Info';
import DatabaseStatus from './components/DatabaseStatus';
import PWAInstallPrompt from './components/PWAInstallPrompt.jsx';
import PerformanceMonitor from './components/PerformanceMonitor.jsx';
import sessionService from './services/sessionService.js';
import configService from './services/configService.js';
import PageTransition from './components/PageTransition.jsx';
import { FadeIn, StaggeredContainer } from './components/PageTransition.jsx';

function Navigation() {
  const location = useLocation();
  const [theme, setTheme] = useState('light');
  const [areas, setAreas] = useState(['Teilnehmer', 'Runden', 'Neuigkeiten', 'Zeitplan', 'Stadt-Tipps', 'Info']);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Initialize configuration
  useEffect(() => {
    const initializeConfig = async () => {
      try {
        await configService.init();
        const currentTheme = await configService.getTheme();
        const currentAreas = await configService.getAreas();
        
        setTheme(currentTheme);
        setAreas(currentAreas);
        setConfigLoaded(true);
        
        // Apply theme to document
        document.documentElement.classList.toggle('dark', currentTheme === 'dark');
      } catch (error) {
        console.error('Failed to initialize config:', error);
        setConfigLoaded(true);
      }
    };

    initializeConfig();
  }, []);

  // Update theme when it changes
  useEffect(() => {
    if (configLoaded) {
      configService.setTheme(theme);
    }
  }, [theme, configLoaded]);

  // Update areas when they change
  useEffect(() => {
    if (configLoaded) {
      configService.setAreas(areas);
    }
  }, [areas, configLoaded]);

  const addArea = async () => {
    const newArea = prompt("Neuer Bereichsname:");
    if (newArea && newArea.trim()) {
      const updatedAreas = [...areas, newArea.trim()];
      setAreas(updatedAreas);
    }
  };

  const removeArea = async (index) => {
    if (confirm("Diesen Bereich entfernen?")) {
      const updatedAreas = areas.filter((_, i) => i !== index);
      setAreas(updatedAreas);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

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
    'Teilnehmer': '/participants',
    'Runden': '/rounds',
    'Neuigkeiten': '/news',
    'Zeitplan': '/timetable',
    'Stadt-Tipps': '/city-tips',
    'Info': '/info'
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50" role="navigation" aria-label="Hauptnavigation">
      {/* Skip to main content link */}
      <a href="#main-content" className="skip-link">
        Zum Hauptinhalt springen
      </a>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link 
              to="/" 
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
              aria-label="SLAM25 - Zur Startseite"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center" aria-hidden="true">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">SLAM25</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Poetry Slam Wettbewerb</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">SLAM25</h1>
              </div>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4" role="menubar">
            {areas.map((area) => (
              <Link
                key={area}
                to={areaPaths[area]}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
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
            <Link
              to="/admin"
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              role="menuitem"
              aria-label="Admin-Bereich"
            >
              Admin
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              title={`Wechsel zu ${theme === 'light' ? 'dunklem' : 'hellem'} Modus`}
              aria-label={`Wechsel zu ${theme === 'light' ? 'dunklem' : 'hellem'} Modus`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
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
            className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 mobile-keyboard-avoid"
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
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mobile-nav-item text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  role="menuitem"
                  aria-label="Admin-Bereich"
                >
                  <div className="flex items-center space-x-2">
                    <span aria-hidden="true">⚙️</span>
                    <span className="mobile-text-base">Admin</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <main id="main-content" role="main" tabIndex="-1">
          <PageTransition>
            <Routes>
              <Route path="/" element={
                <FadeIn>
                  <MemberDashboard />
                </FadeIn>
              } />
              <Route path="/participants" element={
                <FadeIn>
                  <Participants />
                </FadeIn>
              } />
              <Route path="/participants/:participantId" element={
                <FadeIn>
                  <ParticipantDetail />
                </FadeIn>
              } />
              <Route path="/rounds" element={
                <FadeIn>
                  <Rounds />
                </FadeIn>
              } />
              <Route path="/news" element={
                <FadeIn>
                  <News />
                </FadeIn>
              } />
              <Route path="/timetable" element={
                <FadeIn>
                  <Timetable />
                </FadeIn>
              } />
              <Route path="/city-tips" element={
                <FadeIn>
                  <CityTips />
                </FadeIn>
              } />
              <Route path="/info" element={
                <FadeIn>
                  <Info />
                </FadeIn>
              } />
              <Route path="/info/:slug" element={
                <FadeIn>
                  <Info />
                </FadeIn>
              } />
              <Route path="/admin" element={
                <FadeIn>
                  <Admin />
                </FadeIn>
              } />
            </Routes>
          </PageTransition>
        </main>
        <DatabaseStatus />
        <PWAInstallPrompt />
        <PerformanceMonitor />
      </div>
    </Router>
  );
}

export default App;
