import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useParticipants, useRounds, useTimetable, useParticipantTeams, usePageTitle } from '../hooks/index.js';
import { translateRoundStatus, getRoundStatusIcon, getRoundStatusColor } from "../../shared/constants/categories.js";
import { isCrewRole, getCrewRoleLabel } from '../utils/crewRoleUtils.js';
import { 
  formatTime, 
  formatDate, 
  getEventTypeInfo, 
  getRoleColor, 
  getRegionFlag,
  getContentTypeIcon,
  getContentTypeGradient
} from '../utils/detailViewUtils.js';
import { handleLinkClick } from '../utils/linkUtils.js';
import BackButton from './shared/BackButton.jsx';

export default function ParticipantDetail() {
  const { slug } = useParams();
  const { data: participantsResponse = [], isLoading: participantsLoading, error: participantsError } = useParticipants({ limit: 10000 });
  const participantsData = participantsResponse?.data || [];
  const { data: roundsData = [], isLoading: roundsLoading, error: roundsError } = useRounds();
  const { data: timetableData = [], isLoading: timetableLoading, error: timetableError } = useTimetable();
  
  // Use useMemo for computed values instead of manual state synchronization
  const participant = useMemo(() => {
    return participantsData.find(p => p.slug === slug);
  }, [participantsData, slug]);

  // Set dynamic page title
  usePageTitle(participant?.name || 'Laden...');

  const { data: participantTeams = [], isLoading: teamsLoading, error: teamsError } = useParticipantTeams(participant?.id);
  
  const loading = participantsLoading || roundsLoading || timetableLoading || teamsLoading;
  const error = participantsError || roundsError || timetableError || teamsError;

  const participantRounds = useMemo(() => {
    if (!participant || !roundsData) return [];
    return roundsData.filter(round => {
      // Check if participant has any role in this round
      return round.assignments && 
        round.assignments.some(assignment => assignment.participant_id === participant.id);
    });
  }, [participant, roundsData]);

  const participantTimetableEvents = useMemo(() => {
    if (!participant || !timetableData) return [];
    return timetableData.filter(event => {
      // Check if participant is in event assignments (consistent with rounds structure)
      if (!event.assignments || !Array.isArray(event.assignments)) {
        return false;
      }
      
      return event.assignments.some(p => {
        // Ensure both IDs are numbers for comparison
        return parseInt(p.participant_id) === parseInt(participant.id);
      });
    });
  }, [participant, timetableData]);

  // Enhanced participantRounds with roles and performance data
  const enhancedParticipantRounds = useMemo(() => {
    if (!participant || !roundsData) return [];
    
    return roundsData.filter(round => {
      // Check if participant has any role in this round
      return round.assignments && 
        round.assignments.some(assignment => assignment.participant_id === participant.id);
    }).map(round => {
      const roles = [];
      
      // Find the participant's assignment in this round
      const assignment = round.assignments?.find(a => a.participant_id === participant.id);
      
      if (assignment) {
        // Map roles to German labels
        assignment.roles.forEach(role => {
          switch (role) {
            case 'participant':
              roles.push('Wettbewerb-Teilnehmer*in');
              break;
            case 'feature_artist':
              const order = assignment.metadata?.display_order || 0;
              const featureLabel = order > 0 ? `Feature Artist #${order}` : 'Feature Artist';
              roles.push(featureLabel);
              break;
            case 'moderator':
              roles.push('Moderator*in');
              break;
            case 'jury':
              roles.push('Jury');
              break;
            default:
              // Handle crew roles (both old and new format)
              if (isCrewRole(role)) {
                const crewLabel = role === 'crew' && assignment.metadata?.role 
                  ? assignment.metadata.role 
                  : getCrewRoleLabel(role);
                roles.push(`SLAM25-Team: ${crewLabel}`);
              } else {
                roles.push(role);
              }
          }
        });
      }

      // Get performance data if tournament participant
      let performance = null;
      if (assignment && assignment.roles.includes('participant')) {
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

  // Enhanced participantTimetableEvents with roles (consistent with rounds structure)
  const enhancedParticipantTimetableEvents = useMemo(() => {
    if (!participant || !timetableData) return [];
    
    return timetableData.filter(event => {
      // Check if participant is in event assignments (consistent with rounds structure)
      if (!event.assignments || !Array.isArray(event.assignments)) {
        return false;
      }
      
      return event.assignments.some(p => {
        // Ensure both IDs are numbers for comparison
        return parseInt(p.participant_id) === parseInt(participant.id);
      });
    }).map(event => {
      const participantInEvent = event.assignments.find(p => {
        return parseInt(p.participant_id) === parseInt(participant.id);
      });
      
      // Handle roles array (consistent with rounds) - use first role as primary
      const role = participantInEvent?.role || 'Teilnehmer*in';
      const roles = [role]; // Convert to array for consistent handling
      
      return {
        ...event,
        role: role,
        roles: roles,
        metadata: participantInEvent?.metadata || {},
        type: 'event'
      };
    });
  }, [participant, timetableData]);



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
          <BackButton to="/participants" className="mb-4">
            Zurück zu Teilnehmer*innen
          </BackButton>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex items-start">
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
                        key={`role-${role}-${index}`}
                        className="badge-role"
                      >
                        {role}
                      </span>
                    ));
                  })()}
                  {participant.region && (
                    <span className="badge-region">
                      {getRegionFlag(participant.region)} {participant.region}
                    </span>
                  )}
                  {participant.pronouns && (
                    <span className="badge-pronouns">
                      {participant.pronouns}
                    </span>
                  )}
                </div>
                {participant.instagram && (
                  <a
                    href={`https://instagram.com/${participant.instagram}`}
                    onClick={(e) => {
                      const instagramLink = {
                        url: `https://instagram.com/${participant.instagram}`,
                        title: `Instagram Profil von ${participant.name}`,
                        is_external: true
                      };
                      handleLinkClick(instagramLink, e);
                    }}
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
          <div className="detail-section mb-6">
            <div className="detail-section-header">
              <h2 className="detail-section-title">
                🏆 Turnier-Runden
              </h2>
              <p className="detail-section-subtitle">
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
                          <span className="badge-primary">
                            🏆 Runde
                          </span>
                          
                          {(round.calculatedStatus || round.status) && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoundStatusColor(round.calculatedStatus || round.status, true)}`}>
                              {getRoundStatusIcon(round.calculatedStatus || round.status)} {translateRoundStatus(round.calculatedStatus || round.status)}
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
                          <span>🕐 {round.start_time} - {round.end_time}</span>
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
                      {round.competition_type && (
                        <div className="mb-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                            🏆 {round.competition_type}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Link to Details */}
                    <div className="ml-4">
                      <Link
                        to={`/rounds/${round.slug}`}
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
                        {/* Only show total score if there are meaningful scores */}
                        {round.performance.scores && round.performance.scores.length > 0 && round.performance.scores.some(score => score > 0) && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Gesamtpunktzahl</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {round.performance.totalScore.toFixed(1)}
                              {round.performance.isWinner && (
                                <span className="ml-2 text-yellow-600 dark:text-yellow-400">👑</span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Only show jury scores if there are meaningful scores */}
                      {round.performance.scores && round.performance.scores.length > 0 && round.performance.scores.some(score => score > 0) && (
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
            <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700">
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
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoundStatusColor(event.status, true)}`}>
                              {getRoundStatusIcon(event.status)} {translateRoundStatus(event.status)}
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

                    </div>
                    
                    {/* Link to Details */}
                    <div className="ml-4">
                      {event.slug ? (
                        <Link
                          to={`/timetable/event/${event.slug}`}
                          className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                          Details →
                        </Link>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 text-sm text-gray-400 cursor-not-allowed">
                          No Details Available
                        </span>
                      )}
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

        {/* Team Membership Section */}
        {participantTeams.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                👥 Team-Mitgliedschaften
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Teams, denen {participant.name} angehört
              </p>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {participantTeams.map((team, index) => (
                <div key={`team-${team.id}-${index}`} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            👥 Team
                          </span>
                          {team.region && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                              {team.region}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        <Link
                          to={`/teams/${team.slug}`}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                          {team.name}
                        </Link>
                      </h3>
                      
                      {team.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {team.description}
                        </p>
                      )}
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-4">
                          {team.region && <span>📍 {team.region}</span>}
                          {team.instagram && (
                            <a
                              href={`https://instagram.com/${team.instagram}`}
                              onClick={(e) => {
                                const teamInstagramLink = {
                                  url: `https://instagram.com/${team.instagram}`,
                                  title: `Instagram Profil von ${team.name}`,
                                  is_external: true
                                };
                                handleLinkClick(teamInstagramLink, e);
                              }}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              📷 @{team.instagram}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0">
                      <Link
                        to={`/teams/${team.slug}`}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      >
                        View Team
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Participation Message */}
        {enhancedParticipantRounds.length === 0 && enhancedParticipantTimetableEvents.length === 0 && participantTeams.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">📅</div>
              <p>Noch keine Teilnahme an Runden oder Events</p>
            </div>
          </div>
        )}

        {/* Bottom Back Button */}
        <div className="mt-8">
          <BackButton to="/participants">
            Zurück zu Teilnehmer*innen
          </BackButton>
        </div>
      </div>
    </div>
  );
}
