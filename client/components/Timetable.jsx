import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTimetable, usePageTitle } from '../hooks/index.js';
import LoadingSpinner from './LoadingSpinner';
import { ErrorMessage, SuccessMessage } from './StatusMessages.jsx';
import { getTodayBerlinDateString, isFutureDateBerlin } from '../utils/dateUtils';
import { getAvailableContentFilterOptions, validateFilterValue } from '../utils/filterUtils.js';
import { handleLinkClick } from '../utils/linkUtils.js';
import DayTabs from './shared/DayTabs.jsx';
import FilterButtons from './shared/FilterButtons.jsx';

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

// Helper function to get event type info for badges
const getEventTypeInfo = (type) => {
  switch (type) {
    case 'team-round':
      return { icon: '👥', color: 'bg-red-500 text-white dark:bg-red-600 dark:text-white', label: 'Team-Runde' };
    case 'individual-round':
      return { icon: '👤', color: 'bg-blue-500 text-white dark:bg-blue-600 dark:text-white', label: 'Einzel-Runde' };
    case 'workshop':
      return { icon: '🎓', color: 'bg-green-500 text-white dark:bg-green-600 dark:text-white', label: 'Workshop' };
    case 'fun':
      return { icon: '🎉', color: 'bg-yellow-500 text-black dark:bg-yellow-600 dark:text-black', label: 'Fun' };
    case 'aftershow':
      return { icon: '🎭', color: 'bg-purple-500 text-white dark:bg-purple-600 dark:text-white', label: 'Aftershow' };
    case 'panel':
      return { icon: '🎤', color: 'bg-orange-500 text-white dark:bg-orange-600 dark:text-white', label: 'Panel' };
    case 'networking':
      return { icon: '🤝', color: 'bg-teal-500 text-white dark:bg-teal-600 dark:text-white', label: 'Netzwerktreffen' };
      case 'akkreditierung':
        return { icon: '🪪', color: 'bg-pink-500 text-white dark:bg-pink-600 dark:text-white', label: 'Akkreditierung' };
      case 'festivalzentrum':
        return { icon: '🏟️', color: 'bg-amber-500 text-black dark:bg-amber-600 dark:text-black', label: 'Festivalzentrum' };
    default:
      return { icon: '📅', color: 'bg-gray-500 text-white dark:bg-gray-600 dark:text-white', label: 'Event' };
  }
};

export default function Timetable() {
  usePageTitle('Zeitplan');
  const { data: events = [], isLoading: loading, error } = useTimetable();
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  
  // Day tab logic
  const uniqueDates = useMemo(() => 
    [...new Set(events.map(e => e.date))].sort(),
    [events]
  );

  const dayTabs = useMemo(() => 
    uniqueDates.map((date, index) => ({
      id: date,
      label: `Tag ${index + 1}`,
      subtitle: new Date(date).toLocaleDateString('de-DE', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short',
        timeZone: 'Europe/Berlin'
      })
    })),
    [uniqueDates]
  );

  // Smart default day selection based on current date
  const [activeDay, setActiveDay] = useState(null);

  // Set active day once data is loaded
  useEffect(() => {
    if (uniqueDates.length > 0 && !activeDay) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Check if today is within the event dates
      const todayIndex = uniqueDates.findIndex(date => date === todayStr);
      if (todayIndex !== -1) {
        setActiveDay(uniqueDates[todayIndex]); // Current day
        return;
      }
      
      // Check if we're before the first day
      const firstDate = new Date(uniqueDates[0]);
      if (today < firstDate) {
        setActiveDay(uniqueDates[0]); // First day
        return;
      }
      
      // Check if we're after the last day
      const lastDate = new Date(uniqueDates[uniqueDates.length - 1]);
      if (today > lastDate) {
        setActiveDay(uniqueDates[uniqueDates.length - 1]); // Last day
        return;
      }
      
      // Fallback to first day
      setActiveDay(uniqueDates[0]);
    }
  }, [uniqueDates, activeDay]);

  // Extract matching logic to reusable functions
  const matchesSearchFilter = (event, search) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    
    // Early returns for performance
    if ((event.title || '').toLowerCase().includes(searchLower)) return true;
    if ((event.location || '').toLowerCase().includes(searchLower)) return true;
    if ((event.description || '').toLowerCase().includes(searchLower)) return true;
    
    return false;
  };

  const matchesDayFilter = (event, activeDay) => {
    return activeDay && event.date === activeDay;
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
    { id: 'panel', name: 'Panel' },
    { id: 'networking', name: 'Netzwerktreffen' },
    { id: 'akkreditierung', name: 'Akkreditierung' },
    { id: 'festivalzentrum', name: 'Festivalzentrum' }
  ];

  // Day filtering first, then other filters
  const dayFilteredEvents = useMemo(() => 
    activeDay ? events.filter(e => e.date === activeDay) : [],
    [events, activeDay]
  );

  // Single-pass cascading filter options and results
  const { typeOptions, locationOptions, filteredEvents } = useMemo(() => {
    try {
      // Handle empty or invalid datasets
      if (!Array.isArray(dayFilteredEvents) || dayFilteredEvents.length === 0) {
        return {
          typeOptions: predefinedTypeOptions,
          locationOptions: [{ id: 'all', name: 'Alle Orte' }],
          filteredEvents: []
        };
      }
    
    const afterSearch = dayFilteredEvents.filter(event => {
      if (!event || typeof event !== 'object') return false;
      return matchesSearchFilter(event, searchTerm);
    });
    
    const types = new Set();
    const locations = new Set();
    const filtered = [];
    
    afterSearch.forEach(event => {
      const passesType = matchesTypeFilter(event, typeFilter);
      const passesLocation = matchesLocationFilter(event, locationFilter);
      
      if (passesType && passesLocation) {
        filtered.push(event);
      }
      
      // For type options: match location (but NOT type filter)
      if (passesLocation && event.type) {
        types.add(event.type);
      }
      
      // For location options: match type (but NOT location filter)
      if (passesType && event.location) {
        locations.add(event.location);
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
    
      return {
        typeOptions: typeOpts,
        locationOptions: locationOpts,
        filteredEvents: filtered
      };
    } catch (error) {
      console.error('Error in filter calculation:', error);
      // Return safe defaults on error
      return {
        typeOptions: predefinedTypeOptions,
        locationOptions: [{ id: 'all', name: 'Alle Orte' }],
        filteredEvents: []
      };
    }
  }, [dayFilteredEvents, searchTerm, typeFilter, locationFilter]);

  // Aureset logic (with loop prevention)
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
          timeCircle: 'bg-red-500',
          accent: 'text-red-800 dark:text-red-200'
        };
      case 'individual-round':
        return {
          cardBg: 'bg-accent/20 dark:bg-primary/40',
          cardBorder: 'border-primary/30 dark:border-primary/70',
          timeCircle: 'bg-primary',
          accent: 'text-primary dark:text-accent'
        };
      case 'workshop':
        return {
          cardBg: 'bg-green-100 dark:bg-green-900/40',
          cardBorder: 'border-green-300 dark:border-green-700',
          timeCircle: 'bg-green-500',
          accent: 'text-green-800 dark:text-green-200'
        };
      case 'fun':
        return {
          cardBg: 'bg-yellow-100 dark:bg-yellow-900/40',
          cardBorder: 'border-yellow-300 dark:border-yellow-700',
          timeCircle: 'bg-yellow-500',
          accent: 'text-yellow-800 dark:text-yellow-200'
        };
      case 'aftershow':
        return {
          cardBg: 'bg-purple-100 dark:bg-purple-900/40',
          cardBorder: 'border-purple-300 dark:border-purple-700',
          timeCircle: 'bg-purple-500',
          accent: 'text-purple-800 dark:text-purple-200'
        };
      case 'panel':
        return {
          cardBg: 'bg-orange-100 dark:bg-orange-900/40',
          cardBorder: 'border-orange-300 dark:border-orange-700',
          timeCircle: 'bg-orange-500',
          accent: 'text-orange-800 dark:text-orange-200'
        };
      case 'networking':
        return {
          cardBg: 'bg-teal-100 dark:bg-teal-900/40',
          cardBorder: 'border-teal-300 dark:border-teal-700',
          timeCircle: 'bg-teal-500',
          accent: 'text-teal-800 dark:text-teal-200'
        };
      case 'akkreditierung':
        return {
          cardBg: 'bg-pink-100 dark:bg-pink-900/40',
          cardBorder: 'border-pink-300 dark:border-pink-700',
          timeCircle: 'bg-pink-500',
          accent: 'text-pink-800 dark:text-pink-200'
        };
      case 'festivalzentrum':
        return {
          cardBg: 'bg-amber-100 dark:bg-amber-900/40',
          cardBorder: 'border-amber-300 dark:border-amber-700',
          timeCircle: 'bg-amber-500',
          accent: 'text-amber-800 dark:text-amber-200'
        };
      default:
        return {
          cardBg: 'bg-gray-100 dark:bg-gray-800',
          cardBorder: 'border-gray-300 dark:border-gray-600',
          timeCircle: 'bg-gray-500',
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
      case 'networking': return 'border-l-teal-500';
      case 'akkreditierung': return 'border-l-pink-500';
      case 'festivalzentrum': return 'border-l-amber-500';
      default: return 'border-l-gray-500';
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
      <div className="page-header-card">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Zeitplan</h1>
          <p className="text-gray-600 dark:text-gray-400">Übersicht aller Veranstaltungen und Events während SLAM25</p>
        </div>

        {/* Search and Filter Controls */}
        <div className="space-y-4 mb-6">
          <input
            type="text"
            placeholder="Events durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-base"
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FilterButtons
                options={typeOptions}
                activeFilter={typeFilter}
                onFilterChange={setTypeFilter}
                label="Event-Typ filtern"
                ariaLabel="Event-Typ auswählen"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Ort filtern
              </label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-base"
                aria-label="Ort filtern"
              >
                {locationOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Day Tabs Section */}
      {dayTabs.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-6">
          <div className="flex justify-center">
            <DayTabs 
              days={dayTabs}
              activeDay={activeDay}
              onDayChange={setActiveDay}
            />
          </div>
        </div>
      )}

      {/* Timetable */}
        <div className="space-y-4 sm:space-y-6">
        {filteredEvents.length > 0 ? (
          <div className="flex flex-col gap-5">
                {Array.isArray(filteredEvents) && filteredEvents.map((event, eventIndex) => {
                  // Sicherheitsprüfung für Event-Daten
                  if (!event || typeof event !== 'object') {
                    return null;
                  }
                  
                  const colors = getCategoryColors(event.type);
                  
                  return (
                    <Link 
                      key={`event-${event.id || eventIndex}-${eventIndex}`} 
                      to={`/timetable/event/${event.slug}`}
                      className={`${colors.cardBg} ${getBorderColorClass(event.type)} border-l-4 rounded-xl p-3 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 block group`}
                    >
                      {/* Mobile Layout - Compact List View */}
                      <div className="sm:hidden">
                        <div className="flex items-start space-x-3">
                          {/* Time Circle - Smaller on mobile */}
                          <div className="flex-shrink-0">
                            <div className={`w-10 h-10 ${colors.timeCircle} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                              {event.time && typeof event.time === 'string' ? event.time.split(':')[0] : '?'}
                            </div>
                          </div>
                          
                          {/* Content - Compact */}
                          <div className="flex-1 min-w-0">
                            {/* Title */}
                            <div className="mb-2">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight group-hover:text-primary dark:group-hover:text-accent transition-colors">
                                {event.title || 'Unbekanntes Event'}
                              </h3>
                              {/* Event Type Badge */}
                              {event.type && (
                                <div className="mt-1">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEventTypeInfo(event.type).color}`}>
                                    {getEventTypeInfo(event.type).label}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Time and Location - Compact */}
                            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
                              <div className="flex items-center space-x-1">
                                <span>🕐</span>
                                <span>{formatTime(event.time) || '--:--'}{event.end_time ? ` - ${formatTime(event.end_time)}` : ''}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span>📍</span>
                                <span className="truncate">{event.location || 'Unbekannter Ort'}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span>📅</span>
                                <span>{new Date(event.date).toLocaleDateString('de-DE', { 
                                  weekday: 'short', 
                                  day: 'numeric', 
                                  month: 'short',
                                  timeZone: 'Europe/Berlin'
                                })}</span>
                              </div>
                            </div>
                            
                            {/* Description - Truncated */}
                            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">{event.description || 'Keine Beschreibung verfügbar'}</p>
                            
                            {/* Navigation Arrow - Bottom right */}
                            <div className="flex justify-end mt-2">
                              <div className="flex items-center text-primary dark:text-accent group-hover:text-primary-hover dark:group-hover:text-accent-hover transition-colors">
                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Desktop Layout - Original Card View */}
                      <div className="hidden sm:block">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className={`w-12 h-12 ${colors.timeCircle} rounded-full flex items-center justify-center text-white font-bold text-base`}>
                              {event.time && typeof event.time === 'string' ? event.time.split(':')[0] : '?'}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* Title Row with Navigation Arrow */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight group-hover:text-primary dark:group-hover:text-accent transition-colors">
                                  {event.title || 'Unbekanntes Event'}
                                </h3>
                                {/* Event Type Badge */}
                                {event.type && (
                                  <div className="mt-2">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getEventTypeInfo(event.type).color}`}>
                                      {getEventTypeInfo(event.type).label}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {/* Navigation Arrow - Rounds-style */}
                              <div className="flex items-center text-primary dark:text-accent group-hover:text-primary-hover dark:group-hover:text-accent-hover transition-colors ml-2">
                                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                            
                            
                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs">🕐</span>
                                <span>{formatTime(event.time) || '--:--'}{event.end_time ? ` - ${formatTime(event.end_time)}` : ''}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs">📍</span>
                                <span className="truncate">{event.location || 'Unbekannter Ort'}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs">📅</span>
                                <span>{new Date(event.date).toLocaleDateString('de-DE', { 
                                  weekday: 'short', 
                                  day: 'numeric', 
                                  month: 'short',
                                  timeZone: 'Europe/Berlin'
                                })}</span>
                              </div>
                              {event.address && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs">🗺️</span>
                                  <span className="text-xs truncate">{event.address}</span>
                                </div>
                              )}
                              {event.assignments && Array.isArray(event.assignments) && event.assignments.length > 0 && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs">👥</span>
                                  <span>{event.assignments.length} Teilnehmer*innen</span>
                                </div>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">{event.description || 'Keine Beschreibung verfügbar'}</p>
                            
                            {/* Additional Links */}
                            {event.additional_links && Array.isArray(event.additional_links) && event.additional_links.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {event.additional_links.map((link, linkIndex) => {
                                  if (!link || typeof link !== 'object') return null;
                                  
                                  return (
                                    <button
                                      key={`link-${event.id || eventIndex}-${linkIndex}`}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const timetableLink = {
                                          url: link.url || '#',
                                          title: link.title || 'Link',
                                          is_external: true // Timetable links are always external
                                        };
                                        handleLinkClick(timetableLink, e);
                                      }}
                                      className="inline-flex items-center space-x-1 px-3 py-1 bg-accent/20 dark:bg-primary/30 text-primary dark:text-accent rounded-lg hover:bg-accent/30 dark:hover:bg-primary/40 transition-colors cursor-pointer"
                                    >
                                      <span>{getLinkIcon(link.type)}</span>
                                      <span className="text-sm">{link.title || 'Link'}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            
                            {/* Detailed Description */}
                            {event.detailed_description && (
                              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Details</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{event.detailed_description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-center">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {filteredEvents.length === 0 && dayFilteredEvents.length > 0 
                ? 'Keine Events gefunden' 
                : 'Zeitplan kommt bald :)'
              }
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filteredEvents.length === 0 && dayFilteredEvents.length > 0 
                ? 'Versuche andere Filter oder suche nach anderen Begriffen.' 
                : 'Bald wird hier der komplette SLAM25 Zeitplan zu sehen sein!'
              }
            </p>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

