import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../../services/authService.js';
import NavGroup from './NavGroup.jsx';

const navigationGroups = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    path: '/admin',
    items: null // No dropdown
  },
  {
    id: 'competition',
    label: 'Wettbewerb',
    icon: '🏆',
    path: null,
    items: [
      { id: 'participants', label: 'Teilnehmer*innen', icon: '👥', path: '/admin/participants' },
      { id: 'rounds', label: 'Runden', icon: '🎭', path: '/admin/rounds' },
      { id: 'timetable', label: 'Zeitplan', icon: '📅', path: '/admin/timetable' }
    ]
  },
  {
    id: 'content',
    label: 'Inhalte',
    icon: '📝',
    path: null,
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
    path: null,
    items: [
      { id: 'links', label: 'Links', icon: '🔗', path: '/admin/links' },
      { id: 'schnellzugriff', label: 'Schnellzugriff', icon: '⚡', path: '/admin/schnellzugriff' },
      { id: 'countdown', label: 'Countdown', icon: '⏰', path: '/admin/countdown' }
    ]
  },
  {
    id: 'system',
    label: 'System',
    icon: '🔧',
    path: null,
    items: [
      { id: 'analytics', label: 'Analytics', icon: '📈', path: '/admin/analytics' },
      { id: 'performance', label: 'Performance', icon: '⚡', path: '/admin/performance' },
      { id: 'security', label: 'Sicherheit', icon: '🔐', path: '/admin/security' },
      { id: 'cache', label: 'Cache', icon: '💾', path: '/admin/cache' }
    ]
  }
];

export default function AdminNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const isGroupActive = (group) => {
    if (group.path) {
      return location.pathname === group.path;
    }
    if (group.items) {
      return group.items.some(item => location.pathname === item.path);
    }
    return false;
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      console.log('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
    navigate('/admin');
  };

  const handleNavigation = (item) => {
    // Optional: Add analytics or other navigation tracking here
    console.log('Navigated to:', item.path);
  };

  return (
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
                <p className="text-xs text-gray-500 dark:text-gray-400">Verwaltungspanel</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Navigation Groups */}
            {navigationGroups.map((group) => (
              <NavGroup
                key={group.id}
                group={group}
                isActive={isGroupActive(group)}
                onNavigate={handleNavigation}
              />
            ))}
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-2 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              title="Abmelden"
            >
              <span className="mr-1 sm:mr-2">🚪</span>
              <span className="hidden sm:inline">Abmelden</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
