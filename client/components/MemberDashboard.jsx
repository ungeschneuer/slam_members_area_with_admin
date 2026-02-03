import React, { useState, useEffect, useTransition, useDeferredValue, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useParticipants, useRounds, useNews, usePublishedInfoPages, useCityTips, useSchnellzugriff, useCountdown, useDashboardSettings, usePageTitle } from '../hooks/index.js';
// Stats now handled by React Query data
import LoadingSpinner from './LoadingSpinner';
import { FadeIn, StaggeredContainer } from './Transitions.jsx';
import { DashboardSkeleton } from './SkeletonLoader.jsx';
import { ErrorMessage, SuccessMessage } from './StatusMessages.jsx';
import { createTimezoneAwareCountdown } from '../services/timezoneService.js';
import { translateRoundStatus, getRoundStatusIcon, getRoundStatusColor } from '../../shared/constants/categories.js';
import { getLinkProps, handleLinkClick } from '../utils/linkUtils.js';
import { getRegionFlag } from '../utils/detailViewUtils.js';
import { getCategoryColor } from '../utils/categoryUtils.js';

export default function MemberDashboard() {
  usePageTitle('Dashboard');
  const { data: countdownData, isLoading: countdownLoading, error: countdownError } = useCountdown();
  const { data: participantsResponse = [], isLoading: participantsLoading, error: participantsError } = useParticipants();
  const participantsData = participantsResponse?.data || participantsResponse || [];
  const { data: roundsData = [], isLoading: roundsLoading, error: roundsError } = useRounds();
  const { data: newsData = [], isLoading: newsLoading, error: newsError } = useNews();
  const { data: infoPagesData = [], isLoading: infoPagesLoading, error: infoPagesError } = usePublishedInfoPages();
  const { data: cityTipsData = [], isLoading: cityTipsLoading, error: cityTipsError } = useCityTips();
  const { data: schnellzugriffData = [], isLoading: schnellzugriffLoading, error: schnellzugriffError } = useSchnellzugriff();
  const { data: dashboardSettings } = useDashboardSettings();
  
  // Session-based random seed that changes on page reload but stays stable during session
  const sessionSeed = useRef(Math.floor(Math.random() * 1000));
  
  const loading = participantsLoading || roundsLoading || newsLoading || infoPagesLoading || cityTipsLoading || schnellzugriffLoading;
  const [isPending, startTransition] = useTransition();
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [countdownExpired, setCountdownExpired] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);


  // Use useMemo for computed values instead of manual state synchronization
  const countdownConfig = useMemo(() => {
    return countdownData || {
      title: 'Countdown zum SLAM25',
      subtitle: '28. Oktober 2025 • 12:00 Uhr (Berlin Zeit)',
      button_text: 'Zum Zeitplan',
      button_emoji: '📅',
      button_link: '/timetable',
      is_active: false  // Don't show countdown when database is unavailable
    };
  }, [countdownData]);

  const schnellzugriffLinks = useMemo(() => {
    if (!Array.isArray(schnellzugriffData)) return [];
    
    // Client-side deduplication safety net
    const unique = new Map();
    schnellzugriffData.forEach(link => {
      if (!unique.has(link.title)) {
        unique.set(link.title, link);
      }
    });
    return Array.from(unique.values());
  }, [schnellzugriffData]);

  // Random participants that only change on page reload, not on every render
  const randomParticipants = useMemo(() => {
    if (!Array.isArray(participantsData)) return [];
    // Create a random order that only changes when participantsData changes
    // Use the session seed for true randomness that changes on page reload
    return [...participantsData].sort((a, b) => {
      // Use the session seed to create a varied order
      const hashA = (a.id * sessionSeed.current) % 1000;
      const hashB = (b.id * sessionSeed.current) % 1000;
      return hashA - hashB;
    });
  }, [participantsData]);

  // Stable sorted city tips for display (only changes when data changes)
  const stableCityTips = useMemo(() => {
    if (!Array.isArray(cityTipsData)) return [];
    // Create a stable sort by using tip ID as seed for consistent randomization
    return [...cityTipsData].sort((a, b) => {
      // Use tip ID to create a deterministic "random" order
      const seedA = a.id % 5; // Use modulo to create consistent ordering
      const seedB = b.id % 5;
      return seedA - seedB;
    });
  }, [cityTipsData]);

  // Next 5 upcoming rounds (no past events)
  const upcomingRounds = useMemo(() => {
    if (!Array.isArray(roundsData)) return [];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return roundsData
      .filter(round => {
        // Filter out past events
        if (!round.date) return false;
        
        const roundDate = new Date(round.date);
        const roundDateOnly = new Date(roundDate.getFullYear(), roundDate.getMonth(), roundDate.getDate());
        
        // Only include rounds that are today or in the future
        return roundDateOnly >= today;
      })
      .sort((a, b) => {
        // Sort by date (earliest first)
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
      })
      .slice(0, 5); // Show next 5 upcoming events
  }, [roundsData]);

  const categoryStats = useMemo(() => {
    if (!Array.isArray(cityTipsData)) return {
      restaurant: 0, cafe: 0, culture: 0, shopping: 0, bar: 0, hotel: 0
    };
    
    const stats = {
      restaurant: 0, cafe: 0, culture: 0, shopping: 0, bar: 0, hotel: 0
    };
    
    cityTipsData.forEach(tip => {
      if (tip.status === 'ACTIVE') {
        switch (tip.category) {
          case 'restaurant': stats.restaurant++; break;
          case 'cafe': stats.cafe++; break;
          case 'culture': stats.culture++; break;
          case 'shopping': stats.shopping++; break;
          case 'bar': stats.bar++; break;
          case 'hotel': stats.hotel++; break;
        }
      }
    });
    
    return stats;
  }, [cityTipsData]);

  // Stats are now handled by React Query data - no manual state management needed


  // Countdown timer using timezone-aware service
  useEffect(() => {
    if (!countdownConfig.is_active) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setCountdownExpired(false);
      return;
    }

    const targetDate = new Date(countdownConfig.target_date || '2025-10-28T12:00:00');
    
    // Use timezone-aware countdown service
    const cleanup = createTimezoneAwareCountdown(
      targetDate,
      (countdownData) => {
        setCountdown({
          days: countdownData.days,
          hours: countdownData.hours,
          minutes: countdownData.minutes,
          seconds: countdownData.seconds
        });
        setCountdownExpired(countdownData.expired);
      },
      1000
    );

    return cleanup;
  }, [countdownConfig]);



  // Helper function to check if any round has groups
  const hasGroups = (round) => {
    return round.groups && Array.isArray(round.groups) && round.groups.length > 0;
  };


  // Helper function to get participant details by ID
  const getParticipantDetails = (participantId) => {
    const participant = participantsData.find(p => p.id === participantId);
    return participant || null;
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div data-testid="member-dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Error and Success Messages */}
      {error && (
        <ErrorMessage 
          error={error} 
          onRetry={() => window.location.reload()} 
          className="max-w-4xl mx-auto"
        />
      )}
      
      {success && (
        <SuccessMessage 
          message={success} 
          onDismiss={() => setSuccess(null)} 
          className="max-w-4xl mx-auto"
        />
      )}

      {/* Hero Section */}
      <div className="bg-primary dark:bg-accent rounded-2xl p-8 text-white dark:text-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center mb-4">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mr-4 mb-4 sm:mb-0 flex-shrink-0" aria-hidden="true">
              <span className="text-3xl">🎭</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 break-words">
                {dashboardSettings?.heading || 'Willkommen bei SLAM25'}
              </h1>
              <p className="text-lg sm:text-xl opacity-90">
                {dashboardSettings?.subtitle || 'Dein Poetry Slam Community Hub'}
              </p>
            </div>
          </div>
          <p className="text-lg opacity-80 max-w-2xl">
            {dashboardSettings?.description || 'Entdecke Teilnehmer*innen, verfolge Runden, lies Tipps und bleibe mit der Poetry Slam Community verbunden.'}
          </p>
        </div>
      </div>

      {/* Countdown Section */}
      {countdownConfig.is_active && !countdownExpired && (
        <div className="bg-primary dark:bg-accent rounded-2xl p-4 sm:p-8 text-white dark:text-gray-900 relative overflow-hidden">
            <div className="absolute inset-0 bg-black opacity-10"></div>
            <div className="relative z-10 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">{countdownConfig.title}</h2>
              <p className="text-base sm:text-lg opacity-90 mb-4 sm:mb-6">{countdownConfig.subtitle}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 max-w-2xl mx-auto">
                <div className="bg-white bg-opacity-20 rounded-xl p-2 sm:p-4 backdrop-blur-sm">
                  <div className="text-xl sm:text-3xl font-bold" aria-label={`${countdown.days} Tage`}>{countdown.days}</div>
                  <div className="text-xs sm:text-sm opacity-90">Tage</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-xl p-2 sm:p-4 backdrop-blur-sm">
                  <div className="text-xl sm:text-3xl font-bold" aria-label={`${countdown.hours} Stunden`}>{countdown.hours.toString().padStart(2, '0')}</div>
                  <div className="text-xs sm:text-sm opacity-90">Stunden</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-xl p-2 sm:p-4 backdrop-blur-sm">
                  <div className="text-xl sm:text-3xl font-bold" aria-label={`${countdown.minutes} Minuten`}>{countdown.minutes.toString().padStart(2, '0')}</div>
                  <div className="text-xs sm:text-sm opacity-90">Minuten</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-xl p-2 sm:p-4 backdrop-blur-sm">
                  <div className="text-xl sm:text-3xl font-bold" aria-label={`${countdown.seconds} Sekunden`}>{countdown.seconds.toString().padStart(2, '0')}</div>
                  <div className="text-xs sm:text-sm opacity-90">Sekunden</div>
                </div>
              </div>
              
              <div className="mt-6">
                <Link
                  to={countdownConfig.button_link}
                  className="inline-flex items-center px-6 py-3 bg-white dark:bg-gray-900 text-primary dark:text-accent rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-white dark:focus:ring-gray-900 focus:ring-offset-2 focus:ring-offset-primary dark:focus:ring-offset-accent"
                  aria-label={`${countdownConfig.button_text} navigieren`}
                >
                  <span className="mr-2" aria-hidden="true">{countdownConfig.button_emoji}</span>
                  {countdownConfig.button_text}
                </Link>
              </div>
            </div>
          </div>
      )}

      {/* Quick Actions - Schnellzugriff */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Schnellzugriff</h2>
          {schnellzugriffLinks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {schnellzugriffLinks.map((link) => {
                const getColorClasses = (color) => {
                  const colorMap = {
                    teal: 'bg-accent/20 hover:bg-accent/30 focus:ring-primary',
                    purple: 'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 focus:ring-purple-500',
                    green: 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 focus:ring-green-500',
                    red: 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 focus:ring-red-500',
                    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 focus:ring-yellow-500',
                    orange: 'bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 focus:ring-orange-500'
                  };
                  return colorMap[color] || colorMap.teal;
                };

                const getIconBgColor = (color) => {
                  const colorMap = {
                    teal: 'bg-primary',
                    purple: 'bg-purple-600',
                    green: 'bg-green-600',
                    red: 'bg-red-600',
                    yellow: 'bg-yellow-600',
                    orange: 'bg-orange-600'
                  };
                  return colorMap[color] || colorMap.teal;
                };

                return (
                  <a
                    key={link.id}
                    href={link.url}
                    onClick={(e) => handleLinkClick(link, e)}
                    className={`group p-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${getColorClasses(link.color)}`}
                    aria-label={`${link.title} - ${link.description || ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${getIconBgColor(link.color)} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <span className="text-white text-lg">{link.icon}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{link.title}</p>
                        {link.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{link.description}</p>
                        )}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">⚡</div>
              <p className="text-gray-600 dark:text-gray-400">Schnellzugriff kommt bald :)</p>
            </div>
          )}
        </div>
      {/* City Tips Preview Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-8 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Chemnitz Tipps & Empfehlungen</h2>
            <p className="text-gray-600 dark:text-gray-400">Entdecke die besten Orte in Chemnitz für deinen SLAM25 Aufenthalt</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {cityTipsLoading ? (
              // Loading state with skeleton
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 sm:p-6 animate-pulse"
                  aria-label="Lade Stadt-Tipps..."
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
                </div>
              ))
            ) : cityTipsData.length > 0 ? (
              // Display featured tips (select stable 3)
              stableCityTips
                .filter(tip => tip.is_featured && tip.status === 'ACTIVE')
                .slice(0, 3)
                .map((tip) => (
                <div
                  key={tip.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-md transition-all duration-200 hover:-translate-y-1 micro-interaction"
                  tabIndex="0"
                  role="article"
                  aria-label={`${tip.name} - ${tip.description}`}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg ${getCategoryColor(tip.category, 'cityTip')}`} aria-hidden="true">
                      {tip.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{tip.name}</h3>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400" aria-label={`Preiskategorie: ${tip.price_range || '€€'}`}>{tip.price_range || '€€'}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{tip.description}</p>
                </div>
              ))
            ) : (
              // No tips available
              <div className="col-span-full text-center py-8">
                <div className="text-4xl mb-4" aria-hidden="true">🗺️</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Stadt-Tipps kommt bald :)
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Bald gibt es hier tolle Empfehlungen für Berlin!
                </p>
              </div>
            )}
          </div>
          
          {/* Alle Tipps Button */}
          {cityTipsData.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
              <div className="text-center">
                <Link
                  to="/city-tips"
                  className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-primary dark:bg-accent text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-primary-hover dark:hover:bg-accent-hover transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-accent dark:focus:ring-primary focus:ring-offset-2"
                  aria-label="Alle Stadt-Tipps anzeigen"
                >
                  <span className="mr-2" aria-hidden="true">🗺️</span>
                  Alle Tipps anzeigen
                </Link>
              </div>
            </div>
          )}
          
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-accent/20 dark:bg-primary/30 rounded-xl flex items-center justify-center mx-auto mb-2" aria-hidden="true">
                  <span className="text-xl">🍽️</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Restaurants</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{categoryStats.restaurant} Empfehlungen</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-xl flex items-center justify-center mx-auto mb-2" aria-hidden="true">
                  <span className="text-xl">☕</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Cafés</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{categoryStats.cafe} Empfehlungen</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-accent/20 dark:bg-primary/30 rounded-xl flex items-center justify-center mx-auto mb-2" aria-hidden="true">
                  <span className="text-xl">🎭</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Kultur</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{categoryStats.culture} Empfehlungen</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center mx-auto mb-2" aria-hidden="true">
                  <span className="text-xl">🛍️</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Shopping</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{categoryStats.shopping} Empfehlungen</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-accent/20 dark:bg-primary/30 rounded-xl flex items-center justify-center mx-auto mb-2" aria-hidden="true">
                  <span className="text-xl">🍺</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Bars</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{categoryStats.bar} Empfehlungen</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-accent/20 dark:bg-primary/30 rounded-xl flex items-center justify-center mx-auto mb-2" aria-hidden="true">
                  <span className="text-xl">🏨</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Hotels</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{categoryStats.hotel} Empfehlungen</p>
              </div>
            </div>
          </div>
        </div>
      {/* Info Pages Section */}
      {infoPagesData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-8 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Info & Regeln</h2>
              <p className="text-gray-600 dark:text-gray-400">Wichtige Informationen und Wettbewerbsregeln</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.isArray(infoPagesData) ? infoPagesData.slice(0, 3).map((page) => (
                <Link
                  key={page.id}
                  to={`/info/${page.slug}`}
                  className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                  aria-label={`Info-Seite: ${page.title}`}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white text-lg" aria-hidden="true">
                      📋
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{page.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {page.category === 'rules' ? 'Regeln' : 'Information'}
                      </p>
                    </div>
                  </div>
                  {page.excerpt && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">{page.excerpt}</p>
                  )}
                  <div className="mt-3 flex items-center justify-end text-xs text-gray-500 dark:text-gray-400">
                    <span className="text-orange-600 dark:text-orange-400">→ Lesen</span>
                  </div>
                </Link>
              )) : null}
            </div>
            
            {/* Alle Info-Seiten Button */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
              <div className="text-center">
                <Link
                  to="/info"
                  className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-primary dark:bg-accent text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-primary-hover dark:hover:bg-accent-hover transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-accent dark:focus:ring-primary focus:ring-offset-2"
                  aria-label="Alle Info-Seiten anzeigen"
                >
                  <span className="mr-2" aria-hidden="true">📋</span>
                  Alle Info-Seiten
                </Link>
              </div>
            </div>
          </div>
      )}

      {/* Wettbewerbsrunden Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-8 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Wettbewerbsrunden</h2>
            <p className="text-gray-600 dark:text-gray-400">Übersicht aller Runden und Teilnehmer*innen</p>
          </div>
          
          <div className="space-y-3 sm:space-y-4">
            {upcomingRounds.length > 0 ? upcomingRounds.map((round, index) => (
              <Link
                key={round.id}
                to={`/rounds/${round.slug}`}
                className="block p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                aria-label={`Runde: ${round.title}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm sm:text-base">{round.title}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-3">
                        <span>📅 {round.date ? new Date(round.date).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          timeZone: 'Europe/Berlin'
                        }) : 'Datum nicht gesetzt'}</span>
                        <span>🕐 {round.start_time ? (() => {
                          // Handle both full datetime and time-only formats
                          if (round.start_time.includes('T') || round.start_time.includes(' ')) {
                            // Full datetime format
                            return new Date(round.start_time).toLocaleTimeString('de-DE', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Europe/Berlin'
                            });
                          } else {
                            // Time-only format (HH:MM:SS or HH:MM)
                            return round.start_time.substring(0, 5);
                          }
                        })() : '--:--'}</span>
                      </div>
                      <span>📍 {round.location || 'Unbekannter Ort'}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoundStatusColor(round.calculatedStatus || round.status)}`}>
                      {getRoundStatusIcon(round.calculatedStatus || round.status)} {translateRoundStatus(round.calculatedStatus || round.status)}
                    </span>
                    <span className="text-gray-400" aria-hidden="true">→</span>
                  </div>
                </div>
              </Link>
            )) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🎭</div>
                <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">Runden kommt bald :)</p>
                <p className="text-gray-500 dark:text-gray-500 text-sm">Bald werden hier alle Poetry Slam Runden zu sehen sein!</p>
              </div>
            )}
          </div>
          
          {/* Alle Runden Button */}
          {upcomingRounds.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
              <div className="text-center">
                <Link
                  to="/rounds"
                  className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-primary dark:bg-accent text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-primary-hover dark:hover:bg-accent-hover transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-accent dark:focus:ring-primary focus:ring-offset-2"
                  aria-label="Alle Runden anzeigen"
                >
                  <span className="mr-2" aria-hidden="true">🎭</span>
                  Alle Runden anzeigen
                </Link>
              </div>
            </div>
          )}
          
          {/* Show participants if no upcoming rounds have groups */}
          {upcomingRounds.length > 0 && !upcomingRounds.some(hasGroups) && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alle Teilnehmer*innen</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {randomParticipants
                  .slice(0, 9).map((participant) => (
                  <Link
                    key={participant.id}
                    to={`/participants/${participant.slug}`}
                    className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    role="article"
                    aria-label={`Teilnehmer*in: ${participant.name}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{participant.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{participant.role}</p>
                    </div>
                    <div className="text-sm text-gray-400" aria-hidden="true">
                      {participant.region || '-'}
                    </div>
                    {/* Small grey arrow area */}
                    <div className="w-6 h-6 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Link
                  to="/participants"
                  className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-primary dark:bg-accent text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-primary-hover dark:hover:bg-accent-hover transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-accent dark:focus:ring-primary focus:ring-offset-2"
                  aria-label={`Alle ${randomParticipants.length} Teilnehmer*innen anzeigen`}
                >
                  <span className="mr-2" aria-hidden="true">👥</span>
                  Alle Teilnehmer*innen anzeigen
                </Link>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
