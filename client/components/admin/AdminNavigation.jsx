import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../services/authService.js';

const navigationGroups = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    path: '/admin',
    showInBottomNav: true
  },
  {
    id: 'competition',
    label: 'Wettbewerb',
    icon: '🏆',
    showInBottomNav: true,
    items: [
      { id: 'participants', label: 'Teilnehmer*innen', icon: '👥', path: '/admin/participants' },
      { id: 'teams', label: 'Teams', icon: '👥', path: '/admin/teams' },
      { id: 'rounds', label: 'Runden', icon: '🎭', path: '/admin/rounds' },
      { id: 'timetable', label: 'Zeitplan', icon: '📅', path: '/admin/timetable' }
    ]
  },
  {
    id: 'content',
    label: 'Inhalte',
    icon: '📝',
    showInBottomNav: true,
    items: [
      { id: 'news', label: 'Nachrichten', icon: '📰', path: '/admin/news' },
      { id: 'city-tips', label: 'Stadt-Tipps', icon: '🗺️', path: '/admin/city-tips' },
      { id: 'info-pages', label: 'Info-Seiten', icon: '📋', path: '/admin/info-pages' }
    ]
  },
  {
    id: 'settings',
    label: 'Einstellungen',
    icon: '⚙️',
    showInBottomNav: true,
    items: [
      { id: 'links', label: 'Links', icon: '🔗', path: '/admin/links' },
      { id: 'schnellzugriff', label: 'Schnellzugriff', icon: '⚡', path: '/admin/schnellzugriff' },
      { id: 'countdown', label: 'Countdown', icon: '⏰', path: '/admin/countdown' },
      { id: 'user-password', label: 'Benutzer-Passwort', icon: '🔐', path: '/admin/user-password' },
      { id: 'site-settings', label: 'Seiten-Einstellungen', icon: '🎨', path: '/admin/site-settings' }
    ]
  }
];

export default function AdminNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState({});
  const [mobileActiveGroup, setMobileActiveGroup] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const mobileSheetRef = useRef(null);

  // Close mobile sheet when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileSheetRef.current && !mobileSheetRef.current.contains(event.target)) {
        setMobileActiveGroup(null);
      }
    };

    if (mobileActiveGroup) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileActiveGroup]);

  // Close mobile sheet on route change
  useEffect(() => {
    setMobileActiveGroup(null);
  }, [location.pathname]);

  // Close mobile sheet on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && mobileActiveGroup) {
        setMobileActiveGroup(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileActiveGroup]);

  const isGroupActive = (group) => {
    if (group.path) {
      return location.pathname === group.path;
    }
    if (group.items) {
      return group.items.some(item => location.pathname === item.path);
    }
    return false;
  };

  const isItemActive = (item) => {
    return location.pathname === item.path;
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await authService.logout();
      navigate('/admin');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDesktopGroupClick = (group) => {
    if (group.path) {
      navigate(group.path);
    } else {
      setExpandedGroups(prev => ({
        ...prev,
        [group.id]: !prev[group.id]
      }));
    }
  };

  const handleMobileGroupClick = (group) => {
    if (group.path) {
      navigate(group.path);
    } else {
      setMobileActiveGroup(mobileActiveGroup === group.id ? null : group.id);
    }
  };

  const handleItemClick = (item) => {
    navigate(item.path);
    setMobileActiveGroup(null);
  };

  const handleKeyDown = (event, action) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  return (
    <>
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden md:block fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40">
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#185757] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">SLAM25 Admin</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Verwaltungspanel</p>
            </div>
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-4 space-y-2">
            {navigationGroups.map((group) => (
              <div key={group.id}>
                <button
                  onClick={() => handleDesktopGroupClick(group)}
                  onKeyDown={(e) => handleKeyDown(e, () => handleDesktopGroupClick(group))}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-between ${
                    isGroupActive(group)
                      ? 'bg-[#A2D2B9]/20 dark:bg-[#185757]/30 text-[#185757] dark:text-[#A2D2B9]'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  aria-expanded={group.items ? expandedGroups[group.id] : undefined}
                  aria-haspopup={group.items ? 'true' : undefined}
                >
                  <div className="flex items-center">
                    <span className="mr-3 text-lg">{group.icon}</span>
                    <span>{group.label}</span>
                  </div>
                  {group.items && (
                    <svg
                      className={`h-4 w-4 transition-transform duration-200 ${
                        expandedGroups[group.id] ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {/* Desktop Group Items */}
                {group.items && expandedGroups[group.id] && (
                  <div className="mt-1 ml-4 space-y-1">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        onKeyDown={(e) => handleKeyDown(e, () => handleItemClick(item))}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                          isItemActive(item)
                            ? 'bg-[#A2D2B9]/20 dark:bg-[#185757]/30 text-[#185757] dark:text-[#A2D2B9]'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="mr-3">{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleLogout}
            onKeyDown={(e) => handleKeyDown(e, handleLogout)}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 disabled:opacity-50"
            aria-label="Abmelden"
          >
            <span className="mr-2">🚪</span>
            {isLoggingOut ? 'Abmelden...' : 'Abmelden'}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav - hidden on desktop */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
        <div className="flex justify-around items-center h-full">
          {navigationGroups.map((group) => (
            <button
              key={group.id}
              onClick={() => handleMobileGroupClick(group)}
              onKeyDown={(e) => handleKeyDown(e, () => handleMobileGroupClick(group))}
              className={`flex flex-col items-center gap-1 px-2 py-2 min-h-[44px] min-w-[44px] ${
                isGroupActive(group)
                  ? 'text-[#185757] dark:text-[#A2D2B9]'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
              aria-label={group.label}
            >
              <span className="text-2xl">{group.icon}</span>
              <span className="text-xs font-medium">{group.label}</span>
              {isGroupActive(group) && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-[#185757] rounded-full"></div>
              )}
            </button>
          ))}
          <button
            onClick={handleLogout}
            onKeyDown={(e) => handleKeyDown(e, handleLogout)}
            disabled={isLoggingOut}
            className={`flex flex-col items-center gap-1 px-2 py-2 min-h-[44px] min-w-[44px] ${
              'text-gray-600 dark:text-gray-400'
            }`}
            aria-label="Abmelden"
          >
            <span className="text-2xl">🚪</span>
            <span className="text-xs font-medium">Abmelden</span>
          </button>
        </div>
      </nav>

      {/* Mobile Slide-up Sheet - when group expanded */}
      {mobileActiveGroup && (
        <div className="md:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileActiveGroup(null)}
          />
          
          {/* Slide-up Sheet */}
          <div 
            ref={mobileSheetRef}
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl max-h-[70vh] overflow-y-auto"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {navigationGroups.find(g => g.id === mobileActiveGroup)?.label}
                </h3>
                <button
                  onClick={() => setMobileActiveGroup(null)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  aria-label="Schließen"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-2">
                {navigationGroups
                  .find(g => g.id === mobileActiveGroup)
                  ?.items?.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      onKeyDown={(e) => handleKeyDown(e, () => handleItemClick(item))}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center ${
                        isItemActive(item)
                          ? 'bg-[#A2D2B9]/20 dark:bg-[#185757]/30 text-[#185757] dark:text-[#A2D2B9]'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="mr-3 text-xl">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
