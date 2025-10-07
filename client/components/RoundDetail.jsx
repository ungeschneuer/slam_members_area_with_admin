import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useRounds, useParticipants, useRoundBySlug } from '../hooks/index.js';
import { getParticipantId } from '../utils/participantUtils.js';
import LoadingSpinner from './LoadingSpinner.jsx';
import { ErrorMessage, SuccessMessage } from './StatusMessages.jsx';

const RoundDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: round, isLoading: roundLoading, error: roundError } = useRoundBySlug(slug);
  const { data: participantsData, isLoading: participantsLoading, error: participantsError } = useParticipants();
  const [participants, setParticipants] = useState([]);
  const loading = roundLoading || participantsLoading;
  const error = roundError || participantsError;

  // Round data is now provided directly by useRoundBySlug hook

  useEffect(() => {
    if (participantsData) {
      setParticipants(Array.isArray(participantsData) ? participantsData : []);
    }
  }, [participantsData]);

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

  const getStatusColor = (status) => {
    const colors = {
      'upcoming': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      'active': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      'completed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'upcoming': 'Anstehend',
      'active': 'Aktiv',
      'completed': 'Abgeschlossen',
      'cancelled': 'Abgesagt'
    };
    return labels[status] || status;
  };

  const getCompetitionTypeLabel = (type) => {
    const labels = {
      'Einzelwettbewerb': 'Einzelwettbewerb',
      'Teamwettbewerb': 'Teamwettbewerb',
      'Freestyle': 'Freestyle'
    };
    return labels[type] || type;
  };

  const getParticipantById = (participantId) => {
    const id = getParticipantId(participantId);
    return participants.find(p => p.id === id);
  };

  const getParticipantName = (participantId) => {
    const participant = getParticipantById(participantId);
    return participant ? participant.name : 'Unbekannte*r Teilnehmer*in';
  };

  const calculateTotalScore = (scores) => {
    if (!scores || scores.length === 0) return 0;
    const sortedScores = [...scores].sort((a, b) => a - b);
    // Remove highest and lowest scores
    const trimmedScores = sortedScores.slice(1, -1);
    // Calculate average of remaining scores
    const sum = trimmedScores.reduce((acc, score) => acc + score, 0);
    return sum / trimmedScores.length;
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
            className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
          <Link 
            to="/rounds" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück zu den Runden
          </Link>
          
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {round.title}
              </h1>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(round.status)}`}>
                  {getStatusLabel(round.status)}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {getCompetitionTypeLabel(round.competitionType)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Date & Time */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
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
                  <div className="text-gray-600 dark:text-gray-400">{formatTime(round.startTime)} - {formatTime(round.endTime)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
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

          {/* Competition Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Wettbewerbsdetails</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Typ</div>
                <div className="text-gray-900 dark:text-white">{getCompetitionTypeLabel(round.competitionType)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Jury-Mitglieder</div>
                <div className="text-gray-900 dark:text-white">{round.totalJuryMembers}</div>
              </div>
              {round.tournamentParticipants && round.tournamentParticipants.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Teilnehmer*innen</div>
                  <div className="text-gray-900 dark:text-white">{round.tournamentParticipants.length}</div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {round.description && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Beschreibung</h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{round.description}</p>
              </div>
            </div>
          )}

          {/* Crew */}
          {round.crew && Array.isArray(round.crew) && round.crew.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Crew</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {round.crew.map((member, index) => {
                  // Handle both old string format and new object format
                  const isObject = typeof member === 'object' && member !== null;
                  const participantId = isObject ? getParticipantId(member) : null;
                  const role = isObject ? member.role : null;
                  const name = isObject ? getParticipantName(participantId) : member;
                  const participant = participantId ? getParticipantById(participantId) : null;
                  
                  return (
                    <div key={index}>
                      {participantId && participant ? (
                        <Link
                          to={`/participants/${participant.id}`}
                          className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 group"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white text-lg font-bold group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                              {participant.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 break-words leading-tight">
                                {participant.name}
                              </p>
                              {role && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight mt-1">
                                  {role}
                                </p>
                              )}
                            </div>
                            <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </Link>
                      ) : (
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white break-words leading-tight">
                                {name}
                              </p>
                              {role && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight mt-1">
                                  {role}
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
          {round.featureArtists && Array.isArray(round.featureArtists) && round.featureArtists.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Feature Artists</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {round.featureArtists.map((artist, index) => {
                  // Handle both old string format and new object format
                  const isObject = typeof artist === 'object' && artist !== null;
                  const participantId = isObject ? getParticipantId(artist) : null;
                  const role = isObject ? artist.role : null;
                  const name = isObject ? getParticipantName(participantId) : artist;
                  const participant = participantId ? getParticipantById(participantId) : null;
                  
                  return (
                    <div key={index}>
                      {participantId && participant ? (
                        <Link
                          to={`/participants/${participant.id}`}
                          className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 group"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-lg font-bold group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                              {participant.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white break-words group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200 leading-tight">
                                {participant.name}
                              </p>
                              {role && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight mt-1">
                                  {role}
                                </p>
                              )}
                            </div>
                            <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </Link>
                      ) : (
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white break-words leading-tight">
                                {name}
                              </p>
                              {role && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight mt-1">
                                  {role}
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

          {/* Groups and Results */}
          {round.groups && round.groups.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Gruppen & Ergebnisse</h2>
              <div className="space-y-6">
                {round.groups.map((group, groupIndex) => (
                  <div key={groupIndex} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Gruppe {groupIndex + 1}</h3>
                    <div className="space-y-3">
                      {group.participants && group.participants.map((participant, participantIndex) => {
                        const participantData = participants.find(p => p.id === getParticipantId(participant));
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
                                {participantData ? (
                                  <Link
                                    to={`/participants/${getParticipantId(participant)}`}
                                    className={`block font-semibold text-base sm:text-lg break-words hover:underline transition-colors duration-200 ${
                                      isWinner ? 'text-yellow-800 dark:text-yellow-200 hover:text-yellow-600 dark:hover:text-yellow-400' : 'text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400'
                                    }`}
                                  >
                                    {participantData.name}
                                    {isWinner && <span className="ml-2">👑</span>}
                                  </Link>
                                ) : (
                                  <p className={`font-semibold text-base sm:text-lg break-words ${
                                    isWinner ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    Teilnehmer*innen {getParticipantId(participant)}
                                    {isWinner && <span className="ml-2">👑</span>}
                                  </p>
                                )}
                                {participantData && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
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
          {round.tournamentParticipants && round.tournamentParticipants.length > 0 && (!round.groups || round.groups.length === 0) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
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
                {round.tournamentParticipants.map((participant, index) => {
                  const id = getParticipantId(participant);
                  const name = participant.name || 'Unbekannte*r Teilnehmer*in';
                  const key = `participant-${id || index}`;
                  
                  return (
                    <div key={key}>
                      {participant ? (
                        <Link
                          to={`/participants/${id}`}
                          className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 group"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                              {participant.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 break-words leading-tight">
                                {participant.name}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 break-words leading-tight mt-1">
                                {participant.role} • {participant.region}
                              </p>
                            </div>
                            <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </Link>
                      ) : (
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white break-words leading-tight">
                                {name}
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

          {/* After Play Report */}
          {round.afterPlayReport && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Nachbericht</h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{round.afterPlayReport}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoundDetail;