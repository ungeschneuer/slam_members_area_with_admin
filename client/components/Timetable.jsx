import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTimetable, usePageTitle } from '../hooks/index.js';
import LoadingSpinner from './LoadingSpinner';
import { ErrorMessage, SuccessMessage } from './StatusMessages.jsx';
import { getTodayBerlinDateString, isFutureDateBerlin } from '../utils/dateUtils';
import { getAvailableContentFilterOptions, validateFilterValue } from '../utils/filterUtils.js';

// Event type translations
const translateEventType = (type) => {
  const translations = {
    'meeting': 'Meeting',
    'registration': 'Anmeldung',
    'technical': 'Technik',
    'party': 'Party',
    'workshop': 'Workshop',
    'Einzel-Runde': 'Einzel-Runde'
  };
  return translations[type] || type;
};

export default function Timetable() {
  usePageTitle('Zeitplan');
  const { data: events = [], isLoading: loading, error } = useTimetable();
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dayFilter, setDayFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  
  // Ref to track if initial day selection was made
  const hasSetInitialDay = useRef(false);

  // Extract matching logic to reusable functions
  const matchesSearchFilter = (event, search) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    
    // Early returns for performance
    if (event.title?.toLowerCase().includes(searchLower)) return true;
    if (event.location?.toLowerCase().includes(searchLower)) return true;
    if (event.description?.toLowerCase().includes(searchLower)) return true;
    
    return false;
  };

  const matchesDayFilter = (event, dayFilter) => {
    return dayFilter === 'all' || event.date === dayFilter;
  };

  const matchesTypeFilter = (event, typeFilter) => {
    return typeFilter === 'all' || event.type === typeFilter;
  };

  const matchesLocationFilter = (event, locationFilter) => {
    return locationFilter === 'all' || event.location === locationFilter;
  };

  // Predefined event type options
  const predefinedTypeOptions = [
    { id: 'all', name: 'Alle Typen' },
    { id: 'team-round', name: 'Team-Runde' },
    { id: 'individual-round', name: 'Einzel-Runde' },
    { id: 'workshop', name: 'Workshop' },
    { id: 'fun', name: 'Fun' },
    { id: 'aftershow', name: 'Aftershow' },
    { id: 'panel', name: 'Panel' }
  ];

  // Single-pass cascading filter options and results
  const { typeOptions, locationOptions, dayOptions, filteredEvents } = useMemo(() => {
    try {
      // Handle empty or invalid datasets
      if (!Array.isArray(events) || events.length === 0) {
        return {
          typeOptions: predefinedTypeOptions,
          locationOptions: [{ id: 'all', name: 'Alle Orte' }],
          dayOptions: [{ id: 'all', name: 'Alle Tage' }],
          filteredEvents: []
        };
      }
    
    const afterSearch = events.filter(event => {
      if (!event || typeof event !== 'object') return false;
      return matchesSearchFilter(event, searchTerm);
    });
    
    const types = new Set();
    const locations = new Set();
    const days = new Set();
    const filtered = [];
    
    afterSearch.forEach(event => {
      const passesDay = matchesDayFilter(event, dayFilter);
      const passesType = matchesTypeFilter(event, typeFilter);
      const passesLocation = matchesLocationFilter(event, locationFilter);
      
      if (passesDay && passesType && passesLocation) {
        filtered.push(event);
      }
      
      // For type options: match day + location (but NOT type filter)
      if (passesDay && passesLocation && event.type) {
        types.add(event.type);
      }
      
      // For location options: match day + type (but NOT location filter)
      if (passesDay && passesType && event.location) {
        locations.add(event.location);
      }
      
      // For day options: match type + location (but NOT day filter)
      if (passesType && passesLocation && event.date) {
        days.add(event.date);
      }
    });
    
    const typeOpts = [
      predefinedTypeOptions[0], // "Alle Typen"
      ...Array.from(types).map(type => 
        predefinedTypeOptions.find(opt => opt.id === type) || { id: type, name: type }
      )
    ].filter(Boolean);
    
    const locationOpts = [
      { id: 'all', name: 'Alle Orte' },
      ...Array.from(locations).sort().map(loc => ({ id: loc, name: loc }))
    ];
    
    const dayOpts = [
      { id: 'all', name: 'Alle Tage' },
      ...Array.from(days).sort().map(date => ({
        id: date,
        name: new Date(date).toLocaleDateString('de-DE', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long',
          timeZone: 'Europe/Berlin'
        })
      }))
    ];
    
      return {
        typeOptions: typeOpts,
        locationOptions: locationOpts,
        dayOptions: dayOpts,
        filteredEvents: filtered
      };
    } catch (error) {
      console.error('Error in filter calculation:', error);
      // Return safe defaults on error
      return {
        typeOptions: predefinedTypeOptions,
        locationOptions: [{ id: 'all', name: 'Alle Orte' }],
        dayOptions: [{ id: 'all', name: 'Alle Tage' }],
        filteredEvents: []
      };
    }
  }, [events, searchTerm, dayFilter, typeFilter, locationFilter]);

  // Auto-reset logic (with loop prevention)
  const resetInProgress = useRef(false);
  
  useEffect(() => {
    if (resetInProgress.current) return;
    if (!typeOptions.some(opt => opt.id === typeFilter)) {
      resetInProgress.current = true;
      setTypeFilter('all');
      setTimeout(() => { resetInProgress.current = false; }, 0);
    }
  }, [typeOptions, typeFilter]);

  useEffect(() => {
    if (resetInProgress.current) return;
    if (!locationOptions.some(opt => opt.id === locationFilter)) {
      resetInProgress.current = true;
      setLocationFilter('all');
      setTimeout(() => { resetInProgress.current = false; }, 0);
    }
  }, [locationOptions, locationFilter]);

  // Smart default day selection - runs once when data loads
  useEffect(() => {
    // Only run once and when loading completes
    if (hasSetInitialDay.current || loading || !events || events.length === 0) {
      return;
    }
    
    // Mark as completed to prevent future runs
    hasSetInitialDay.current = true;
    
    // Get today's date in Berlin timezone
    const todayStr = getTodayBerlinDateString();
    
    // Get unique dates from events and sort them
    const eventsArray = Array.isArray(events) ? events : [];
    const eventDates = [...new Set(eventsArray.map(e => e.date))].sort();
    
    // Check if today has events
    if (eventDates.includes(todayStr)) {
      setDayFilter(todayStr);
      return;
    }
    
    // Find future and past dates
    const futureDates = eventDates.filter(date => isFutureDateBerlin(date));
    const pastDates = eventDates.filter(date => !isFutureDateBerlin(date));
    
    // If we have both past and future events, select the next future date
    if (futureDates.length > 0 && pastDates.length > 0) {
      setDayFilter(futureDates[0]);
      return;
    }
    
    // If all events are in the future OR all events are in the past OR no events, show "all"
    setDayFilter('all');
  }, [events, loading]);


  // Group events by date
  const groupedEvents = filteredEvents.reduce((groups, event) => {
    const date = event.date;
    if (!groups[date]) {
      groups[date] = {
        date: date,
        dayName: new Date(date).toLocaleDateString('de-DE', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          timeZone: 'Europe/Berlin'
        }),
        events: []
      };
    }
    groups[date].events.push(event);
    return groups;
  }, {});

  // Convert to array and sort by date
  const groupedEventsArray = Object.values(groupedEvents || {}).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Helper function to format time from database time field
  const formatTime = (timeString) => {
    if (!timeString || typeof timeString !== 'string') return '--:--';
    
    // If it's already in HH:MM format, return as is
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    // If it's in HH:MM:SS format, extract just HH:MM
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
      return timeString.substring(0, 5);
    }
    
    // If it's an ISO timestamp, extract the time part
    if (timeString.includes('T')) {
      try {
        const date = new Date(timeString);
        if (isNaN(date.getTime())) return '--:--';
        return date.toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Berlin'
        });
      } catch (error) {
        return '--:--';
      }
    }
    
    return timeString;
  };

  // Helper function to format date for display
  const formatDateForDisplay = (date) => {
    if (!date) return 'Datum unbekannt';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Ungültiges Datum';
      return dateObj.toLocaleDateString('de-DE', { 
        weekday: 'short',
        day: '2-digit', 
        month: '2-digit',
        timeZone: 'Europe/Berlin'
      });
    } catch (error) {
      return 'Ungültiges Datum';
    }
  };

  // Helper function to get link icon
  const getLinkIcon = (type) => {
    if (!type || typeof type !== 'string') return '🔗';
    
    switch (type) {
      case 'form': return '📝';
      case 'document': return '📄';
      case 'list': return '📋';
      case 'stream': return '📺';
      case 'menu': return '🍽️';
      case 'info': return 'ℹ️';
      case 'ticket': return '🎫';
      default: return '🔗';
    }
  };

  // Helper function to get category color scheme
  const getCategoryColors = (eventType) => {
    switch (eventType) {
      case 'team-round':
        return {
          cardBg: 'bg-red-100 dark:bg-red-900/40',
          cardBorder: 'border-red-300 dark:border-red-700',
          accent: 'text-red-800 dark:text-red-200'
        };
      case 'individual-round':
        return {
          cardBg: 'bg-blue-100 dark:bg-blue-900/40',
          cardBorder: 'border-blue-300 dark:border-blue-700',
          accent: 'text-blue-800 dark:text-blue-200'
        };
      case 'workshop':
        return {
          cardBg: 'bg-green-100 dark:bg-green-900/40',
          cardBorder: 'border-green-300 dark:border-green-700',
          accent: 'text-green-800 dark:text-green-200'
        };
      case 'fun':
        return {
          cardBg: 'bg-yellow-100 dark:bg-yellow-900/40',
          cardBorder: 'border-yellow-300 dark:border-yellow-700',
          accent: 'text-yellow-800 dark:text-yellow-200'
        };
      case 'aftershow':
        return {
          cardBg: 'bg-purple-100 dark:bg-purple-900/40',
          cardBorder: 'border-purple-300 dark:border-purple-700',
          accent: 'text-purple-800 dark:text-purple-200'
        };
      case 'panel':
        return {
          cardBg: 'bg-orange-100 dark:bg-orange-900/40',
          cardBorder: 'border-orange-300 dark:border-orange-700',
          accent: 'text-orange-800 dark:text-orange-200'
        };
      default:
        return {
          cardBg: 'bg-gray-100 dark:bg-gray-800',
          cardBorder: 'border-gray-300 dark:border-gray-600',
          accent: 'text-gray-800 dark:text-gray-200'
        };
    }
  };

  // Helper to get border-left color from category colors
  const getBorderColorClass = (eventType) => {
    switch (eventType) {
      case 'team-round': return 'border-l-red-500';
      case 'individual-round': return 'border-l-blue-500';
      case 'workshop': return 'border-l-green-500';
      case 'fun': return 'border-l-yellow-500';
      case 'aftershow': return 'border-l-purple-500';
      case 'panel': return 'border-l-orange-500';
      default: return 'border-l-gray-500';
    }
  };

  // Helper function to get competition type indicator color
  const getCompetitionTypeIndicator = (eventType) => {
    switch (eventType) {
      case 'team-round':
        return 'bg-red-500';
      case 'individual-round':
        return 'bg-[#185757]';
      case 'workshop':
        return 'bg-green-500';
      case 'fun':
        return 'bg-yellow-500';
      case 'aftershow':
        return 'bg-purple-500';
      case 'panel':
        return 'bg-orange-500';
      case 'networking':
        return 'bg-teal-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div data-testid="timetable-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
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

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Zeitplan</h1>
          <p className="text-gray-600 dark:text-gray-400">Übersicht aller Veranstaltungen und Events während SLAM25</p>
        </div>

        {/* Search and Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <input
            type="text"
            placeholder="Events durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          <select
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Alle Tage</option>
            {[...new Set(events.map(e => e.date))].sort().map(date => (
              <option key={date} value={date}>
                {new Date(date).toLocaleDateString('de-DE', { 
                  weekday: 'short', 
                  year: '2-digit', 
                  month: '2-digit', 
                  day: '2-digit',
                  timeZone: 'Europe/Berlin'
                })}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            {typeOptions.map(option => (
              <option key={option.id} value={option.id}>
                {option.id === 'all' ? option.name : translateEventType(option.id)}
              </option>
            ))}
          </select>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            aria-label="Ort filtern"
          >
            {locationOptions.map(option => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        {/* Timetable */}
        <div className="space-y-6">
          {Array.isArray(groupedEventsArray) && groupedEventsArray.map((dayGroup, dayIndex) => (
            <div key={`day-${dayGroup.date}-${dayIndex}`} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Date Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {dayGroup.dayName}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {dayGroup.events.length} Event{dayGroup.events.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {Array.isArray(dayGroup.events) && dayGroup.events.map((event, eventIndex) => {
                  // Sicherheitsprüfung für Event-Daten
                  if (!event || typeof event !== 'object') {
                    return null;
                  }
                  
                  const colors = getCategoryColors(event.type);
                  
                  return (
                    <Link 
                      key={`event-${event.id || eventIndex}-${eventIndex}`} 
                      to={event.internal_link ? `/rounds/${event.internal_link}` : `/timetable/event/${event.slug}`}
                      className={`${colors.cardBg} ${getBorderColorClass(event.type)} border-l-4 rounded-lg p-3 sm:p-6 shadow-sm border ${colors.cardBorder} hover:shadow-md transition-all duration-200 block group`}
                    >
                      <div className="flex items-start space-x-3 sm:space-x-4">
                        <div className="text-center flex-shrink-0">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatTime(event.time)} - {formatTime(event.end_time)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                            {formatDateForDisplay(event.date)}
                          </div>
                        </div>

                        {/* Colored Indicator Line - Desktop only */}
                        <div className={`hidden sm:block w-1 h-12 rounded-full ${getCompetitionTypeIndicator(event.type)}`}></div>
                        
                        <div className="flex-1 min-w-0">
                          {/* Title Row with Navigation Arrow */}
                          <div className="flex items-start justify-between mb-1 sm:mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {event.title || 'Unbekanntes Event'}
                              </h3>
                            </div>
                            {/* Navigation Arrow - Rounds-style */}
                            <div className="flex items-center text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors ml-2">
                              <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                          
                          {/* Event Type Badge */}
                          <div className="mb-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              event.type === 'team-round' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              event.type === 'individual-round' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              event.type === 'workshop' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              event.type === 'fun' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              event.type === 'aftershow' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                              event.type === 'panel' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {event.type === 'team-round' ? '👥' :
                               event.type === 'individual-round' ? '👤' :
                               event.type === 'workshop' ? '🎓' :
                               event.type === 'fun' ? '🎉' :
                               event.type === 'aftershow' ? '🎭' :
                               event.type === 'panel' ? '🎤' : '📅'}
                            </span>
                          </div>
                          
                          <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <span className="text-xs">🕐</span>
                              <span>{formatTime(event.time) || '--:--'}{event.end_time ? ` - ${formatTime(event.end_time)}` : ''}</span>
                            </div>
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <span className="text-xs">📍</span>
                              <span className="truncate">{event.location || 'Unbekannter Ort'}</span>
                            </div>
                            {event.assignments && Array.isArray(event.assignments) && event.assignments.length > 0 && (
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <span className="text-xs">👥</span>
                                <span>{event.assignments.length} Teilnehmer*innen</span>
                              </div>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 sm:mb-4 line-clamp-2">{event.description || 'Keine Beschreibung verfügbar'}</p>
                          
                          {/* Additional Links - Hidden on mobile for compactness */}
                          {event.additional_links && Array.isArray(event.additional_links) && event.additional_links.length > 0 && (
                            <div className="hidden sm:flex flex-wrap gap-2 mb-4">
                              {event.additional_links.map((link, linkIndex) => {
                                if (!link || typeof link !== 'object') return null;
                                
                                return (
                                  <button
                                    key={`link-${event.id || eventIndex}-${linkIndex}`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      window.open(link.url || '#', '_blank', 'noopener,noreferrer');
                                    }}
                                    className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                                  >
                                    <span>{getLinkIcon(link.type)}</span>
                                    <span className="text-sm">{link.title || 'Link'}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          
                          {/* Detailed Description - Hidden on mobile */}
                          {event.detailed_description && (
                            <div className="hidden sm:block bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Details</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{event.detailed_description}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {(!filteredEvents || filteredEvents.length === 0) && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Keine Events gefunden
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Versuchen Sie andere Suchbegriffe oder Filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

