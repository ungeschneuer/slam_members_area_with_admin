import React, { useState, useEffect } from 'react';
import hybridDataService from '../services/hybridDataService.js';
import LoadingSpinner from './LoadingSpinner.jsx';
import { ErrorMessage, SuccessMessage } from './ErrorBoundary.jsx';

export default function Rounds() {
  const [rounds, setRounds] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [competitionTypeFilter, setCompetitionTypeFilter] = useState('all');
  const [selectedRound, setSelectedRound] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load rounds data
  useEffect(() => {
    const loadRounds = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await hybridDataService.getData('rounds');
        setRounds(data || []);
      } catch (error) {
        console.error('Error loading rounds:', error);
        setError('Fehler beim Laden der Runden');
      } finally {
        setLoading(false);
      }
    };

    loadRounds();

    // Subscribe to data changes
    const unsubscribe = hybridDataService.subscribe((dataType) => {
      if (dataType === 'rounds') {
        console.log('Rounds: Data changed, refreshing...');
        loadRounds();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle anchor links from dashboard
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#round-')) {
        const roundId = parseInt(hash.replace('#round-', ''));
        const round = rounds.find(r => r.id === roundId);
        if (round) {
          setSelectedRound(round);
          // Scroll to the round after a short delay to ensure rendering
          setTimeout(() => {
            const element = document.getElementById(`round-${roundId}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        }
      }
    };

    // Handle initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [rounds]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [roundsData, participantsData] = await Promise.all([
                  hybridDataService.getData('rounds'),
        hybridDataService.getData('participants')
      ]);
      setRounds(roundsData || []);
      setParticipants(participantsData || []);
      
      // Auto-select first round if available
      if (roundsData && roundsData.length > 0 && !selectedRound) {
        setSelectedRound(roundsData[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const getParticipantName = (participantId) => {
    const participant = participants.find(p => p.id === participantId);
    return participant ? participant.name : `Teilnehmer ${participantId}`;
  };

  const calculateTotalScore = (scores) => {
    if (!scores || scores.length === 0) return 0;
    const sortedScores = [...scores].sort((a, b) => a - b);
    // Remove highest and lowest scores
    const trimmedScores = sortedScores.slice(1, -1);
    return trimmedScores.reduce((sum, score) => sum + score, 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'active': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'upcoming': return '⏳';
      case 'active': return '🎭';
      case 'completed': return '✅';
      default: return '📋';
    }
  };

  const selectRound = (round) => {
    setSelectedRound(round);
  };

  const isRoundSelected = (roundId) => {
    return selectedRound && selectedRound.id === roundId;
  };

  const isParticipantWinner = (round, participantId) => {
    if (!round.groups || round.groups.length === 0) return false;
    return round.groups.some(group => group.winners && group.winners.includes(participantId));
  };

  const getParticipantMatches = (round) => {
    if (!searchTerm || searchTerm.trim() === '') return [];
    
    const matches = [];
    const searchLower = searchTerm.toLowerCase();
    
    // Check tournament participants
    if (round.tournamentParticipants) {
      round.tournamentParticipants.forEach(participantId => {
        const participant = participants.find(p => p.id === participantId);
        if (participant && participant.name.toLowerCase().includes(searchLower)) {
          matches.push({ id: participantId, name: participant.name, type: 'Teilnehmer' });
        }
      });
    }
    
    // Check crew members
    if (round.crew) {
      round.crew.forEach(crewMember => {
        const participant = participants.find(p => p.id === crewMember.participantId);
        if (participant && participant.name.toLowerCase().includes(searchLower)) {
          matches.push({ id: crewMember.participantId, name: participant.name, type: crewMember.role });
        }
      });
    }
    
    // Check feature artists
    if (round.featureArtists) {
      round.featureArtists.forEach(feature => {
        const participant = participants.find(p => p.id === feature.participantId);
        if (participant && participant.name.toLowerCase().includes(searchLower)) {
          matches.push({ id: feature.participantId, name: participant.name, type: 'Feature Artist' });
        }
      });
    }
    
    return matches;
  };

  const filteredRounds = rounds.filter(round => {
    // Basic search in title and location
    const basicSearch = (round.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (round.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Search in participants
    const participantSearch = searchTerm.toLowerCase() !== '' && (
      // Search in tournament participants
      (round.tournamentParticipants && round.tournamentParticipants.some(participantId => {
        const participant = participants.find(p => p.id === participantId);
        return participant && participant.name.toLowerCase().includes(searchTerm.toLowerCase());
      })) ||
      // Search in crew members
      (round.crew && round.crew.some(crewMember => {
        const participant = participants.find(p => p.id === crewMember.participantId);
        return participant && participant.name.toLowerCase().includes(searchTerm.toLowerCase());
      })) ||
      // Search in feature artists
      (round.featureArtists && round.featureArtists.some(feature => {
        const participant = participants.find(p => p.id === feature.participantId);
        return participant && participant.name.toLowerCase().includes(searchTerm.toLowerCase());
      }))
    );
    
    const matchesSearch = basicSearch || participantSearch;
    const matchesStatus = statusFilter === 'all' || round.status === statusFilter;
    const matchesCompetitionType = competitionTypeFilter === 'all' || round.competitionType === competitionTypeFilter;
    return matchesSearch && matchesStatus && matchesCompetitionType;
  });

  if (loading) return <LoadingSpinner size="xl" text="Runden werden geladen..." />;
  if (error) return <div className="text-red-600">Fehler beim Laden der Runden: {error}</div>;

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

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar - Round Selection */}
        <div className="lg:w-1/3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Runden</h2>
            
            {/* Search and Filters */}
            <div className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Runden oder Teilnehmer suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="all">Alle Status</option>
                  <option value="upcoming">Anstehend</option>
                  <option value="active">Aktiv</option>
                  <option value="completed">Abgeschlossen</option>
                </select>
                <select
                  value={competitionTypeFilter}
                  onChange={(e) => setCompetitionTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="all">Alle Typen</option>
                  <option value="Einzelwettbewerb">Einzel</option>
                  <option value="Teamwettbewerb">Team</option>
                  <option value="U20-Wettbewerb">U20</option>
                </select>
              </div>
            </div>
            
            {/* Rounds List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredRounds.map((round) => (
                <div
                  key={round.id}
                  onClick={() => setSelectedRound(round)}
                  className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedRound?.id === round.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{round.title}</h3>
                    
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <span>📅</span>
                        <span className="truncate">
                          {round.startDateTime ? new Date(round.startDateTime).toLocaleDateString('de-DE', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            timeZone: 'Europe/Berlin'
                          }) : 'Datum nicht gesetzt'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>🕐</span>
                        <span className="truncate">
                          {round.startDateTime ? new Date(round.startDateTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }) : '--:--'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>📍</span>
                        <span className="truncate">{round.location || 'Unbekannter Ort'}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        round.status === 'upcoming' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        round.status === 'active' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {round.status === 'upcoming' ? '⏳ Anstehend' : 
                         round.status === 'active' ? '🎭 Aktiv' : '✅ Abgeschlossen'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200`}>
                        {round.competitionType || 'Einzelwettbewerb'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredRounds.length === 0 && (
              <div className="text-center py-8">
                <div className="text-2xl mb-2">🎭</div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Keine Runden gefunden</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Round Details */}
        <div className="lg:w-2/3">
          {selectedRound ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              {/* Round Header */}
              <div className="mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{selectedRound.title}</h1>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedRound.status === 'upcoming' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        selectedRound.status === 'active' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {selectedRound.status === 'upcoming' ? '⏳ Anstehend' : 
                         selectedRound.status === 'active' ? '🎭 Aktiv' : '✅ Abgeschlossen'}
                      </span>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        {selectedRound.competitionType || 'Einzelwettbewerb'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">📅</span>
                    <span className="break-words">
                      {selectedRound.startDateTime ? new Date(selectedRound.startDateTime).toLocaleDateString('de-DE', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        timeZone: 'Europe/Berlin'
                      }) : 'Datum nicht gesetzt'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">🕐</span>
                    <span className="break-words">
                      {selectedRound.startDateTime ? new Date(selectedRound.startDateTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }) : '--:--'} - {selectedRound.endDateTime ? new Date(selectedRound.endDateTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }) : '--:--'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">📍</span>
                    <span className="break-words">{selectedRound.location || 'Unbekannter Ort'}</span>
                  </div>
                  {selectedRound.address && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400">🏠</span>
                      <span className="break-words">{selectedRound.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedRound.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Beschreibung</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedRound.description}</p>
                  </div>
                </div>
              )}

              {/* Crew */}
              {selectedRound.crew && selectedRound.crew.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Crew</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedRound.crew.map((crewMember, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {crewMember.name ? crewMember.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{crewMember.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{crewMember.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feature Artists */}
              {selectedRound.featureArtists && selectedRound.featureArtists.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Feature Artists</h3>
                  <div className="space-y-3">
                    {selectedRound.featureArtists.map((feature, index) => (
                      <div key={index} className="flex items-start space-x-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                          {feature.name ? feature.name.charAt(0).toUpperCase() : 'F'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{feature.name}</p>
                          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 break-words">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Groups and Results */}
              {selectedRound.groups && selectedRound.groups.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Gruppen & Ergebnisse</h3>
                  <div className="space-y-6">
                    {selectedRound.groups.map((group, groupIndex) => (
                      <div key={groupIndex} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Gruppe {groupIndex + 1}</h4>
                        <div className="space-y-3">
                          {group.participants && group.participants.map((participant, participantIndex) => {
                            const participantData = participants.find(p => p.id === participant.participantId);
                            const scores = participant.juryScores || [];
                            const totalScore = calculateTotalScore(scores);
                            const isWinner = participant.isWinner;
                            
                            return (
                              <div key={participantIndex} className={`p-4 rounded-lg border ${
                                isWinner 
                                  ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800' 
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                              }`}>
                                <div className="flex items-center space-x-3 min-w-0 flex-1">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                                    isWinner 
                                      ? 'bg-gradient-to-br from-yellow-500 to-orange-600 text-white' 
                                      : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                                  }`}>
                                    {participant.order || participantIndex + 1}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className={`font-semibold text-base sm:text-lg truncate ${
                                      isWinner ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-900 dark:text-white'
                                    }`}>
                                      {participantData ? participantData.name : `Teilnehmer ${participant.participantId}`}
                                      {isWinner && <span className="ml-2">👑</span>}
                                    </p>
                                    {participantData && (
                                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                        {participantData.role} • {participantData.region}
                                      </p>
                                    )}
                                  </div>
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
                                </div>
                                
                                {/* Jury Scores */}
                                {scores.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                      Jury-Bewertungen:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {scores.map((score, scoreIndex) => {
                                        const isHighest = score === Math.max(...scores);
                                        const isLowest = score === Math.min(...scores);
                                        const isDuplicate = scores.filter(s => s === score).length > 1;
                                        const shouldStrike = (isHighest && isDuplicate) || (isLowest && isDuplicate);
                                        
                                        return (
                                          <span
                                            key={scoreIndex}
                                            className={`px-2 py-1 rounded text-sm font-medium ${
                                              shouldStrike 
                                                ? 'line-through text-gray-400 dark:text-gray-500' 
                                                : 'text-gray-700 dark:text-gray-300'
                                            }`}
                                          >
                                            {score.toFixed(1)}
                                          </span>
                                        );
                                      })}
                                      <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
                                        (ohne höchste/niedrigste)
                                      </span>
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

              {/* After Play Report */}
              {selectedRound.afterPlayReport && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Nachbericht</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedRound.afterPlayReport}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">🎭</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Runde auswählen</h3>
                <p className="text-gray-600 dark:text-gray-400">Wählen Sie eine Runde aus der Liste aus, um Details anzuzeigen.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
