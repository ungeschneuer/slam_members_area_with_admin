import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import BackButton from './shared/BackButton.jsx';
import { useTeamBySlug } from '../hooks/useTeams.js';
import { useRounds } from '../hooks/useRounds.js';
import { useTimetable } from '../hooks/useTimetable.js';
import { usePageTitle } from '../hooks/index.js';
import { 
  translateRoundStatus, 
  getRoundStatusIcon, 
  getRoundStatusColor 
} from '../utils/categoryTranslations.js';
import { 
  formatTime, 
  formatDate, 
  getEventTypeInfo, 
  getRoleColor, 
  getRegionFlag,
  getContentTypeIcon,
  getContentTypeGradient
} from '../utils/detailViewUtils.js';
import { isCrewRole, getCrewRoleLabel } from '../utils/crewRoleUtils.js';
import { handleLinkClick } from '../utils/linkUtils.js';
import LoadingSpinner from './LoadingSpinner.jsx';
import ErrorFallback from './ErrorFallback.jsx';

const TeamDetail = () => {
  const { slug } = useParams();
  const { data: team, isLoading: teamLoading, error: teamError } = useTeamBySlug(slug);
  
  // Set dynamic page title
  usePageTitle(team?.name || 'Laden...');
  const { data: rounds, isLoading: roundsLoading } = useRounds();
  const { data: timetableData = [], isLoading: timetableLoading } = useTimetable();

  // Get rounds where this team is assigned
  const teamRounds = React.useMemo(() => {
    if (!rounds || !team) return [];
    
    return rounds.filter(round => 
      round.assignments?.some(assignment => 
        assignment.team_id === team.id
      )
    );
  }, [rounds, team]);

  // Get timetable events where this team is assigned
  const teamTimetableEvents = useMemo(() => {
    if (!team || !timetableData) return [];
    
    return timetableData.filter(event => {
      return event.assignments?.some(a => a.team_id === team.id);
    }).map(event => {
      const teamAssignment = event.assignments?.find(a => a.team_id === team.id);
      const translatedRoles = [];
      
      // Translate roles to German labels (same logic as rounds)
      if (teamAssignment) {
        teamAssignment.roles.forEach(role => {
          switch (role) {
            case 'participant':
              translatedRoles.push('Wettbewerb-Teilnehmer*in');
              break;
            case 'feature_artist':
              const order = teamAssignment.metadata?.display_order || 0;
              const featureLabel = order > 0 ? `Feature Artist #${order}` : 'Feature Artist';
              translatedRoles.push(featureLabel);
              break;
            case 'moderator':
              translatedRoles.push('Moderator*in');
              break;
            case 'jury':
              translatedRoles.push('Jury');
              break;
            default:
              // Handle crew roles (both old and new format)
              if (isCrewRole(role)) {
                const crewLabel = role === 'crew' && teamAssignment.metadata?.role 
                  ? teamAssignment.metadata.role 
                  : getCrewRoleLabel(role);
                translatedRoles.push(`SLAM25-Team: ${crewLabel}`);
              } else {
                translatedRoles.push(role);
              }
          }
        });
      }
      
      return {
        ...event,
        roles: translatedRoles,
        metadata: teamAssignment?.metadata || {}
      };
    });
  }, [team, timetableData]);

  if (teamLoading || roundsLoading || timetableLoading) {
    return <LoadingSpinner />;
  }

  if (teamError || !team) {
    return <ErrorFallback error={teamError || new Error('Team not found')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <BackButton to="/participants" className="mb-4">
            Zurück zu Teilnehmer*innen
          </BackButton>
          
          <div className="detail-section p-8">
            <div className="flex items-start">
              <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {team.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="badge-primary">
                  👥 Team
                </span>
                {team.region && (
                  <span className="badge-region">
                    {getRegionFlag(team.region)} {team.region}
                  </span>
                )}
                {team.members && (
                  <span className="badge-region">
                    {team.members.length} Mitglieder
                  </span>
                )}
              </div>
              {team.instagram && (
                <a
                  href={`https://instagram.com/${team.instagram}`}
                  onClick={(e) => {
                    const instagramLink = {
                      url: `https://instagram.com/${team.instagram}`,
                      title: `Instagram Profil von ${team.name}`,
                      is_external: true
                    };
                    handleLinkClick(instagramLink, e);
                  }}
                  className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  @{team.instagram}
                </a>
              )}
              {team.description && (
                <p className="text-gray-600 dark:text-gray-400 mt-4">
                  {team.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

        {/* Team Members */}
        {team.members && team.members.length > 0 && (
          <div className="detail-section mb-6">
            <div className="detail-section-header">
              <h2 className="detail-section-title">
                👥 Team-Mitglieder
              </h2>
              <p className="detail-section-subtitle">
                Mitglieder von {team.name}
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {team.members.map(member => (
                  <div
                    key={member.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                  >
                    <Link
                      to={`/participants/${member.slug}`}
                      className="block hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg p-2 -m-2 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                            {member.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {member.region}
                          </p>
                          {member.instagram && (
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              @{member.instagram}
                            </p>
                          )}
                        </div>
                        {/* Small grey arrow area */}
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Rounds Section */}
        {teamRounds.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                🏆 Turnier-Runden
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Runden, an denen {team.name} teilnimmt
              </p>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {teamRounds.map((round, index) => {
                const teamAssignment = round.assignments?.find(a => a.team_id === team.id);
                const translatedRoles = [];
                
                // Translate roles to German labels (same logic as ParticipantDetail)
                if (teamAssignment) {
                  teamAssignment.roles.forEach(role => {
                    switch (role) {
                      case 'participant':
                        translatedRoles.push('Wettbewerb-Teilnehmer*in');
                        break;
                      case 'feature_artist':
                        const order = teamAssignment.metadata?.display_order || 0;
                        const featureLabel = order > 0 ? `Feature Artist #${order}` : 'Feature Artist';
                        translatedRoles.push(featureLabel);
                        break;
                      case 'moderator':
                        translatedRoles.push('Moderator*in');
                        break;
                      case 'jury':
                        translatedRoles.push('Jury');
                        break;
                      default:
                        // Handle crew roles (both old and new format)
                        if (isCrewRole(role)) {
                          const crewLabel = role === 'crew' && teamAssignment.metadata?.role 
                            ? teamAssignment.metadata.role 
                            : getCrewRoleLabel(role);
                          translatedRoles.push(`SLAM25-Team: ${crewLabel}`);
                        } else {
                          translatedRoles.push(role);
                        }
                    }
                  });
                }
                
                // Get team performance data from groups if available
                let performance = null;
                if (teamAssignment && teamAssignment.roles.includes('participant') && round.groups) {
                  for (const group of round.groups) {
                    const teamInGroup = group.teams?.find(t => t.teamId === team.id);
                    if (teamInGroup) {
                      performance = {
                        group: group.name,
                        order: teamInGroup.order,
                        scores: teamInGroup.scores || [],
                        totalScore: teamInGroup.totalScore || 0,
                        isWinner: teamInGroup.isWinner || false
                      };
                      break;
                    }
                  }
                }
                
                return (
                  <div key={`round-${round.id}-${index}`} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                            🏆 Runde
                          </span>
                          {(round.calculatedStatus || round.status) && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoundStatusColor(round.calculatedStatus || round.status, true)}`}>
                              {getRoundStatusIcon(round.calculatedStatus || round.status)} {translateRoundStatus(round.calculatedStatus || round.status)}
                            </span>
                          )}
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

                        {/* Role badges */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {translatedRoles.map((role, roleIndex) => (
                            <span
                              key={roleIndex}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                            >
                              {role}
                            </span>
                          ))}
                        </div>

                        {/* Competition type */}
                        {round.competition_type && (
                          <div className="mb-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                              🏆 {round.competition_type}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4">
                        <Link
                          to={`/rounds/${round.slug}`}
                          className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                          Details →
                        </Link>
                      </div>
                    </div>

                    {/* Team performance data */}
                    {performance && (
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                          Team-Leistung in dieser Runde
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Gruppe</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {performance.group}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Reihenfolge</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {performance.order}
                            </p>
                          </div>
                          {performance.scores && performance.scores.length > 0 && performance.scores.some(score => score > 0) && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Gesamtpunktzahl</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {performance.totalScore.toFixed(1)}
                                {performance.isWinner && (
                                  <span className="ml-2 text-yellow-600 dark:text-yellow-400">👑</span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {performance.scores && performance.scores.length > 0 && performance.scores.some(score => score > 0) && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Jury-Bewertungen</p>
                            <div className="flex flex-wrap gap-2">
                              {performance.scores.map((score, scoreIndex) => (
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
                );
              })}
            </div>
          </div>
        )}

        {/* Timetable Events Section */}
        {teamTimetableEvents.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                📅 Events & Workshops
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Events und Workshops, an denen {team.name} teilnimmt
              </p>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {teamTimetableEvents.map((event, index) => (
                <div key={`event-${event.id}-${index}`} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEventTypeInfo(event.type).color}`}>
                          {getEventTypeInfo(event.type).icon} {getEventTypeInfo(event.type).label}
                        </span>
                        {event.status && (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoundStatusColor(event.status, true)}`}>
                            {getRoundStatusIcon(event.status)} {translateRoundStatus(event.status)}
                          </span>
                        )}
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

                      {/* Role badges */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {event.roles.map((role, roleIndex) => (
                          <span
                            key={roleIndex}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                    
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

        {/* Bottom Back Button */}
        <div className="mt-8">
          <BackButton to="/participants">
            Zurück zu Teilnehmer*innen
          </BackButton>
        </div>
      </div>
    </div>
  );
};

export default TeamDetail;
