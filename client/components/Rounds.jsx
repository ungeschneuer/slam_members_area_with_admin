import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useRounds, useParticipants, usePageTitle } from '../hooks/index.js';
import LoadingSpinner from './LoadingSpinner.jsx';
import { ErrorMessage, SuccessMessage } from './StatusMessages.jsx';
import { translateRoundStatus, getRoundStatusIcon, getRoundStatusColor } from '../utils/categoryTranslations.js';
import { hasCrewRole, getCrewRolesFromAssignment } from '../utils/crewRoleUtils.js';
import { createParticipantLookupMap } from '../utils/participantLookupUtils.js';
import { getAvailableContentFilterOptions, getAvailableComplexFilterOptions, validateFilterValue } from '../utils/filterUtils.js';

export default function Rounds() {
  usePageTitle('Runden');
  const { data: rounds = [], isLoading: roundsLoading, error: roundsError } = useRounds();
  const { data: participantsResponse = [], isLoading: participantsLoading, error: participantsError } = useParticipants();
  const participants = participantsResponse?.data || participantsResponse || [];
  const loading = roundsLoading || participantsLoading;
  const error = roundsError || participantsError;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [competitionTypeFilter, setCompetitionTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [success, setSuccess] = useState(null);

  // Optimized lookup maps for O(1) participant access
  const participantLookup = useMemo(() => 
    createParticipantLookupMap(participants), 
    [participants]
  );

  // Extract matching logic to reusable functions
  const matchesSearchFilter = (round, search, participantLookup) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    
    const basicSearch = (round.title || '').toLowerCase().includes(searchLower) ||
                       (round.location || '').toLowerCase().includes(searchLower);
    
    // Optimize participant search - only search if basic search fails
    if (basicSearch) return true;
    
    // Early return if no assignments to avoid expensive search
    if (!round.assignments || round.assignments.length === 0) return false;
    
    const participantSearch = round.assignments.some(assignment => {
      const participant = participantLookup[assignment.participant_id];
      return participant && participant.name.toLowerCase().includes(searchLower);
    });
    
    return participantSearch;
  };

  const matchesStatusFilter = (round, statusFilter) => {
    return statusFilter === 'all' || (round.calculatedStatus || round.status) === statusFilter;
  };

  const matchesCompetitionTypeFilter = (round, competitionTypeFilter) => {
    return competitionTypeFilter === 'all' || round.competition_type === competitionTypeFilter;
  };

  const matchesDateFilter = (round, dateFilter) => {
    return dateFilter === 'all' || round.date === dateFilter;
  };

  // Predefined filter options
  const predefinedStatusOptions = [
    { id: 'all', name: 'Alle Status' },
    { id: 'upcoming', name: 'Anstehend' },
    { id: 'active', name: 'Aktiv' },
    { id: 'completed', name: 'Abgeschlossen' }
  ];

  const predefinedCompetitionTypeOptions = [
    { id: 'all', name: 'Alle Typen' },
    { id: 'Einzelwettbewerb', name: 'Einzel' },
    { id: 'Teamwettbewerb', name: 'Team' },
    { id: 'U20-Wettbewerb', name: 'U20' }
  ];

  // Single-pass cascading filter options and results
  const { statusOptions, competitionTypeOptions, dateOptions, filteredRounds } = useMemo(() => {
    try {
      // Handle empty or invalid datasets
      if (!Array.isArray(rounds) || rounds.length === 0) {
        return {
          statusOptions: predefinedStatusOptions,
          competitionTypeOptions: predefinedCompetitionTypeOptions,
          dateOptions: [{ id: 'all', name: 'Alle Daten' }],
          filteredRounds: []
        };
      }
    
    const afterSearch = rounds.filter(round => {
      if (!round || typeof round !== 'object') return false;
      return matchesSearchFilter(round, searchTerm, participantLookup);
    });
    
    const statuses = new Set();
    const competitionTypes = new Set();
    const dates = new Set();
    const filtered = [];
    
    afterSearch.forEach(round => {
      const passesStatus = matchesStatusFilter(round, statusFilter);
      const passesCompType = matchesCompetitionTypeFilter(round, competitionTypeFilter);
      const passesDate = matchesDateFilter(round, dateFilter);
      
      // Final filtered results
      if (passesStatus && passesCompType && passesDate) {
        filtered.push(round);
      }
      
      // For status options: match competition type + date (but NOT status filter)
      if (passesCompType && passesDate) {
        statuses.add(round.calculatedStatus || round.status);
      }
      
      // For competition type options: match status + date (but NOT competition type filter)
      if (passesStatus && passesDate && round.competition_type) {
        competitionTypes.add(round.competition_type);
      }
      
      // For date options: match status + competition type (but NOT date filter)
      if (passesStatus && passesCompType && round.date) {
        dates.add(round.date);
      }
    });
    
    // Build options arrays
    const statusOpts = [
      predefinedStatusOptions[0], // "Alle Status"
      ...Array.from(statuses).map(status => 
        predefinedStatusOptions.find(opt => opt.id === status) || { id: status, name: status }
      )
    ].filter(Boolean);
    
    const compTypeOpts = [
      predefinedCompetitionTypeOptions[0], // "Alle Typen"
      ...Array.from(competitionTypes).map(type => 
        predefinedCompetitionTypeOptions.find(opt => opt.id === type) || { id: type, name: type }
      )
    ].filter(Boolean);
    
    const dateOpts = [
      { id: 'all', name: 'Alle Daten' },
      ...Array.from(dates).sort((a, b) => new Date(a) - new Date(b)).map(date => ({
        id: date,
        name: new Date(date).toLocaleDateString('de-DE', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short',
          timeZone: 'Europe/Berlin'
        })
      }))
    ];
    
      return {
        statusOptions: statusOpts,
        competitionTypeOptions: compTypeOpts,
        dateOptions: dateOpts,
        filteredRounds: filtered
      };
    } catch (error) {
      console.error('Error in filter calculation:', error);
      // Return safe defaults on error
      return {
        statusOptions: predefinedStatusOptions,
        competitionTypeOptions: predefinedCompetitionTypeOptions,
        dateOptions: [{ id: 'all', name: 'Alle Daten' }],
        filteredRounds: []
      };
    }
  }, [rounds, searchTerm, participantLookup, statusFilter, competitionTypeFilter, dateFilter]);

  // Auto-reset invalid filters (with loop prevention)
  const resetInProgress = useRef(false);
  
  useEffect(() => {
    if (resetInProgress.current) return;
    if (!statusOptions.some(opt => opt.id === statusFilter)) {
      resetInProgress.current = true;
      setStatusFilter('all');
      setTimeout(() => { resetInProgress.current = false; }, 0);
    }
  }, [statusOptions, statusFilter]);

  useEffect(() => {
    if (resetInProgress.current) return;
    if (!competitionTypeOptions.some(opt => opt.id === competitionTypeFilter)) {
      resetInProgress.current = true;
      setCompetitionTypeFilter('all');
      setTimeout(() => { resetInProgress.current = false; }, 0);
    }
  }, [competitionTypeOptions, competitionTypeFilter]);

  useEffect(() => {
    if (resetInProgress.current) return;
    if (!dateOptions.some(opt => opt.id === dateFilter)) {
      resetInProgress.current = true;
      setDateFilter('all');
      setTimeout(() => { resetInProgress.current = false; }, 0);
    }
  }, [dateOptions, dateFilter]);

  // Use centralized status functions
  const getStatusColor = (status) => getRoundStatusColor(status);
  const getStatusIcon = (status) => getRoundStatusIcon(status);

  // Color coding for competition types
  const getCompetitionTypeColor = (type) => {
    switch (type) {
      case 'Einzelwettbewerb':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Teamwettbewerb':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'U20-Wettbewerb':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Color indicator for timeline
  const getCompetitionTypeIndicator = (type) => {
    switch (type) {
      case 'Einzelwettbewerb':
        return 'bg-blue-500';
      case 'Teamwettbewerb':
        return 'bg-green-500';
      case 'U20-Wettbewerb':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Background color coding for cards
  const getCompetitionTypeBackground = (type) => {
    switch (type) {
      case 'Einzelwettbewerb':
        return 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/20';
      case 'Teamwettbewerb':
        return 'bg-green-50/30 dark:bg-green-900/10 border-green-200 dark:border-green-800 hover:bg-green-50/50 dark:hover:bg-green-900/20';
      case 'U20-Wettbewerb':
        return 'bg-purple-50/30 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800 hover:bg-purple-50/50 dark:hover:bg-purple-900/20';
      default:
        return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50';
    }
  };

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  

  // Sort rounds by date and time
  const sortedRounds = [...filteredRounds].sort((a, b) => {
    const dateA = new Date(a.date || '1970-01-01');
    const dateB = new Date(b.date || '1970-01-01');
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }
    // If same date, sort by start time
    return (a.start_time || '00:00').localeCompare(b.start_time || '00:00');
  });

  // Group rounds by date
  const roundsByDate = sortedRounds.reduce((groups, round) => {
    const date = round.date || 'unknown';
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(round);
    return groups;
  }, {});

  // Helper functions
  const formatTime = (time) => {
    if (!time) return '--:--';
    // Remove seconds from time display, show only HH:MM
    if (time.includes(':')) {
      const parts = time.split(':');
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`;
      }
    }
    return time;
  };

  const formatDateForDisplay = (date) => {
    if (!date) return 'Datum unbekannt';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Ungültiges Datum';
      return dateObj.toLocaleDateString('de-DE', { 
        weekday: 'short',
        day: '2-digit', 
        month: '2-digit',
        timeZone: 'Europe/Berlin'
      });
    } catch (error) {
      return 'Ungültiges Datum';
    }
  };

  // CONDITIONAL RETURNS AFTER ALL HOOKS
  if (loading) return <LoadingSpinner size="xl" text="Runden werden geladen..." />;
  if (error) return <div className="text-red-600">Fehler beim Laden der Runden: {error?.message || error}</div>;

  return (
    <div data-testid="rounds-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Runden</h1>
          <p className="text-gray-600 dark:text-gray-400">Alle Poetry Slam Runden</p>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Runden oder Teilnehmer*innen suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          aria-label="Runden oder Teilnehmer suchen"
              />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          aria-label="Status filtern"
                >
                  {statusOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.id === 'all' ? option.name : translateRoundStatus(option.id)}
                    </option>
                  ))}
                </select>
                <select
                  value={competitionTypeFilter}
                  onChange={(e) => setCompetitionTypeFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          aria-label="Wettbewerbstyp filtern"
                >
                  {competitionTypeOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          aria-label="Datum filtern"
        >
          {dateOptions.map(option => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        </div>
      </div>
            
      {/* Timetable View */}
      <div className="space-y-8">
        {Object.entries(roundsByDate).map(([date, rounds]) => (
          <div key={date} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Date Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {date === 'unknown' ? 'Datum unbekannt' : formatDateForDisplay(date)}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {rounds.length} Runde{rounds.length !== 1 ? 'n' : ''}
              </p>
            </div>
            
            {/* Rounds List */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {rounds.map((round) => (
                <Link to={`/rounds/${round.slug}`} key={round.id}>
                  <div className={`p-4 sm:p-6 transition-all duration-200 group rounded-xl shadow-sm hover:shadow-md border-l-4 ${getCompetitionTypeBackground(round.competition_type || 'Einzelwettbewerb')}`}>
                    {/* Single Row Layout - Three Columns */}
                    <div className="flex items-start gap-4">
                      
                      {/* Column 1: Time */}
                      <div className="text-center flex-shrink-0">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatTime(round.start_time)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatTime(round.end_time)}
                        </div>
                      </div>

                      {/* Column 2: Colored Indicator Line */}
                      <div className={`w-1 h-12 rounded-full ${getCompetitionTypeIndicator(round.competition_type || 'Einzelwettbewerb')}`}></div>

                      {/* Column 3: Everything Else */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight mb-1">
                              {round.title}
                            </h3>
                            <span className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">
                              {round.competition_type || 'Einzelwettbewerb'}
                            </span>
                            
                            {/* Location */}
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                              <span className="truncate">{round.location || 'Unbekannter Ort'}</span>
                            </div>
                            
                            {/* Participants - Own Line */}
                            {round.assignments && round.assignments.filter(a => a.roles.includes('participant')).length > 0 && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-2">
                                <div className="flex flex-wrap gap-1">
                                  {round.assignments
                                    .filter(a => a.roles.includes('participant'))
                                    .map((assignment, index) => {
                                      // Handle both participants and teams
                                      const participantName = assignment.participant_name || assignment.team_name || `ID: ${assignment.participant_id || assignment.team_id}`;
                                      return (
                                        <span 
                                          key={assignment.participant_id || assignment.team_id}
                                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs"
                                        >
                                          {participantName}
                                        </span>
                                      );
                                    })}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Navigation Arrow */}
                          <div className="flex items-center text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors ml-2 flex-shrink-0">
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
                                          ))}
                                        </div>
                                      </div>
        ))}
                            </div>

      {/* Empty state */}
      {Object.keys(roundsByDate).length === 0 && (
        <div className="text-center py-12">
                <div className="text-4xl mb-4">🎭</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Keine Runden gefunden</h3>
          <p className="text-gray-600 dark:text-gray-400">Versuchen Sie andere Suchbegriffe oder Filter.</p>
        </div>
      )}
    </div>
  );
}