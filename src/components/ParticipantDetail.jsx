import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import hybridDataService from '../services/hybridDataService.js';

export default function ParticipantDetail() {
  const { participantId } = useParams();
  const [participants, setParticipants] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [participant, setParticipant] = useState(null);
  const [participantRounds, setParticipantRounds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load data from hybrid service
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [participantsData, roundsData] = await Promise.all([
          hybridDataService.getData('participants'),
          hybridDataService.getData('rounds')
        ]);
        setParticipants(participantsData || []);
        setRounds(roundsData || []);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to data changes
    const unsubscribeParticipants = hybridDataService.subscribe((type) => {
      if (type === 'participants') {
        hybridDataService.getData('participants').then(setParticipants);
      }
      if (type === 'rounds') {
        hybridDataService.getData('rounds').then(setRounds);
      }
    });

    return () => {
      unsubscribeParticipants();
    };
  }, []);

  useEffect(() => {
    if (participants && participantId) {
      const found = participants.find(p => p.id === parseInt(participantId));
      setParticipant(found);
    }
  }, [participants, participantId]);

  useEffect(() => {
    if (participant && rounds) {
      const roundsWithParticipant = rounds.filter(round => {
        // Check if participant is in tournament participants
        const isTournamentParticipant = round.tournamentParticipants && 
          round.tournamentParticipants.includes(participant.id);
        
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
        if (round.tournamentParticipants && round.tournamentParticipants.includes(participant.id)) {
          roles.push('Turnier-Teilnehmer');
        }
        
        if (round.crew && round.crew.some(crewMember => crewMember.participantId === participant.id)) {
          const crewMember = round.crew.find(crewMember => crewMember.participantId === participant.id);
          roles.push(`Crew (${crewMember.role})`);
        }
        
        if (round.featureArtists && round.featureArtists.some(feature => feature.participantId === participant.id)) {
          const feature = round.featureArtists.find(feature => feature.participantId === participant.id);
          roles.push(`Feature Artist (${feature.role})`);
        }

        // Get performance data if tournament participant
        let performance = null;
        if (round.tournamentParticipants && round.tournamentParticipants.includes(participant.id)) {
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

      setParticipantRounds(roundsWithParticipant);
    }
  }, [participant, rounds]);

  const getRoleColor = (role) => {
    switch (role) {
      case 'Teilnehmer': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Jury': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'Supporter': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Crew': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Lade Teilnehmerdaten...
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
              Teilnehmer nicht gefunden
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Der gesuchte Teilnehmer konnte nicht gefunden werden.
            </p>
            <Link
              to="/participants"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              ← Zurück zu Teilnehmern
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
            Zurück zu Teilnehmern
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
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(participant.role)}`}>
                  {participant.role}
                  </span>
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

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Runden Teilnahme</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {participantRounds.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Gewonnene Runden</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {participantRounds.filter(round => round.performance?.isWinner).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Durchschnittliche Punkte</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {(() => {
                    const scores = participantRounds
                      .filter(round => round.performance?.totalScore !== undefined)
                      .map(round => round.performance.totalScore);
                    return scores.length > 0 
                      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
                      : '0.0';
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rounds Participation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Runden Teilnahme
            </h2>
          </div>
          
          {participantRounds.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">📅</div>
              <p>Noch keine Runden-Teilnahme</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {participantRounds.map((round) => (
                <div key={round.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {round.title}
                        </h3>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                          🏆 {round.competitionType}
                        </span>
                        {round.status === 'completed' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            Abgeschlossen
                          </span>
                        )}
                        {round.status === 'upcoming' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            Geplant
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <div className="flex items-center space-x-4">
                                                      <span>📅 {new Date(round.startDateTime).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' })}</span>
                          <span>🕐 {new Date(round.startDateTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })}</span>
                          <span>📍 {round.location}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {round.roles.map((role, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Performance Details */}
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
                            {round.performance.scores.map((score, index) => (
                              <span
                                key={index}
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
          )}
        </div>
      </div>
    </div>
  );
}
