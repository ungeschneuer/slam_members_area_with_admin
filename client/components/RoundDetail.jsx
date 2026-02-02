import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useRounds, useParticipants, useRoundBySlug, usePageTitle } from '../hooks/index.js';
import LoadingSpinner from './LoadingSpinner.jsx';
import { ErrorMessage, SuccessMessage } from './StatusMessages.jsx';
import { translateRoundStatus, getRoundStatusIcon, getRoundStatusColor } from "../../shared/constants/categories.js";
import { calculateTotalScore, shouldStrikeScore } from '../utils/scoreCalculation.js';
import { hasCrewRole, getCrewRolesFromAssignment } from '../utils/crewRoleUtils.js';
import { 
  createParticipantLookupMap, 
  createAssignmentLookupMap, 
  lookupParticipantData,
  getParticipantFallbackName 
} from '../utils/participantLookupUtils.js';
import { getRegionFlag, getContentTypeIcon, getContentTypeGradient } from '../utils/detailViewUtils.js';
import { handleLinkClick } from '../utils/linkUtils.js';
import BackButton from './shared/BackButton.jsx';

const RoundDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: round, isLoading: roundLoading, error: roundError } = useRoundBySlug(slug);
  
  // Set dynamic page title
  usePageTitle(round?.title || 'Laden...');
  const { data: participantsResponse = [], isLoading: participantsLoading, error: participantsError } = useParticipants();
  const participants = participantsResponse?.data || participantsResponse || [];
  const loading = roundLoading || participantsLoading;
  const error = roundError || participantsError;

  // Optimized lookup maps for O(1) participant access
  const participantLookup = useMemo(() => 
    createParticipantLookupMap(participants), 
    [participants]
  );

  const assignmentLookup = useMemo(() => 
    round?.assignments ? createAssignmentLookupMap(round.assignments) : { participantMap: new Map(), teamMap: new Map() },
    [round?.assignments]
  );

  // Round data is now provided directly by useRoundBySlug hook

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Berlin'
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    return time;
  };

  // Use centralized status functions
  const getStatusColor = (status) => getRoundStatusColor(status, true);
  const getStatusLabel = (status) => translateRoundStatus(status);

  const getCompetitionTypeLabel = (type) => {
    const labels = {
      'Einzelwettbewerb': 'Einzelwettbewerb',
      'Teamwettbewerb': 'Teamwettbewerb',
      'Freestyle': 'Freestyle'
    };
    return labels[type] || type;
  };

  const getParticipantById = (participantId) => {
    // First try to find in participants array
    const participant = participants.find(p => p.id === participantId);
    if (participant) return participant;
    
    // If not found, try to construct from assignment data
    // This handles cases where participant data is embedded in assignments
    const assignment = round?.assignments?.find(a => a.participant_id === participantId);
    if (assignment && assignment.participant_name) {
      return {
        id: assignment.participant_id,
        name: assignment.participant_name,
        slug: assignment.participant_slug,
        region: assignment.participant_region,
        pronouns: assignment.participant_pronouns,
        instagram: assignment.participant_instagram
      };
    }
    
    return null;
  };

  const getParticipantName = (participantId) => {
    const participant = getParticipantById(participantId);
    return participant ? participant.name : 'Unbekannte*r Teilnehmer*in';
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <ErrorMessage message={error} />
          <Link 
            to="/rounds" 
            className="mt-4 inline-block bg-[#185757] dark:bg-[#A2D2B9] text-white dark:text-gray-900 px-4 py-2 rounded-lg hover:bg-[#0f3a3b] dark:hover:bg-[#8BC4A3] transition-colors"
          >
            Zurück zu den Runden
          </Link>
        </div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Runde nicht gefunden</h1>
          <Link 
            to="/rounds" 
            className="bg-[#185757] dark:bg-[#A2D2B9] text-white dark:text-gray-900 px-4 py-2 rounded-lg hover:bg-[#0f3a3b] dark:hover:bg-[#8BC4A3] transition-colors"
          >
            Zurück zu den Runden
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <BackButton to="/rounds" className="mb-4">
            Zurück zu den Runden
          </BackButton>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex items-start space-x-4">
              <div className={`w-12 h-12 sm:w-16 sm:h-16 ${getContentTypeGradient('round')} rounded-full flex items-center justify-center text-white text-lg sm:text-2xl font-bold`}>
                {getContentTypeIcon('round')}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {round.title}
                </h1>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(round.calculatedStatus || round.status)}`}>
                    {getRoundStatusIcon(round.calculatedStatus || round.status)} {getStatusLabel(round.calculatedStatus || round.status)}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">
                    {getCompetitionTypeLabel(round.competition_type)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Date & Time */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Zeitplan</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Datum</div>
                  <div className="text-gray-600 dark:text-gray-400">{formatDate(round.date)}</div>
                </div>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Zeit</div>
                  <div className="text-gray-600 dark:text-gray-400">{formatTime(round.start_time)} - {formatTime(round.end_time)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Ort</h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-gray-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{round.location}</div>
                  {round.address && (
                    <div className="text-gray-600 dark:text-gray-400 mt-1">{round.address}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Photos Cloud Link */}
          {round.photos_cloud_url && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Fotos</h2>
              <a
                href={round.photos_cloud_url}
                onClick={(e) => {
                  const photosLink = {
                    url: round.photos_cloud_url,
                    title: 'Zu den Fotos öffnen',
                    is_external: true
                  };
                  handleLinkClick(photosLink, e);
                }}
                aria-label="Zu den Fotos öffnen (öffnet in neuem Tab)"
                className="inline-flex items-center px-6 py-3 bg-[#185757] dark:bg-[#A2D2B9] text-white dark:text-gray-900 rounded-lg hover:bg-[#0f3a3b] dark:hover:bg-[#8BC4A3] transition-colors duration-200 font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Zu den Fotos
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}

          {/* Competition Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Wettbewerbsdetails</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-300">Typ</div>
                <div className="text-gray-900 dark:text-white">{getCompetitionTypeLabel(round.competition_type)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-300">Jury-Mitglieder</div>
                <div className="text-gray-900 dark:text-white">{round.total_jury_members}</div>
              </div>
              {round.assignments && round.assignments.filter(a => a.roles.includes('participant')).length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-300">Teilnehmer*innen</div>
                  <div className="text-gray-900 dark:text-white">{round.assignments.filter(a => a.roles.includes('participant')).length}</div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {round.description && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Beschreibung</h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{round.description}</p>
              </div>
            </div>
          )}

          {/* Crew */}
          {round.assignments && round.assignments.filter(hasCrewRole).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">SLAM25-Team</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {round.assignments
                  .filter(hasCrewRole)
                  .map((assignment, index) => {
                    const participant = getParticipantById(assignment.participant_id);
                    const crewRoles = getCrewRolesFromAssignment(assignment);
                    const crewLabel = crewRoles.join(', ');
                    
                    return (
                      <div key={`crew-member-${assignment.participant_id}-${index}`}>
                        {participant ? (
                          <Link
                            to={`/participants/${participant.slug}`}
                            className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 group"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 break-words leading-tight">
                                  {participant.name}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight mt-1">
                                  {crewLabel}
                                </p>
                                {participant.region && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500 break-words mt-1">
                                    {getRegionFlag(participant.region)} {participant.region}
                                  </p>
                                )}
                              </div>
                              <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </Link>
                        ) : (
                          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white break-words leading-tight">
                                  {assignment.participant_name}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight mt-1">
                                  {crewLabel}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Moderation */}
          {round.assignments && round.assignments.filter(a => a.roles.includes('moderator')).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Moderation</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {round.assignments
                  .filter(assignment => assignment.roles.includes('moderator'))
                  .map((assignment, index) => {
                    const participant = getParticipantById(assignment.participant_id);
                    const description = assignment.metadata?.description || '';
                    
                    return (
                      <div key={`moderator-${assignment.participant_id}-${index}`}>
                        {participant ? (
                          <Link
                            to={`/participants/${participant.slug}`}
                            className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 group"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200 break-words leading-tight">
                                  {participant.name}
                                </p>
                                {description && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight mt-1">
                                    {description}
                                  </p>
                                )}
                                {participant.region && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500 break-words mt-1">
                                    {getRegionFlag(participant.region)} {participant.region}
                                  </p>
                                )}
                              </div>
                              <svg className="w-4 h-4 text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </Link>
                        ) : (
                          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white break-words leading-tight">
                                  {assignment.participant_name}
                                </p>
                                {description && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight mt-1">
                                    {description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Feature Artists */}
          {round.assignments && round.assignments.filter(a => a.roles.includes('feature_artist')).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Feature-Künstler*innen</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {round.assignments
                  .filter(assignment => assignment.roles.includes('feature_artist'))
                  .map((assignment, index) => {
                    // Handle both participants and teams as feature artists
                    const participant = getParticipantById(assignment.participant_id);
                    const isTeam = assignment.team_id && assignment.team_name;
                    const order = assignment.metadata?.display_order || 0;
                    const description = assignment.metadata?.description || '';
                    
                    if (isTeam) {
                      // Display team as feature artist
                      const teamName = assignment.team_name || 'Unbekanntes Team';
                      const teamMembers = assignment.team_members || [];
                      
                      return (
                        <div key={`feature-team-${assignment.team_id}-${index}`}>
                          <Link
                            to={`/teams/${assignment.team_slug || 'unknown'}`}
                            className="block p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors duration-200 group border border-purple-200 dark:border-purple-800"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white break-words group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200 leading-tight">
                                  {teamName}
                                </p>
                                {order > 0 && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight mt-1">
                                    #{order}
                                  </p>
                                )}
                                {description && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight mt-1">
                                    {description}
                                  </p>
                                )}
                                {teamMembers.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Team Members:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {teamMembers.map((member, memberIndex) => (
                                        <span
                                          key={memberIndex}
                                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200"
                                        >
                                          {member.name}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </Link>
                        </div>
                      );
                    } else {
                      // Display individual participant as feature artist
                      const name = participant ? participant.name : assignment.participant_name || 'Unbekannte*r Feature-Künstler*in';
                      
                      return (
                        <div key={`feature-participant-${assignment.participant_id}-${index}`}>
                          {participant ? (
                            <Link
                              to={`/participants/${participant.slug}`}
                              className="block p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors duration-200 group"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white break-words group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200 leading-tight">
                                    {name}
                                  </p>
                                  {order > 0 && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight mt-1">
                                      #{order}
                                    </p>
                                  )}
                                  {description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight mt-1">
                                      {description}
                                    </p>
                                  )}
                                  {participant.region && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 break-words mt-1">
                                      {getRegionFlag(participant.region)} {participant.region}
                                    </p>
                                  )}
                                </div>
                                <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </Link>
                          ) : (
                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white break-words leading-tight">
                                    {name}
                                  </p>
                                  {order > 0 && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight mt-1">
                                      #{order}
                                    </p>
                                  )}
                                  {description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight mt-1">
                                      {description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                  })}
              </div>
            </div>
          )}


          {/* Groups and Results */}
          {round.groups && round.groups.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Gruppen & Ergebnisse</h2>
              <div className="space-y-6">
                {round.groups.map((group, groupIndex) => (
                    <div key={groupIndex} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Gruppe {groupIndex + 1}</h3>
                      <div className="space-y-3">
                        {group.participants && group.participants
                          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                          .map((participant, participantIndex) => {
                          // Use centralized participant lookup logic
                          const participantData = lookupParticipantData(
                            participant, 
                            participantLookup, 
                            assignmentLookup, 
                            round?.assignments || []
                          );
                          const isTeam = participantData?.isTeam || false;
                          
                          const scores = participant.juryScores || [];
                          const totalScore = calculateTotalScore(scores);
                          const isWinner = participant.isWinner;
                          const hasScores = scores.length > 0 && scores.some(score => score > 0);
                        
                        return (
                          <div key={participantIndex} className={`p-4 rounded-lg border ${
                            isWinner 
                              ? 'bg-yellow-50 orange-50 dark:from-yellow-900/20 dark:orange-900/20 border-yellow-200 dark:border-yellow-800' 
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                          }`}>
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                                isWinner 
                                  ? 'bg-yellow-500 text-white' 
                                  : 'bg-[#185757] text-white'
                              }`}>
                                {participant.order || participantIndex + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                {participantData ? (
                                  <div>
                                    {isTeam ? (
                                      <div>
                                        <Link
                                          to={`/teams/${participantData.slug}`}
                                          className={`block font-semibold text-base sm:text-lg break-words hover:underline transition-colors duration-200 ${
                                            isWinner ? 'text-yellow-800 dark:text-yellow-200 hover:text-yellow-600 dark:hover:text-yellow-400' : 'text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400'
                                          }`}
                                        >
                                          {participantData.name}
                                          {isWinner && <span className="ml-2">👑</span>}
                                        </Link>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
                                          Team • {participantData.region}
                                        </p>
                                        {participantData.teamMembers && participantData.teamMembers.length > 0 && (
                                          <div className="mt-2">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Teammitglieder:</p>
                                            <div className="flex flex-wrap gap-1">
                                              {participantData.teamMembers.map((member, memberIndex) => (
                                                <span
                                                  key={memberIndex}
                                                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
                                                >
                                                  {member.name}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div>
                                        <Link
                                          to={`/participants/${participantData.slug}`}
                                          className={`block font-semibold text-base sm:text-lg break-words hover:underline transition-colors duration-200 ${
                                            isWinner ? 'text-yellow-800 dark:text-yellow-200 hover:text-yellow-600 dark:hover:text-yellow-400' : 'text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400'
                                          }`}
                                        >
                                          {participantData.name}
                                          {isWinner && <span className="ml-2">👑</span>}
                                        </Link>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
                                          {participantData.region}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className={`font-semibold text-base sm:text-lg break-words ${
                                    isWinner ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {getParticipantFallbackName(participant, participantIndex)}
                                    {isWinner && <span className="ml-2">👑</span>}
                                  </p>
                                )}
                              </div>
                              {/* Only show total score if there are scores */}
                              {hasScores && (
                                <div className="text-right flex-shrink-0">
                                  <p className={`font-bold text-lg ${
                                    isWinner ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {totalScore.toFixed(1)}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Gesamtpunktzahl
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            {/* Jury Scores - only show if there are scores */}
                            {hasScores && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Jury-Bewertungen:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {scores.map((score, scoreIndex) => {
                                    const isStruck = shouldStrikeScore(score, scores, scoreIndex);
                                    
                                    return (
                                      <span
                                        key={scoreIndex}
                                        className={`px-2 py-1 rounded text-sm font-medium ${
                                          isStruck 
                                            ? 'line-through text-gray-400 dark:text-gray-500' 
                                            : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                      >
                                        {score.toFixed(1)}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participants when no groups are set */}
          {round.assignments && round.assignments.filter(a => a.roles.includes('participant')).length > 0 && (!round.groups || round.groups.length === 0) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Teilnehmer*innen</h2>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                    Dies ist noch nicht die Reihenfolge der Teilnehmer*innen
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {round.assignments
                  .filter(assignment => assignment.roles.includes('participant'))
                  .map((assignment, index) => {
                    // Handle both participants and teams
                    const participant = getParticipantById(assignment.participant_id);
                    const isTeam = assignment.team_id && assignment.team_name;
                    
                    if (isTeam) {
                      // Display team
                      const teamName = assignment.team_name || 'Unbekanntes Team';
                      const teamRegion = assignment.team_region || '';
                      const teamMembers = assignment.team_members || [];
                      const key = `team-${assignment.team_id}-${index}`;
                      
                      return (
                        <div key={key} className="h-32">
                          <Link
                            to={`/teams/${assignment.team_slug || 'unknown'}`}
                            className="block h-full p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200 group border border-blue-200 dark:border-blue-800"
                          >
                            <div className="flex flex-col h-full">
                              <div className="flex items-start space-x-3 flex-1 min-h-0">
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 break-words leading-tight" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
                                    {teamName}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight mt-1" style={{display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
                                    {teamRegion}
                                  </p>
                                </div>
                                <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                              {teamMembers.length > 0 && (
                                <div className="mt-2 flex-shrink-0">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Team Members:</p>
                                  <div className="flex flex-wrap gap-1 max-h-12 overflow-hidden">
                                    {teamMembers.map((member, memberIndex) => (
                                      <span
                                        key={memberIndex}
                                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
                                      >
                                        {member.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </Link>
                        </div>
                      );
                    } else {
                      // Display individual participant
                      const name = assignment.participant_name || 'Unbekannte*r Teilnehmer*in';
                      const key = `participant-${assignment.participant_id}-${index}`;
                      
                      return (
                        <div key={key} className="h-32">
                          {participant ? (
                            <Link
                              to={`/participants/${participant.slug}`}
                              className="block h-full p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 group"
                            >
                              <div className="flex items-center space-x-3 h-full">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 break-words leading-tight">
                                    {participant.name}
                                  </p>
                                  {participant.region && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 break-words mt-1">
                                      {getRegionFlag(participant.region)} {participant.region}
                                    </p>
                                  )}
                                </div>
                                <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </Link>
                          ) : (
                            <div className="h-full p-4 bg-gray-50 dark:bg-gray-600 rounded-lg">
                              <div className="flex items-center space-x-3 h-full">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white break-words leading-tight">
                                    {name}
                                  </p>
                                  {assignment.participant_region && (
                                    <p className="text-xs text-gray-400 dark:text-gray-400 break-words mt-1">
                                      {getRegionFlag(assignment.participant_region)} {assignment.participant_region}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                  })}
              </div>
            </div>
          )}

          {/* After Play Report */}
          {round.after_play_report && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Nachbericht</h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{round.after_play_report}</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Back Button */}
        <div className="mt-8">
          <BackButton to="/rounds">
            Zurück zu den Runden
          </BackButton>
        </div>
      </div>
    </div>
  );
};

export default RoundDetail;