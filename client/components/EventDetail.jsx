import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTimetableEvent, useParticipants, usePageTitle } from '../hooks/index.js';
import LoadingSpinner from './LoadingSpinner';
import { ErrorMessage, SuccessMessage } from './StatusMessages.jsx';
import { formatInstagramUrl } from '../utils/instagramUtils.js';
import { generateAndDownloadICS } from '../utils/icsUtils.js';
import { getContentTypeIcon, getContentTypeGradient } from '../utils/detailViewUtils.js';
import { handleLinkClick } from '../utils/linkUtils.js';
import BackButton from './shared/BackButton.jsx';
import logger from '../services/logger.js';

export default function EventDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: event, isLoading: eventLoading, error: eventError } = useTimetableEvent(slug);
  
  // Set dynamic page title
  usePageTitle(event?.title || 'Laden...');
  const { data: participantsResponse = [], isLoading: participantsLoading, error: participantsError } = useParticipants();
  const participants = participantsResponse?.data || participantsResponse || [];
  const loading = eventLoading || participantsLoading;
  const error = eventError || participantsError;
  const [success, setSuccess] = useState(null);
  const [icsError, setIcsError] = useState(null);

  // Event data is now provided directly by useTimetableEvent hook

  // Helper function to get event type info
  const getEventTypeInfo = (type) => {
    switch (type) {
      case 'team-round':
        return { icon: '👥', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', label: 'Team-Runde' };
      case 'individual-round':
        return { icon: '👤', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', label: 'Einzel-Runde' };
      case 'workshop':
        return { icon: '🎓', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', label: 'Workshop' };
      case 'fun':
        return { icon: '🎉', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', label: 'Fun' };
      case 'aftershow':
        return { icon: '🎭', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300', label: 'Aftershow' };
      case 'panel':
        return { icon: '🎤', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300', label: 'Panel' };
      case 'networking':
        return { icon: '🤝', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300', label: 'Netzwerktreffen' };
      default:
        return { icon: '📅', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', label: 'Event' };
    }
  };

  // Helper function to get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'active':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'confirmed':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Helper function to get status label
  const getStatusLabel = (status) => {
    switch (status) {
      case 'upcoming': return 'Anstehend';
      case 'active': return 'Aktiv';
      case 'completed': return 'Abgeschlossen';
      case 'confirmed': return 'Bestätigt';
      default: return 'Unbekannt';
    }
  };

  // Helper function to format time
  const formatTime = (timeString) => {
    if (!timeString || typeof timeString !== 'string') return '--:--';
    
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
      return timeString.substring(0, 5);
    }
    
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

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unbekanntes Datum';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Europe/Berlin'
      });
    } catch (error) {
      return dateString;
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

  // Helper function to get participant details
  const getParticipantDetails = (participantId) => {
    if (!participantId || !Array.isArray(participants)) return null;
    return participants.find(p => p.id === parseInt(participantId));
  };

  // Handler for adding event to calendar
  const handleAddToCalendar = async () => {
    try {
      // Clear previous errors
      setIcsError(null);
      
      // Check if event exists
      if (!event) {
        throw new Error('Event nicht gefunden. Bitte versuchen Sie es später erneut.');
      }
      
      
      // Validate required fields
      if (!event.title || !event.date || !event.time) {
        throw new Error('Event-Daten sind unvollständig. Titel, Datum und Zeit sind erforderlich.');
      }
      
      await generateAndDownloadICS(event);
      setSuccess('Kalendereintrag wurde heruntergeladen!');
      logger.info('ICS file generated successfully', { eventSlug: event.slug, eventTitle: event.title });
    } catch (error) {
      logger.error('Failed to generate ICS file', { error: error.message, eventSlug: event?.slug });
      setIcsError(`Fehler beim Erstellen des Kalendereintrags: ${error.message}`);
    }
  };


  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorMessage 
            error={error} 
            onRetry={() => window.location.reload()} 
          />
          <div className="mt-6">
            <Link 
              to="/timetable" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Zurück zum Zeitplan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-6xl mb-4">📅</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Event nicht gefunden
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Das angeforderte Event konnte nicht gefunden werden.
            </p>
            <Link 
              to="/timetable" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Zurück zum Zeitplan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const eventTypeInfo = getEventTypeInfo(event.type);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error and Success Messages */}
        {error && (
          <ErrorMessage 
            error={error} 
            onRetry={() => window.location.reload()} 
            className="mb-6"
          />
        )}
        
        {success && (
          <SuccessMessage 
            message={success} 
            onDismiss={() => setSuccess(null)} 
            className="mb-6"
          />
        )}

        {icsError && (
          <ErrorMessage 
            error={icsError} 
            onDismiss={() => setIcsError(null)} 
            className="mb-6"
          />
        )}

        {/* Header */}
        <div className="mb-8">
          <BackButton to="/timetable" className="mb-4">
            Zurück zum Zeitplan
          </BackButton>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex items-start space-x-4">
              <div className={`w-16 h-16 bg-${getContentTypeGradient('event')} rounded-full flex items-center justify-center text-white text-2xl font-bold`}>
                {getContentTypeIcon('event')}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {event.title || 'Unbekanntes Event'}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${eventTypeInfo.color}`}>
                    {eventTypeInfo.label}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(event.status)}`}>
                    {getStatusLabel(event.status)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Date & Time */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Zeitplan</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Datum</div>
                  <div className="text-gray-600 dark:text-gray-400">{formatDate(event.date)}</div>
                </div>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Zeit</div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {formatTime(event.time) || '--:--'}
                    {event.end_time && (
                      <span className="ml-2">bis {formatTime(event.end_time)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Ort</h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-gray-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">{event.location || 'Unbekannter Ort'}</div>
                  {event.address && (
                    <div className="text-gray-600 dark:text-gray-400 mt-1">{event.address}</div>
                  )}
                  
                  {/* Map Buttons - Only show if we have an address */}
                  {event.address && event.address.trim() && (
                    <div className="flex space-x-2 mt-3">
                      <button
                        onClick={() => {
                          const encodedAddress = encodeURIComponent(event.address);
                          const googleMapsLink = {
                            url: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
                            title: 'Öffnen in Google Maps',
                            is_external: true
                          };
                          handleLinkClick(googleMapsLink, new Event('click'));
                        }}
                        className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        Öffnen in Google Maps
                      </button>
                      <button
                        onClick={() => {
                          const encodedAddress = encodeURIComponent(event.address);
                          const appleMapsLink = {
                            url: `https://maps.apple.com/?q=${encodedAddress}`,
                            title: 'Öffnen in Apple Maps',
                            is_external: true
                          };
                          handleLinkClick(appleMapsLink, new Event('click'));
                        }}
                        className="flex items-center px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium"
                      >
                        <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        Öffnen in Apple Maps
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Beschreibung</h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{event.description}</p>
              </div>
            </div>
          )}

          {/* Detailed Description */}
          {event.detailed_description?.trim() && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Details</h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{event.detailed_description}</p>
              </div>
            </div>
          )}

          {/* Participants Section */}
          {event.assignments && Array.isArray(event.assignments) && event.assignments.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Teilnehmer*innen</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {event.assignments.map((assignment, index) => {
                  // Handle assignment object with participant details
                  const participantId = assignment.participant_id;
                  const participantName = assignment.participant_name || 'Unbekannte*r Teilnehmer*in';
                  const participantRole = assignment.role || '';
                  const participantRegion = assignment.participant_region || '';
                  const participantPronouns = assignment.participant_pronouns || '';
                  const participantInstagram = assignment.participant_instagram || '';
                  const participantSlug = assignment.participant_slug || '';
                  
                  // Skip if no valid participant ID
                  if (!participantId) return null;
                  
                  return (
                    <div key={`participant-${event.id}-${index}`}>
                      {participantSlug ? (
                        <Link
                          to={`/participants/${participantSlug}`}
                          className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 group"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 break-words leading-tight">
                                {participantName}
                              </p>
                              {participantRole && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight mt-1">
                                  {participantRole}
                                </p>
                              )}
                              {participantRegion && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight">
                                  📍 {participantRegion}
                                </p>
                              )}
                              {participantPronouns && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight">
                                  {participantPronouns}
                                </p>
                              )}
                              {participantInstagram && (
                                <div className="mt-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const instagramLink = {
                                        url: formatInstagramUrl(participantInstagram),
                                        title: 'Instagram',
                                        is_external: true
                                      };
                                      handleLinkClick(instagramLink, e);
                                    }}
                                    className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg transition-colors"
                                  >
                                    <span className="text-xs">📷</span>
                                    <span className="ml-1">Instagram</span>
                                  </button>
                                </div>
                              )}
                            </div>
                            <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </Link>
                      ) : (
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white break-words leading-tight">
                              {participantName}
                            </p>
                            {participantRole && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight mt-1">
                                {participantRole}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Additional Links */}
          {event.additional_links && Array.isArray(event.additional_links) && event.additional_links.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Zusätzliche Links</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {event.additional_links.map((link, linkIndex) => {
                  if (!link || typeof link !== 'object') return null;
                  
                  const additionalLink = {
                    url: link.url || '#',
                    title: link.title || 'Link',
                    is_external: true // Timetable additional links are always external
                  };
                  
                  return (
                    <a
                      key={`link-${event.id}-${linkIndex}`}
                      href={link.url || '#'}
                      onClick={(e) => handleLinkClick(additionalLink, e)}
                      className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200"
                    >
                      <span className="text-2xl">{getLinkIcon(link.type)}</span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {link.title || 'Link'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {link.type || 'Externer Link'}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <BackButton to="/timetable">
              Zurück zum Zeitplan
            </BackButton>
            
            <button
              onClick={handleAddToCalendar}
              className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors font-semibold"
              aria-label={`Event "${event.title}" zum Kalender hinzufügen`}
              title="Event als ICS-Datei herunterladen und in Ihren Kalender importieren"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Zu Kalender hinzufügen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}