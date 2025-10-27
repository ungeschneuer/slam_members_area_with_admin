import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useRounds, useParticipants, usePageTitle } from '../hooks/index.js';
import LoadingSpinner from './LoadingSpinner.jsx';
import { ErrorMessage, SuccessMessage } from './StatusMessages.jsx';
import { translateRoundStatus, getRoundStatusIcon, getRoundStatusColor } from '../utils/categoryTranslations.js';
import { hasCrewRole, getCrewRolesFromAssignment } from '../utils/crewRoleUtils.js';
import { createParticipantLookupMap } from '../utils/participantLookupUtils.js';
import { getAvailableContentFilterOptions, getAvailableComplexFilterOptions, validateFilterValue } from '../utils/filterUtils.js';
import DayTabs from './shared/DayTabs.jsx';
import FilterButtons from './shared/FilterButtons.jsx';

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
  const [success, setSuccess] = useState(null);

  // Day tab logic
  const uniqueDates = useMemo(() => 
    [...new Set(rounds.map(r => r.date))].sort(),
    [rounds]
  );

  const dayTabs = useMemo(() => 
    uniqueDates.map((date, index) => ({
      id: date,
      label: `Tag ${index + 1}`,
      subtitle: new Date(date).toLocaleDateString('de-DE', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short',
        timeZone: 'Europe/Berlin'
      })
    })),
    [uniqueDates]
  );

  // Smart default day selection based on current date
  const [activeDay, setActiveDay] = useState(null);

  // Set active day once data is loaded
  useEffect(() => {
    if (uniqueDates.length > 0 && !activeDay) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Check if today is within the event dates
      const todayIndex = uniqueDates.findIndex(date => date === todayStr);
      if (todayIndex !== -1) {
        setActiveDay(uniqueDates[todayIndex]); // Current day
        return;
      }
      
      // Check if we're before the first day
      const firstDate = new Date(uniqueDates[0]);
      if (today < firstDate) {
        setActiveDay(uniqueDates[0]); // First day
        return;
      }
      
      // Check if we're after the last day
      const lastDate = new Date(uniqueDates[uniqueDates.length - 1]);
      if (today > lastDate) {
        setActiveDay(uniqueDates[uniqueDates.length - 1]); // Last day
        return;
      }
      
      // Fallback to first day
      setActiveDay(uniqueDates[0]);
    }
  }, [uniqueDates, activeDay]);

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

  const matchesDayFilter = (round, activeDay) => {
    return activeDay && round.date === activeDay;
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

  // Day filtering first, then other filters
  const dayFilteredRounds = useMemo(() => 
    activeDay ? rounds.filter(r => r.date === activeDay) : [],
    [rounds, activeDay]
  );

  // Single-pass cascading filter options and results
  const { statusOptions, competitionTypeOptions, filteredRounds } = useMemo(() => {
    try {
      // Handle empty or invalid datasets
      if (!Array.isArray(dayFilteredRounds) || dayFilteredRounds.length === 0) {
        return {
          statusOptions: predefinedStatusOptions,
          competitionTypeOptions: predefinedCompetitionTypeOptions,
          filteredRounds: []
        };
      }
    
    const afterSearch = dayFilteredRounds.filter(round => {
      if (!round || typeof round !== 'object') return false;
      return matchesSearchFilter(round, searchTerm, participantLookup);
    });
    
    const statuses = new Set();
    const competitionTypes = new Set();
    const filtered = [];
    
    afterSearch.forEach(round => {
      const passesStatus = matchesStatusFilter(round, statusFilter);
      const passesCompType = matchesCompetitionTypeFilter(round, competitionTypeFilter);
      
      // Final filtered results
      if (passesStatus && passesCompType) {
        filtered.push(round);
      }
      
      // For status options: match competition type (but NOT status filter)
      if (passesCompType) {
        statuses.add(round.calculatedStatus || round.status);
      }
      
      // For competition type options: match status (but NOT competition type filter)
      if (passesStatus && round.competition_type) {
        competitionTypes.add(round.competition_type);
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
    
      return {
        statusOptions: statusOpts,
        competitionTypeOptions: compTypeOpts,
        filteredRounds: filtered
      };
    } catch (error) {
      console.error('Error in filter calculation:', error);
      // Return safe defaults on error
      return {
        statusOptions: predefinedStatusOptions,
        competitionTypeOptions: predefinedCompetitionTypeOptions,
        filteredRounds: []
      };
    }
  }, [dayFilteredRounds, searchTerm, participantLookup, statusFilter, competitionTypeFilter]);

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


  // Use centralized status functions
  const getStatusColor = (status) => getRoundStatusColor(status);
  const getStatusIcon = (status) => getRoundStatusIcon(status);

  // Color coding for competition types
  const getCompetitionTypeColor = (type) => {
    switch (type) {
      case 'Einzelwettbewerb':
        return 'bg-[#A2D2B9]/20 text-[#185757] dark:bg-[#185757]/30 dark:text-[#A2D2B9]';
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
        return 'bg-[#185757]';
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
        return 'bg-[#A2D2B9]/40 dark:bg-[#185757]/50 border-[#185757]/40 dark:border-[#185757]/60 hover:bg-[#A2D2B9]/50 dark:hover:bg-[#185757]/60';
      case 'Teamwettbewerb':
        return 'bg-green-100/60 dark:bg-green-800/40 border-green-300 dark:border-green-600 hover:bg-green-100/70 dark:hover:bg-green-800/50';
      case 'U20-Wettbewerb':
        return 'bg-purple-100/60 dark:bg-purple-800/40 border-purple-300 dark:border-purple-600 hover:bg-purple-100/70 dark:hover:bg-purple-800/50';
      default:
        return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50';
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
      <div className="page-header-card">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Runden</h1>
          <p className="text-gray-600 dark:text-gray-300">Alle Poetry Slam Runden</p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Runden oder Teilnehmer*innen suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            aria-label="Runden oder Teilnehmer suchen"
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Status filtern
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                aria-label="Status filtern"
              >
                {statusOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.id === 'all' ? option.name : translateRoundStatus(option.id)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <FilterButtons
                options={competitionTypeOptions}
                activeFilter={competitionTypeFilter}
                onFilterChange={setCompetitionTypeFilter}
                label="Wettbewerbstyp filtern"
                ariaLabel="Wettbewerbstyp auswählen"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Day Tabs Section */}
      {dayTabs.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-6">
          <div className="flex justify-center">
            <DayTabs 
              days={dayTabs}
              activeDay={activeDay}
              onDayChange={setActiveDay}
            />
          </div>
        </div>
      )}
            
      {/* Rounds List */}
      <div className="space-y-8">
        {filteredRounds.length > 0 ? (
          <div className="flex flex-col gap-5">
              {filteredRounds.map((round) => (
                <Link to={`/rounds/${round.slug}`} key={round.id}>
                  <div className={`p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group border-l-4 ${getCompetitionTypeBackground(round.competition_type || 'Einzelwettbewerb')}`}>
                    {/* Mobile Layout - Two Rows */}
                    <div className="sm:hidden">
                      {/* Row 1: Time, Title, Location */}
                      <div className="flex items-start space-x-3 mb-3">
                        <div className="text-center flex-shrink-0">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatTime(round.start_time)} - {formatTime(round.end_time)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                            {formatDateForDisplay(round.date)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-[#185757] dark:group-hover:text-[#A2D2B9] transition-colors leading-tight mb-1">
                            {round.title}
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-gray-300 mb-2 block">
                            {round.competition_type || 'Einzelwettbewerb'}
                          </span>
                          {round.location && (
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {round.location}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center text-[#185757] dark:text-[#A2D2B9] group-hover:text-[#0f3a3b] dark:group-hover:text-[#8BC4A3] transition-colors flex-shrink-0">
                          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Row 2: Participants - Full Width */}
                      {round.assignments && round.assignments.filter(a => a.roles.includes('participant')).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {round.assignments
                            .filter(a => a.roles.includes('participant'))
                            .map((assignment, index) => {
                              const participantName = assignment.participant_name || assignment.team_name || `ID: ${assignment.participant_id || assignment.team_id}`;
                              return (
                                <span 
                                  key={assignment.participant_id || assignment.team_id}
                                  className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-xs"
                                >
                                  {participantName}
                                </span>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {/* Desktop Layout - Three Columns */}
                    <div className="hidden sm:flex sm:items-start sm:gap-4">
                      {/* Column 1: Time */}
                      <div className="text-center flex-shrink-0">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatTime(round.start_time)} - {formatTime(round.end_time)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                          {formatDateForDisplay(round.date)}
                        </div>
                      </div>

                      {/* Column 2: Colored Indicator Line */}
                      <div className={`w-1 h-12 rounded-full ${getCompetitionTypeIndicator(round.competition_type || 'Einzelwettbewerb')}`}></div>

                      {/* Column 3: Everything Else */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-[#185757] dark:group-hover:text-[#A2D2B9] transition-colors leading-tight mb-1">
                              {round.title}
                            </h3>
                            <span className="text-sm text-gray-500 dark:text-gray-300 mb-2 block">
                              {round.competition_type || 'Einzelwettbewerb'}
                            </span>
                            
                            {/* Location */}
                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                              <span className="truncate">{round.location || 'Unbekannter Ort'}</span>
                            </div>
                            
                            {/* Participants - Own Line */}
                            {round.assignments && round.assignments.filter(a => a.roles.includes('participant')).length > 0 && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mt-2">
                                <div className="flex flex-wrap gap-1">
                                  {round.assignments
                                    .filter(a => a.roles.includes('participant'))
                                    .map((assignment, index) => {
                                      // Handle both participants and teams
                                      const participantName = assignment.participant_name || assignment.team_name || `ID: ${assignment.participant_id || assignment.team_id}`;
                                      return (
                                        <span 
                                          key={assignment.participant_id || assignment.team_id}
                                          className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-xs"
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
                          <div className="flex items-center text-[#185757] dark:text-[#A2D2B9] group-hover:text-[#0f3a3b] dark:group-hover:text-[#8BC4A3] transition-colors ml-2 flex-shrink-0">
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
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-center">
            <div className="text-4xl mb-4">🎭</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {filteredRounds.length === 0 && dayFilteredRounds.length > 0 
                ? 'Keine Runden gefunden' 
                : 'Runden kommt bald :)'
              }
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {filteredRounds.length === 0 && dayFilteredRounds.length > 0 
                ? 'Versuche andere Filter oder suche nach anderen Begriffen.' 
                : 'Bald werden hier alle Poetry Slam Runden zu sehen sein!'
              }
            </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}