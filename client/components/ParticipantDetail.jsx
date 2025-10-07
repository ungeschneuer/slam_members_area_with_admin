import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useParticipants, useRounds, useTimetable } from '../hooks/index.js';

export default function ParticipantDetail() {
  const { slug } = useParams();
  const { data: participantsData = [], isLoading: participantsLoading, error: participantsError } = useParticipants();
  const { data: roundsData = [], isLoading: roundsLoading, error: roundsError } = useRounds();
  const { data: timetableData = [], isLoading: timetableLoading, error: timetableError } = useTimetable();
  
  const loading = participantsLoading || roundsLoading || timetableLoading;
  const error = participantsError || roundsError || timetableError;

  // Use useMemo for computed values instead of manual state synchronization
  const participant = useMemo(() => {
    return participantsData.find(p => p.slug === slug);
  }, [participantsData, slug]);

  const participantRounds = useMemo(() => {
    if (!participant || !roundsData) return [];
    return roundsData.filter(round => {
      // Check if participant is in tournament participants
      const isTournamentParticipant = round.tournamentParticipants && 
        round.tournamentParticipants.some(p => p.participantId === participant.id);
      
      // Check if participant is in crew
      const isCrewMember = round.crew && 
        round.crew.some(crewMember => crewMember.participantId === participant.id);
      
      // Check if participant is a feature artist
      const isFeatureArtist = round.featureArtists && 
        round.featureArtists.some(feature => feature.participantId === participant.id);
      
      return isTournamentParticipant || isCrewMember || isFeatureArtist;
    });
  }, [participant, roundsData]);

  const participantTimetableEvents = useMemo(() => {
    if (!participant || !timetableData) return [];
    return timetableData.filter(event => {
      // Check if participant is in event participants_details (new junction table structure)
      if (!event.participants_details || !Array.isArray(event.participants_details)) {
        return false;
      }
      
      return event.participants_details.some(p => {
        // Ensure both IDs are numbers for comparison
        return parseInt(p.id) === parseInt(participant.id);
      });
    });
  }, [participant, timetableData]);

  // Enhanced participantRounds with roles and performance data
  const enhancedParticipantRounds = useMemo(() => {
    if (!participant || !roundsData) return [];
    
    return roundsData.filter(round => {
      // Check if participant is in tournament participants
      const isTournamentParticipant = round.tournamentParticipants && 
        round.tournamentParticipants.some(p => p.participantId === participant.id);
      
      // Check if participant is in crew
      const isCrewMember = round.crew && 
        round.crew.some(crewMember => crewMember.participantId === participant.id);
      
      // Check if participant is a feature artist
      const isFeatureArtist = round.featureArtists && 
        round.featureArtists.some(feature => feature.participantId === participant.id);
      
      return isTournamentParticipant || isCrewMember || isFeatureArtist;
    }).map(round => {
      const roles = [];
      
      // Determine roles in this round
      if (round.tournamentParticipants && round.tournamentParticipants.some(p => p.participantId === participant.id)) {
        roles.push('Turnier-Teilnehmer*in');
      }
      
      if (round.crew && round.crew.some(crewMember => crewMember.participantId === participant.id)) {
        const crewMember = round.crew.find(crewMember => crewMember.participantId === participant.id);
        roles.push(`Crew (${crewMember.role})`);
      }
      
      if (round.featureArtists && round.featureArtists.some(feature => feature.participantId === participant.id)) {
        const feature = round.featureArtists.find(feature => feature.participantId === participant.id);
        // Feature artists don't have a role property, they have order and description
        const featureLabel = feature.order ? `Feature Artist #${feature.order}` : 'Feature Artist';
        roles.push(featureLabel);
      }

      // Get performance data if tournament participant
      let performance = null;
      if (round.tournamentParticipants && round.tournamentParticipants.some(p => p.participantId === participant.id)) {
        if (round.groups) {
          for (const group of round.groups) {
            const participantInGroup = group.participants.find(p => p.participantId === participant.id);
            if (participantInGroup) {
              performance = {
                group: group.name,
                order: participantInGroup.order,
                scores: participantInGroup.scores || [],
                totalScore: participantInGroup.totalScore || 0,
                isWinner: participantInGroup.isWinner || false
              };
              break;
            }
          }
        }
      }

      return {
        ...round,
        roles,
        performance
      };
    });
  }, [participant, roundsData]);

  // Enhanced participantTimetableEvents with roles
  const enhancedParticipantTimetableEvents = useMemo(() => {
    if (!participant || !timetableData) return [];
    
    return timetableData.filter(event => {
      // Check if participant is in event participants_details (new junction table structure)
      if (!event.participants_details || !Array.isArray(event.participants_details)) {
        return false;
      }
      
      return event.participants_details.some(p => {
        // Ensure both IDs are numbers for comparison
        return parseInt(p.id) === parseInt(participant.id);
      });
    }).map(event => {
      const participantInEvent = event.participants_details.find(p => {
        return parseInt(p.id) === parseInt(participant.id);
      });
      
      const role = participantInEvent?.role || 'Teilnehmer*in';
      
      return {
        ...event,
        role,
        type: 'event'
      };
    });
  }, [participant, timetableData]);

  const getRoleColor = (role) => {
    switch (role) {
      case 'Teilnehmer*in': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Jury': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'Supporter*in': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Crew': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'SLAM-MC': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'Organisator*in': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'Moderator*in': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      case 'Techniker*in': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Fotograf*in': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300';
      case 'Videograf*in': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getRegionFlag = (region) => {
    const flagMap = {
      'Baden-Württemberg': '🇩🇪',
      'Bayern': '🇩🇪',
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
      'Sachsen': '🇩🇪',
      'Sachsen-Anhalt': '🇩🇪',
      'Schleswig-Holstein': '🇩🇪',
      'Thüringen': '🇩🇪',
      'Österreich': '🇦🇹',
      'Schweiz': '🇨🇭',
      'Belgien': '🇧🇪',
      'Luxemburg': '🇱🇺',
      'Südtirol': '🇮🇹'
    };
    return flagMap[region] || '🌍';
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

  // Helper function to get event type icon and color
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
      default:
        return { icon: '📅', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', label: 'Event' };
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Lade Teilnehmer*innendaten...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-6xl mb-4">👤</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Teilnehmer*in nicht gefunden
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Die gesuchte Teilnehmer*in konnte nicht gefunden werden.
            </p>
            <Link
              to="/participants"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              ← Zurück zu Teilnehmer*innen
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/participants"
            className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück zu Teilnehmer*innen
          </Link>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {participant.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {participant.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {(() => {
                    // Handle both single role (string) and multiple roles (array)
                    let roles = [];
                    
                    if (Array.isArray(participant.roles)) {
                      roles = participant.roles;
                    } else if (participant.role) {
                      // Handle comma-separated roles
                      roles = participant.role.includes(',') 
                        ? participant.role.split(',').map(r => r.trim())
                        : [participant.role];
                    }
                    
                    return roles.map((role, index) => (
                      <span 
                        key={index}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(role)}`}
                      >
                        {role}
                      </span>
                    ));
                  })()}
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    {getRegionFlag(participant.region)} {participant.region}
                  </span>
                  {participant.pronouns && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300">
                      {participant.pronouns}
                    </span>
                  )}
                </div>
                {participant.instagram && (
                  <a
                    href={`https://instagram.com/${participant.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    @{participant.instagram}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>


        {/* Rounds Section */}
        {enhancedParticipantRounds.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                🏆 Turnier-Runden
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Runden, an denen {participant.name} teilnimmt
              </p>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {enhancedParticipantRounds.map((round, index) => (
                <div key={`round-${round.id}-${index}`} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                            🏆 Runde
                          </span>
                          
                          {round.status && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              round.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                              round.status === 'upcoming' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                              round.status === 'active' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                              round.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {round.status === 'completed' ? 'Abgeschlossen' :
                               round.status === 'upcoming' ? 'Geplant' :
                               round.status === 'active' ? 'Aktiv' :
                               round.status === 'confirmed' ? '✔️ Bestätigt' : round.status}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {round.title}
                      </h3>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <div className="flex items-center space-x-4">
                          <span>📅 {formatDate(round.date)}</span>
                          <span>🕐 {round.startTime} - {round.endTime}</span>
                          <span>📍 {round.location}</span>
                        </div>
                      </div>

                      {/* Role Information */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {round.roles.map((role, roleIndex) => (
                          <span
                            key={roleIndex}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                          >
                            {role}
                          </span>
                        ))}
                      </div>

                      {/* Competition Type for Rounds */}
                      {round.competitionType && (
                        <div className="mb-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                            🏆 {round.competitionType}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Link to Details */}
                    <div className="ml-4">
                      <Link
                        to={`/rounds/${round.slug || round.id}`}
                        className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      >
                        Details →
                      </Link>
                    </div>
                  </div>

                  {/* Performance Details for Rounds */}
                  {round.performance && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        Leistung in dieser Runde
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Gruppe</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {round.performance.group}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Reihenfolge</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {round.performance.order}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Gesamtpunktzahl</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {round.performance.totalScore.toFixed(1)}
                            {round.performance.isWinner && (
                              <span className="ml-2 text-yellow-600 dark:text-yellow-400">👑</span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {round.performance.scores && round.performance.scores.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Jury-Bewertungen</p>
                          <div className="flex flex-wrap gap-2">
                            {round.performance.scores.map((score, scoreIndex) => (
                              <span
                                key={scoreIndex}
                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300"
                              >
                                {score.toFixed(1)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Events Section */}
        {enhancedParticipantTimetableEvents.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                📅 Events & Workshops
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Events und Workshops, an denen {participant.name} teilnimmt
              </p>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {enhancedParticipantTimetableEvents.map((event, index) => (
                <div key={`event-${event.id}-${index}`} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEventTypeInfo(event.type).color}`}>
                            {getEventTypeInfo(event.type).icon} {getEventTypeInfo(event.type).label}
                          </span>
                          
                          {event.status && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              event.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                              event.status === 'upcoming' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                              event.status === 'active' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                              event.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {event.status === 'completed' ? 'Abgeschlossen' :
                               event.status === 'upcoming' ? 'Geplant' :
                               event.status === 'active' ? 'Aktiv' :
                               event.status === 'confirmed' ? '✔️ Bestätigt' : event.status}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {event.title}
                      </h3>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <div className="flex items-center space-x-4">
                          <span>📅 {formatDate(event.date)}</span>
                          <span>🕐 {formatTime(event.time)}</span>
                          <span>📍 {event.location}</span>
                        </div>
                      </div>

                      {/* Role Information */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          {event.role}
                        </span>
                      </div>
                    </div>
                    
                    {/* Link to Details */}
                    <div className="ml-4">
                      <Link
                        to={`/timetable/event/${event.id}`}
                        className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      >
                        Details →
                      </Link>
                    </div>
                  </div>

                  {/* Event Description */}
                  {event.description && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Beschreibung
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {event.description}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Participation Message */}
        {enhancedParticipantRounds.length === 0 && enhancedParticipantTimetableEvents.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">📅</div>
              <p>Noch keine Teilnahme an Runden oder Events</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
