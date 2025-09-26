import React, { useState, useEffect, useTransition, useDeferredValue } from 'react';
import { Link } from 'react-router-dom';
import hybridDataService from '../services/hybridDataService.js';
import LoadingSpinner from './LoadingSpinner';
import { FadeIn, StaggeredContainer, AnimateOnScroll } from './PageTransition.jsx';
import { DashboardSkeleton } from './SkeletonLoader.jsx';
import { ErrorMessage, SuccessMessage } from './ErrorBoundary.jsx';

export default function MemberDashboard() {
  const [stats, setStats] = useState({
    participants: 0,
    rounds: 0,
    news: 0
  });
  const [participants, setParticipants] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [infoPages, setInfoPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Helper function to get region flag emoji
  const getRegionFlag = (region) => {
    const regionFlags = {
      'Sachsen': '🇩🇪',
      'Bayern': '🇩🇪',
      'Baden-Württemberg': '🇩🇪',
      'Berlin': '🇩🇪',
      'Brandenburg': '🇩🇪',
      'Bremen': '🇩🇪',
      'Hamburg': '🇩🇪',
      'Hessen': '🇩🇪',
      'Mecklenburg-Vorpommern': '🇩🇪',
      'Niedersachsen': '🇩🇪',
      'Nordrhein-Westfalen': '🇩🇪',
      'Rheinland-Pfalz': '🇩🇪',
      'Saarland': '🇩🇪',
      'Schleswig-Holstein': '🇩🇪',
      'Thüringen': '🇩🇪',
      'Österreich': '🇦🇹',
      'Schweiz': '🇨🇭',
      'Belgien': '🇧🇪',
      'Luxemburg': '🇱🇺',
      'Südtirol': '🇮🇹'
    };
    return regionFlags[region] || '📍';
  };

  // Load data from hybrid service
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [participantsData, roundsData, news, infoPagesData] = await Promise.all([
          hybridDataService.getData('participants'),
          hybridDataService.getData('rounds'),
          hybridDataService.getData('news'),
          hybridDataService.getData('info-pages')
        ]);

        setParticipants(participantsData || []);
        setRounds(roundsData || []);
        setInfoPages(infoPagesData || []);
        setStats({
          participants: participantsData?.length || 0,
          rounds: roundsData?.length || 0,
          news: news?.length || 0
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError('Fehler beim Laden der Dashboard-Daten');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to data changes
    const unsubscribe = hybridDataService.subscribe((dataType) => {
      if (['participants', 'rounds', 'news'].includes(dataType)) {
        console.log(`Dashboard: Data changed for ${dataType}, refreshing...`);
        loadData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Load featured city tips from database
  useEffect(() => {
    const loadFeaturedCityTips = async () => {
      try {
        setCityTipsLoading(true);
        const cityTips = await hybridDataService.getData('city-tips');
        
        if (cityTips && cityTips.length > 0) {
          // Transform database data and select random featured tips
          const transformedTips = cityTips.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            description: item.description,
            rating: item.rating || 4.0,
            price: item.price_range || '€€',
            icon: getCategoryIcon(item.category)
          }));

          // Select 3 random featured tips
          const shuffled = transformedTips.sort(() => 0.5 - Math.random());
          const selected = shuffled.slice(0, 3);
          
          setFeaturedCityTips(selected);

          // Calculate category statistics
          const stats = {
            restaurant: cityTips.filter(item => item.category === 'restaurant').length,
            cafe: cityTips.filter(item => item.category === 'cafe').length,
            culture: cityTips.filter(item => item.category === 'culture').length,
            shopping: cityTips.filter(item => item.category === 'shopping').length,
            bar: cityTips.filter(item => item.category === 'bar').length,
            hotel: cityTips.filter(item => item.category === 'hotel').length
          };
          setCategoryStats(stats);
        } else {
          // Fallback to empty array if no data
          setFeaturedCityTips([]);
          setCategoryStats({ restaurant: 0, cafe: 0, culture: 0, shopping: 0, bar: 0, hotel: 0 });
        }
      } catch (error) {
        console.error('Error loading featured city tips:', error);
        setFeaturedCityTips([]);
        setCategoryStats({ restaurant: 0, cafe: 0, culture: 0, shopping: 0, bar: 0, hotel: 0 });
      } finally {
        setCityTipsLoading(false);
      }
    };

    loadFeaturedCityTips();
  }, []);

  // Countdown timer for October 28th, 2025 (Berlin time)
  useEffect(() => {
    // Set target date in Berlin timezone (CET/CEST)
    const targetDate = new Date('October 28, 2025 12:00:00 GMT+0100').getTime();
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        setCountdown({ days, hours, minutes, seconds });
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  const [featuredCityTips, setFeaturedCityTips] = useState([]);
  const [categoryStats, setCategoryStats] = useState({
    restaurant: 0, cafe: 0, culture: 0, shopping: 0, bar: 0, hotel: 0
  });
  const [cityTipsLoading, setCityTipsLoading] = useState(true);

  const getCategoryIcon = (category) => {
    const icons = {
      restaurant: '🍽️',
      cafe: '☕',
      bar: '🍺',
      culture: '🎭',
      shopping: '🛍️',
      hotel: '🏨',
      transport: '🚇'
    };
    return icons[category] || '📍';
  };

  const getCategoryColor = (category) => {
    const colors = {
      cafe: 'bg-yellow-500',
      restaurant: 'bg-red-500',
      bar: 'bg-blue-500',
      culture: 'bg-purple-500',
      shopping: 'bg-green-500',
      hotel: 'bg-indigo-500',
      transport: 'bg-orange-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  // Helper function to check if any round has groups
  const hasGroups = (round) => {
    return round.groups && Array.isArray(round.groups) && round.groups.length > 0;
  };

  // Helper function to get participant name by ID
  const getParticipantName = (participantId) => {
    const participant = participants.find(p => p.id === participantId);
    return participant ? participant.name : `Teilnehmer ${participantId}`;
  };

  // Helper function to get participant details by ID
  const getParticipantDetails = (participantId) => {
    const participant = participants.find(p => p.id === participantId);
    return participant || null;
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
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
      <AnimateOnScroll>
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative z-10">
            <div className="flex items-center mb-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mr-4" aria-hidden="true">
                <span className="text-3xl">🎭</span>
              </div>
              <div>
                <h1 className="text-5xl font-bold mb-2">Willkommen bei SLAM25</h1>
                <p className="text-xl opacity-90">Dein Poetry Slam Community Hub</p>
              </div>
            </div>
            <p className="text-lg opacity-80 max-w-2xl">
              Entdecke Teilnehmer, verfolge Runden, lies Tipps und bleibe mit der Poetry Slam Community verbunden.
            </p>
          </div>
        </div>
      </AnimateOnScroll>

      {/* Countdown Section */}
      <AnimateOnScroll>
        <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-4 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative z-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Countdown zum SLAM25</h2>
            <p className="text-base sm:text-lg opacity-90 mb-4 sm:mb-6">28. Oktober 2025 • 12:00 Uhr (Berlin Zeit)</p>
            
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
                to="/timetable"
                className="inline-flex items-center px-6 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-red-600"
                aria-label="Zum Zeitplan navigieren"
              >
                <span className="mr-2" aria-hidden="true">📅</span>
                Zum Zeitplan
              </Link>
            </div>
          </div>
        </div>
      </AnimateOnScroll>

      {/* Quick Actions */}
      <AnimateOnScroll>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Schnellzugriff</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/participants"
              className="group p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={`${stats.participants} Teilnehmer anzeigen`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-white text-lg">👥</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{stats.participants}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Teilnehmer</p>
                </div>
              </div>
            </Link>
            
            <Link
              to="/rounds"
              className="group p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              aria-label={`${stats.rounds} Runden anzeigen`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-white text-lg">🎭</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{stats.rounds}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Runden</p>
                </div>
              </div>
            </Link>
            
            <Link
              to="/news"
              className="group p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              aria-label={`${stats.news} Nachrichten anzeigen`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-white text-lg">📰</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{stats.news}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Nachrichten</p>
                </div>
              </div>
            </Link>
            
            <Link
              to="/timetable"
              className="group p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              aria-label="Zeitplan anzeigen"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-white text-lg">📅</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Zeitplan</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Veranstaltungen</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </AnimateOnScroll>

      {/* City Tips Preview Section */}
      <AnimateOnScroll>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-8 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Chemnitz Tipps & Empfehlungen</h2>
              <p className="text-gray-600 dark:text-gray-400">Entdecke die besten Orte in Chemnitz für deinen SLAM25 Aufenthalt</p>
            </div>
            <Link
              to="/city-tips"
              className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              aria-label="Alle Stadt-Tipps anzeigen"
            >
              <span className="mr-2" aria-hidden="true">🗺️</span>
              Alle Tipps anzeigen
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {cityTipsLoading ? (
              // Loading state with skeleton
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
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
            ) : featuredCityTips.length > 0 ? (
              // Display featured tips
              featuredCityTips.map((tip) => (
                <div
                  key={tip.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-md transition-all duration-200 hover:-translate-y-1 micro-interaction"
                  tabIndex="0"
                  role="article"
                  aria-label={`${tip.name} - ${tip.description}`}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg ${getCategoryColor(tip.category)}`} aria-hidden="true">
                      {tip.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{tip.name}</h3>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-yellow-500" aria-label={`Bewertung: ${tip.rating} von 5 Sternen`}>⭐ {tip.rating}</span>
                        <span className="text-gray-500 dark:text-gray-400" aria-hidden="true">•</span>
                        <span className="text-gray-500 dark:text-gray-400" aria-label={`Preiskategorie: ${tip.price}`}>{tip.price}</span>
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
                  Keine Tipps verfügbar
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Besuche die Stadt-Tipps Seite für alle Empfehlungen.
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-xl flex items-center justify-center mx-auto mb-2" aria-hidden="true">
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
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center mx-auto mb-2" aria-hidden="true">
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
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mx-auto mb-2" aria-hidden="true">
                  <span className="text-xl">🍺</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Bars</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{categoryStats.bar} Empfehlungen</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-xl flex items-center justify-center mx-auto mb-2" aria-hidden="true">
                  <span className="text-xl">🏨</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Hotels</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{categoryStats.hotel} Empfehlungen</p>
              </div>
            </div>
          </div>
        </div>
      </AnimateOnScroll>

      {/* Info Pages Section */}
      {infoPages.length > 0 && (
        <AnimateOnScroll>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-8 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Info & Regeln</h2>
                <p className="text-gray-600 dark:text-gray-400">Wichtige Informationen und Wettbewerbsregeln</p>
              </div>
              <Link
                to="/info"
                className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                aria-label="Alle Info-Seiten anzeigen"
              >
                <span className="mr-2" aria-hidden="true">📋</span>
                Alle Info-Seiten
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {infoPages.slice(0, 3).map((page) => (
                <Link
                  key={page.id}
                  to={`/info/${page.slug}`}
                  className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  aria-label={`Info-Seite: ${page.title}`}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white text-lg" aria-hidden="true">
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
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>📅 {new Date(page.updatedAt).toLocaleDateString('de-DE')}</span>
                    <span className="text-orange-600 dark:text-orange-400">→ Lesen</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </AnimateOnScroll>
      )}

      {/* Wettbewerbsrunden Section */}
      <AnimateOnScroll>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-8 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Wettbewerbsrunden</h2>
              <p className="text-gray-600 dark:text-gray-400">Übersicht aller Runden und Teilnehmer</p>
            </div>
            <Link
              to="/rounds"
              className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              aria-label="Alle Runden anzeigen"
            >
              <span className="mr-2" aria-hidden="true">🎭</span>
              Alle Runden anzeigen
            </Link>
          </div>
          
          <div className="space-y-4">
            {rounds.slice(0, 3).map((round, index) => (
              <Link
                key={round.id}
                to={`/rounds#round-${round.id}`}
                className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                aria-label={`Runde: ${round.title}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{round.title}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>📅 {round.startDateTime ? new Date(round.startDateTime).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        timeZone: 'Europe/Berlin'
                      }) : 'Datum nicht gesetzt'}</span>
                      <span>🕐 {round.startDateTime ? new Date(round.startDateTime).toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Europe/Berlin'
                      }) : '--:--'}</span>
                      <span>📍 {round.location || 'Unbekannter Ort'}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      round.status === 'upcoming' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      round.status === 'active' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {round.status === 'upcoming' ? '⏳ Anstehend' : 
                       round.status === 'active' ? '🎭 Aktiv' : '✅ Abgeschlossen'}
                    </span>
                    <span className="text-gray-400" aria-hidden="true">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          {/* Show participants if no rounds have groups */}
          {rounds.length > 0 && !rounds.some(hasGroups) && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alle Teilnehmer</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {participants.slice(0, 9).map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    tabIndex="0"
                    role="article"
                    aria-label={`Teilnehmer: ${participant.name}`}
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold" aria-hidden="true">
                      {participant.name ? participant.name.charAt(0).toUpperCase() : participant.id.toString().charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{participant.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{participant.role}</p>
                    </div>
                    <div className="text-sm text-gray-400" aria-hidden="true">
                      {participant.region ? getRegionFlag(participant.region) : '📍'}
                    </div>
                  </div>
                ))}
              </div>
              {participants.length > 9 && (
                <div className="mt-4 text-center">
                  <Link
                    to="/participants"
                    className="text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                    aria-label={`Alle ${participants.length} Teilnehmer anzeigen`}
                  >
                    Alle {participants.length} Teilnehmer anzeigen →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </AnimateOnScroll>
    </div>
  );
}
