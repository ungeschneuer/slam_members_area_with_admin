import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTimetable } from '../hooks/index.js';
import LoadingSpinner from './LoadingSpinner';
import { ErrorMessage, SuccessMessage } from './StatusMessages.jsx';

export default function Timetable() {
  const { data: timetableData, isLoading: loading, error } = useTimetable();
  const [events, setEvents] = useState([]);
  const [success, setSuccess] = useState(null);
  const [selectedDate, setSelectedDate] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [expandedEvents, setExpandedEvents] = useState(new Set());
  const [dayFilter, setDayFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Update local state when useLiveData changes
  useEffect(() => {
    if (timetableData && timetableData.length > 0) {
      setEvents(timetableData);
    } else {
          // Set default events if none exist
          const defaultEvents = [
            { 
              id: 1, 
              title: 'Anmeldung & Check-in', 
              date: '2025-10-28', 
              time: '09:00', 
              end_time: '10:00',
              location: 'Hauptsaal', 
              type: 'workshop', 
              description: 'Alle Teilnehmer*innen müssen sich registrieren und einchecken, bevor der Wettbewerb beginnt', 
              detailedDescription: 'Die Anmeldung findet im Hauptsaal statt. Bitte bringen Sie Ihren Ausweis und die Bestätigungs-E-Mail mit. Nach der Registrierung erhalten Sie Ihr Teilnehmer*innenpaket mit Namensschild, Programmheft und weiteren wichtigen Informationen.',
              additionalLinks: [
                { title: 'Anmeldeformular', url: 'https://example.com/registration', type: 'form' },
                { title: 'Teilnehmer*innenrichtlinien', url: 'https://example.com/guidelines', type: 'document' }
              ],
              status: 'upcoming' 
            },
            { 
              id: 2, 
              title: 'Qualifikationsrunde 1', 
              date: '2025-10-28', 
              time: '10:30',
              end_time: '12:30', 
              location: 'Bühne 1', 
              type: 'individual-round', 
              description: 'Erste Qualifikationsrunde - 24 Teilnehmer*innen präsentieren eigene Werke', 
              detailedDescription: 'In der ersten Qualifikationsrunde treten 24 Teilnehmer*innen in drei Gruppen à 8 Personen an. Jeder Teilnehmer*innen hat maximal 5 Minuten für seinen Vortrag. Die Jury besteht aus 5 Personen aus dem Publikum. Die Top 3 jeder Gruppe qualifizieren sich für das Halbfinale.',
              additionalLinks: [
                { title: 'Teilnehmer*innenliste', url: 'https://example.com/participants', type: 'list' },
                { title: 'Bewertungskriterien', url: 'https://example.com/criteria', type: 'document' },
                { title: 'Live-Stream', url: 'https://example.com/livestream', type: 'stream' }
              ],
              status: 'completed' 
            },
            { 
              id: 3, 
              title: 'Mittagspause', 
              date: '2025-10-28', 
              time: '12:30',
              end_time: '13:30', 
              location: 'Speisesaal', 
              type: 'fun', 
              description: 'Mittagspause für Teilnehmer*innen und Publikum', 
              detailedDescription: 'Während der Mittagspause können Sie sich im Speisesaal mit einem Buffet stärken. Es gibt vegetarische und vegane Optionen. Nutzen Sie die Zeit auch zum Netzwerken mit anderen Teilnehmer*innen und Jury-Mitgliedern.',
              additionalLinks: [
                { title: 'Speisekarte', url: 'https://example.com/menu', type: 'menu' },
                { title: 'Networking-Bereich', url: 'https://example.com/networking', type: 'info' }
              ],
              status: 'completed' 
            },
            { 
              id: 4, 
              title: 'Qualifikationsrunde 2', 
              date: '2025-10-28', 
              time: '13:30',
              end_time: '15:30', 
              location: 'Bühne 1', 
              type: 'individual-round', 
              description: 'Zweite Qualifikationsrunde - verbleibende Teilnehmer*innen', 
              detailedDescription: 'Die zweite Qualifikationsrunde folgt dem gleichen Format wie die erste. Die verbleibenden Teilnehmer*innen werden in neue Gruppen eingeteilt. Auch hier qualifizieren sich die Top 3 jeder Gruppe für das Halbfinale.',
              additionalLinks: [
                { title: 'Gruppeneinteilung', url: 'https://example.com/groups', type: 'list' },
                { title: 'Live-Stream', url: 'https://example.com/livestream2', type: 'stream' }
              ],
              status: 'upcoming' 
            },
            { 
              id: 5, 
              title: 'Halbfinale 1', 
              date: '2025-10-29', 
              time: '19:00',
              end_time: '21:00', 
              location: 'Hauptbühne', 
              type: 'individual-round', 
              description: 'Erstes Halbfinale - Top 8 Dichter kämpfen um Finalplätze', 
              detailedDescription: 'Das erste Halbfinale findet auf der Hauptbühne statt. Die 8 qualifizierten Teilnehmer*innen treten in zwei Gruppen à 4 Personen an. Jeder hat 6 Minuten für seinen Vortrag. Die Top 2 jeder Gruppe erreichen das Finale.',
              additionalLinks: [
                { title: 'Qualifizierte Teilnehmer*innen', url: 'https://example.com/semifinalists', type: 'list' },
                { title: 'Tickets kaufen', url: 'https://example.com/tickets', type: 'ticket' },
                { title: 'Live-Stream', url: 'https://example.com/semifinal-live', type: 'stream' }
              ],
              status: 'upcoming' 
            },
            { 
              id: 6, 
              title: 'Großes Finale', 
              date: '2025-10-30', 
              time: '20:00',
              end_time: '22:00', 
              location: 'Hauptbühne', 
              type: 'individual-round', 
              description: 'Das große Finale - Die besten 4 Dichter kämpfen um den Titel', 
              detailedDescription: 'Das große Finale ist der Höhepunkt des Wettbewerbs. Die 4 Finalisten treten vor einer großen Jury und Publikum an. Jeder Finalist hat 8 Minuten für seinen Vortrag. Der Gewinner erhält den SLAM25-Titel und ein Preisgeld.',
              additionalLinks: [
                { title: 'Finalisten', url: 'https://example.com/finalists', type: 'list' },
                { title: 'Tickets kaufen', url: 'https://example.com/final-tickets', type: 'ticket' },
                { title: 'Live-Stream', url: 'https://example.com/final-live', type: 'stream' }
              ],
              status: 'upcoming' 
            }
          ];
          setEvents(defaultEvents);
    }
  }, [timetableData]);

  // Filter and sort events
  const filteredEvents = (events || []).filter(event => {
    const matchesSearch = event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDay = dayFilter === 'all' || event.date === dayFilter;
    const matchesType = typeFilter === 'all' || event.type === typeFilter;
    
    return matchesSearch && matchesDay && matchesType;
  });

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
          timeCircle: 'bg-gradient-to-br from-red-500 to-red-600',
          accent: 'text-red-800 dark:text-red-200'
        };
      case 'individual-round':
        return {
          cardBg: 'bg-blue-100 dark:bg-blue-900/40',
          cardBorder: 'border-blue-300 dark:border-blue-700',
          timeCircle: 'bg-gradient-to-br from-blue-500 to-blue-600',
          accent: 'text-blue-800 dark:text-blue-200'
        };
      case 'workshop':
        return {
          cardBg: 'bg-green-100 dark:bg-green-900/40',
          cardBorder: 'border-green-300 dark:border-green-700',
          timeCircle: 'bg-gradient-to-br from-green-500 to-green-600',
          accent: 'text-green-800 dark:text-green-200'
        };
      case 'fun':
        return {
          cardBg: 'bg-yellow-100 dark:bg-yellow-900/40',
          cardBorder: 'border-yellow-300 dark:border-yellow-700',
          timeCircle: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
          accent: 'text-yellow-800 dark:text-yellow-200'
        };
      case 'aftershow':
        return {
          cardBg: 'bg-purple-100 dark:bg-purple-900/40',
          cardBorder: 'border-purple-300 dark:border-purple-700',
          timeCircle: 'bg-gradient-to-br from-purple-500 to-purple-600',
          accent: 'text-purple-800 dark:text-purple-200'
        };
      default:
        return {
          cardBg: 'bg-gray-100 dark:bg-gray-800',
          cardBorder: 'border-gray-300 dark:border-gray-600',
          timeCircle: 'bg-gradient-to-br from-gray-500 to-gray-600',
          accent: 'text-gray-800 dark:text-gray-200'
        };
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
            <option value="2025-10-25">Samstag, 25. Oktober</option>
            <option value="2025-10-26">Sonntag, 26. Oktober</option>
            <option value="2025-10-27">Montag, 27. Oktober</option>
            <option value="2025-10-28">Dienstag, 28. Oktober</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Alle Typen</option>
            <option value="team-round">Team-Runde</option>
            <option value="individual-round">Einzel-Runde</option>
            <option value="workshop">Workshop</option>
            <option value="fun">Fun</option>
            <option value="aftershow">Aftershow</option>
          </select>
        </div>

        {/* Timetable */}
        <div className="space-y-6">
          {Array.isArray(groupedEventsArray) && groupedEventsArray.map((dayGroup, dayIndex) => (
            <div key={`day-${dayGroup.date}-${dayIndex}`} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {dayGroup.dayName}
              </h2>
              
              <div className="space-y-4">
                {Array.isArray(dayGroup.events) && dayGroup.events.map((event, eventIndex) => {
                  // Sicherheitsprüfung für Event-Daten
                  if (!event || typeof event !== 'object') {
                    return null;
                  }
                  
                  const colors = getCategoryColors(event.type);
                  
                  return (
                    <Link 
                      key={`event-${event.id || eventIndex}-${eventIndex}`} 
                      to={`/timetable/event/${event.slug}`}
                      className={`${colors.cardBg} rounded-lg p-3 sm:p-6 shadow-sm border ${colors.cardBorder} hover:shadow-md transition-all duration-200 block`}
                    >
                      <div className="flex items-start space-x-3 sm:space-x-4">
                        <div className="flex-shrink-0">
                          <div className={`w-8 h-8 sm:w-12 sm:h-12 ${colors.timeCircle} rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base`}>
                            {event.time && typeof event.time === 'string' ? event.time.split(':')[0] : '?'}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1 sm:mb-2">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white leading-tight">{event.title || 'Unbekanntes Event'}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                              event.type === 'team-round' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              event.type === 'individual-round' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              event.type === 'workshop' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              event.type === 'fun' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              event.type === 'aftershow' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {event.type === 'team-round' ? '👥' :
                               event.type === 'individual-round' ? '👤' :
                               event.type === 'workshop' ? '🎓' :
                               event.type === 'fun' ? '🎉' :
                               event.type === 'aftershow' ? '🎭' : '📅'}
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
                            {event.participants_details && Array.isArray(event.participants_details) && event.participants_details.length > 0 && (
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <span className="text-xs">👥</span>
                                <span>{event.participants_details.length} Teilnehmer*innen</span>
                              </div>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 sm:mb-4 line-clamp-2">{event.description || 'Keine Beschreibung verfügbar'}</p>
                          
                          {/* Additional Links - Hidden on mobile for compactness */}
                          {event.additionalLinks && Array.isArray(event.additionalLinks) && event.additionalLinks.length > 0 && (
                            <div className="hidden sm:flex flex-wrap gap-2 mb-4">
                              {event.additionalLinks.map((link, linkIndex) => {
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
                          {event.detailedDescription && (
                            <div className="hidden sm:block bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Details</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{event.detailedDescription}</p>
                            </div>
                          )}
                          
                          {/* Mehr Informationen Link - Simplified for mobile */}
                          <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-gray-200 dark:border-gray-600">
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Details</span>
                              <div className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                                <span className="text-xs sm:text-sm font-medium">Mehr</span>
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          </div>
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
              Versuchen Sie andere Suchkriterien oder schauen Sie später wieder vorbei.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

