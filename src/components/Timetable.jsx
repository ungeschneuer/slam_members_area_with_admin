import React, { useState, useEffect } from 'react';
import hybridDataService from '../services/hybridDataService.js';
import LoadingSpinner from './LoadingSpinner';
import { ErrorMessage, SuccessMessage } from './ErrorBoundary.jsx';

export default function Timetable() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  // Load events from hybrid service
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await hybridDataService.getData('timetable');
        
        if (data && data.length > 0) {
          setEvents(data);
        } else {
          // Set default events if none exist
          const defaultEvents = [
            { 
              id: 1, 
              title: 'Anmeldung & Check-in', 
              date: '2025-10-28', 
              startTime: '09:00', 
              endTime: '10:00', 
              location: 'Hauptsaal', 
              type: 'registration', 
              description: 'Alle Teilnehmer müssen sich registrieren und einchecken, bevor der Wettbewerb beginnt', 
              detailedDescription: 'Die Anmeldung findet im Hauptsaal statt. Bitte bringen Sie Ihren Ausweis und die Bestätigungs-E-Mail mit. Nach der Registrierung erhalten Sie Ihr Teilnehmerpaket mit Namensschild, Programmheft und weiteren wichtigen Informationen.',
              additionalLinks: [
                { title: 'Anmeldeformular', url: 'https://example.com/registration', type: 'form' },
                { title: 'Teilnehmerrichtlinien', url: 'https://example.com/guidelines', type: 'document' }
              ],
              status: 'upcoming' 
            },
            { 
              id: 2, 
              title: 'Qualifikationsrunde 1', 
              date: '2025-10-28', 
              startTime: '10:30', 
              endTime: '12:30', 
              location: 'Bühne 1', 
              type: 'competition', 
              description: 'Erste Qualifikationsrunde - 24 Teilnehmer präsentieren eigene Werke', 
              detailedDescription: 'In der ersten Qualifikationsrunde treten 24 Teilnehmer in drei Gruppen à 8 Personen an. Jeder Teilnehmer hat maximal 5 Minuten für seinen Vortrag. Die Jury besteht aus 5 Personen aus dem Publikum. Die Top 3 jeder Gruppe qualifizieren sich für das Halbfinale.',
              additionalLinks: [
                { title: 'Teilnehmerliste', url: 'https://example.com/participants', type: 'list' },
                { title: 'Bewertungskriterien', url: 'https://example.com/criteria', type: 'document' },
                { title: 'Live-Stream', url: 'https://example.com/livestream', type: 'stream' }
              ],
              status: 'completed' 
            },
            { 
              id: 3, 
              title: 'Mittagspause', 
              date: '2025-10-28', 
              startTime: '12:30', 
              endTime: '13:30', 
              location: 'Speisesaal', 
              type: 'break', 
              description: 'Mittagspause für Teilnehmer*innen und Publikum', 
              detailedDescription: 'Während der Mittagspause können Sie sich im Speisesaal mit einem Buffet stärken. Es gibt vegetarische und vegane Optionen. Nutzen Sie die Zeit auch zum Netzwerken mit anderen Teilnehmern und Jury-Mitgliedern.',
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
              startTime: '13:30', 
              endTime: '15:30', 
              location: 'Bühne 1', 
              type: 'competition', 
              description: 'Zweite Qualifikationsrunde - verbleibende Teilnehmer', 
              detailedDescription: 'Die zweite Qualifikationsrunde folgt dem gleichen Format wie die erste. Die verbleibenden Teilnehmer werden in neue Gruppen eingeteilt. Auch hier qualifizieren sich die Top 3 jeder Gruppe für das Halbfinale.',
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
              startTime: '19:00', 
              endTime: '21:00', 
              location: 'Hauptbühne', 
              type: 'competition', 
              description: 'Erstes Halbfinale - Top 8 Dichter kämpfen um Finalplätze', 
              detailedDescription: 'Das erste Halbfinale findet auf der Hauptbühne statt. Die 8 qualifizierten Teilnehmer treten in zwei Gruppen à 4 Personen an. Jeder hat 6 Minuten für seinen Vortrag. Die Top 2 jeder Gruppe erreichen das Finale.',
              additionalLinks: [
                { title: 'Qualifizierte Teilnehmer', url: 'https://example.com/semifinalists', type: 'list' },
                { title: 'Tickets kaufen', url: 'https://example.com/tickets', type: 'ticket' },
                { title: 'Live-Stream', url: 'https://example.com/semifinal-live', type: 'stream' }
              ],
              status: 'upcoming' 
            },
            { 
              id: 6, 
              title: 'Großes Finale', 
              date: '2025-10-30', 
              startTime: '20:00', 
              endTime: '22:00', 
              location: 'Hauptbühne', 
              type: 'competition', 
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
      } catch (err) {
        setError(err.message);
        console.error('Error loading events:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();

    // Subscribe to data changes
    const unsubscribe = hybridDataService.subscribe((dataType) => {
      if (dataType === 'timetable') {
        console.log('Timetable: Data changed, refreshing...');
        loadEvents();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

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

  // Helper function to format time from ISO string or time string
  const formatTime = (timeString) => {
    if (!timeString || typeof timeString !== 'string') return '--:--';
    
    // If it's already in HH:MM format, return as is
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
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

  if (loading) {
    return <LoadingSpinner />;
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
            <option value="workshop">Workshop</option>
            <option value="performance">Performance</option>
            <option value="networking">Networking</option>
            <option value="award">Award</option>
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
                  
                  return (
                    <div key={`event-${event.id || eventIndex}-${eventIndex}`} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {event.startTime && typeof event.startTime === 'string' ? event.startTime.split(':')[0] : '?'}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{event.title || 'Unbekanntes Event'}</h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              event.type === 'workshop' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              event.type === 'performance' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                              event.type === 'networking' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {event.type === 'workshop' ? '🎓 Workshop' :
                               event.type === 'performance' ? '🎭 Performance' :
                               event.type === 'networking' ? '🤝 Networking' : '🏆 Award'}
                            </span>
                          </div>
                          
                          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                            <div className="flex items-center space-x-2">
                              <span>🕐</span>
                              <span>{event.startTime || '--:--'} - {event.endTime || '--:--'}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span>📍</span>
                              <span>{event.location || 'Unbekannter Ort'}</span>
                            </div>
                            {event.participants && Array.isArray(event.participants) && event.participants.length > 0 && (
                              <div className="flex items-center space-x-2">
                                <span>👥</span>
                                <span>{event.participants.length} Teilnehmer</span>
                              </div>
                            )}
                          </div>
                          
                          <p className="text-gray-700 dark:text-gray-300 mb-4">{event.description || 'Keine Beschreibung verfügbar'}</p>
                          
                          {/* Additional Links */}
                          {event.additionalLinks && Array.isArray(event.additionalLinks) && event.additionalLinks.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {event.additionalLinks.map((link, linkIndex) => {
                                if (!link || typeof link !== 'object') return null;
                                
                                return (
                                  <a
                                    key={`link-${event.id || eventIndex}-${linkIndex}`}
                                    href={link.url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                  >
                                    <span>{getLinkIcon(link.type)}</span>
                                    <span className="text-sm">{link.title || 'Link'}</span>
                                  </a>
                                );
                              })}
                            </div>
                          )}
                          
                          {/* Detailed Description */}
                          {event.detailedDescription && (
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Details</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{event.detailedDescription}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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
