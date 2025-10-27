// Simplified Rounds Admin - Consolidated form component
import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ConsolidatedAdminForm, { FormField } from './ConsolidatedAdminForm.jsx';
import ConsolidatedAdminTable from './ConsolidatedAdminTable.jsx';
import GroupCreator from './GroupCreator.jsx';
import ParticipantAssigner from './ParticipantAssigner.jsx';
import JuryScoreManager from './JuryScoreManager.jsx';
import ParticipantDropdown from './ParticipantDropdown.jsx';
import { roundsService } from '../../services/roundsService.js';
import { useParticipants } from '../../hooks/index.js';
import { useTeams } from '../../hooks/index.js';
import { getRoleOptions, CREW_ROLES } from '../../utils/crewRoleUtils.js';
import { ErrorMessage, SuccessMessage } from '../StatusMessages.jsx';
import { ADMIN_PARTICIPANTS_LIMIT } from '../../config/api.js';
import { formatDateForInput } from '../../utils/dateUtils.js';

// Round Form component that handles all round management
export function RoundForm({ 
  round = null, 
  onSubmit, 
  onCancel, 
  loading = false,
  formError = null,
  groups = [],
  setGroups = () => {}
}) {
  // Fetch participants and teams for the dropdown
  const { data: participantsData = { data: [] }, isLoading: participantsLoading } = useParticipants({ limit: ADMIN_PARTICIPANTS_LIMIT }, true);
  const { data: teams = [], isLoading: teamsLoading } = useTeams();
  
  // Extract the actual participants array from the data structure
  const participants = participantsData?.data || [];

  // Date formatting is now handled by the unified dateUtils service

  const { control, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: round ? {
      ...round,
      date: formatDateForInput(round.date),
      // Ensure fields are never null to prevent React warnings
      after_play_report: round.after_play_report || '',
      photos_cloud_url: round.photos_cloud_url || ''
    } : {
      title: '',
      date: '',
      start_time: '',
      end_time: '',
      location: '',
      address: '',
      description: '',
      after_play_report: '',
      photos_cloud_url: '',
      competition_type: 'Einzelwettbewerb',
      total_jury_members: 5,
      assignments: []
    }
  });

  const [assignments, setAssignments] = useState(round?.assignments || []);
  
  // Consolidated input state
  const [inputState, setInputState] = useState({
    participant: '',
    moderator: '',
    featureArtistParticipant: '',
    featureArtistTeam: '',
    crewMember: '',
    crewRole: ''
  });

  // Error and success state for user feedback
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Helper to update input state
  const updateInput = (field, value) => {
    setInputState(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = (data) => {
    onSubmit({
      ...data,
      assignments,
      groups
    });
  };

  // Filtering helper functions
  const getParticipantAssignments = () => 
    assignments.filter(a => a.roles.includes('participant'));

  const getModeratorAssignments = () => 
    assignments.filter(a => a.roles.includes('moderator'));

  const getFeatureArtistAssignments = () => 
    assignments.filter(a => a.roles.includes('feature_artist'));

  const getCrewAssignments = () => 
    assignments.filter(a => a.roles.some(r => r.startsWith('crew_')));

  // Helper: Check if role already exists for entity
  const isDuplicateRole = (role, entityId, isTeam) => {
    return assignments.some(assignment => {
      const matchesEntity = isTeam 
        ? assignment.team_id === entityId
        : assignment.participant_id === entityId;
      return matchesEntity && assignment.roles.includes(role);
    });
  };

  // Helper: Find existing assignment for entity
  const findAssignmentForEntity = (entityId, isTeam) => {
    return assignments.find(assignment => 
      isTeam 
        ? assignment.team_id === entityId
        : assignment.participant_id === entityId
    );
  };

  // Helper: Add role to existing assignment
  const addRoleToAssignment = (existingAssignment, newRole) => {
    const updatedAssignments = assignments.map(assignment => 
      assignment === existingAssignment
        ? { ...assignment, roles: [...assignment.roles, newRole] }
        : assignment
    );
    setAssignments(updatedAssignments);
  };

  // Helper: Create new assignment
  const createNewAssignment = (role, entityId, isTeam) => {
    setAssignments([...assignments, {
      participant_id: isTeam ? null : entityId,
      team_id: isTeam ? entityId : null,
      roles: [role],
      metadata: {}
    }]);
  };

  // Main function: Simplified assignment logic
  const addAssignmentWithRole = (role, entityId, isTeam = false, clearInputs = () => {}) => {
    if (!entityId || !role) return;
    
    const entityIdInt = parseInt(entityId);
    const isCrewRole = role.startsWith('crew_');
    
    // Check for duplicate role
    if (isDuplicateRole(role, entityIdInt, isTeam)) {
      const roleLabel = isCrewRole ? (CREW_ROLES[role] || role) : role;
      setError(`${isTeam ? 'Team' : 'Teilnehmer*in'} hat bereits die Rolle "${roleLabel}".`);
      setSuccess(null);
      return;
    }
    
    // For crew roles, merge into existing assignment if possible
    if (isCrewRole) {
      const existing = findAssignmentForEntity(entityIdInt, isTeam);
      if (existing) {
        addRoleToAssignment(existing, role);
        clearInputs();
        return;
      }
    }
    
    // Create new assignment
    createNewAssignment(role, entityIdInt, isTeam);
    clearInputs();
  };

  const removeAssignment = (index) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  // Remove specific role from assignment
  const removeRoleFromAssignment = (assignmentIndex, roleToRemove) => {
    const assignment = assignments[assignmentIndex];
    if (!assignment) return;

    const updatedRoles = assignment.roles.filter(role => role !== roleToRemove);
    
    if (updatedRoles.length === 0) {
      // If no roles left, remove the entire assignment
      removeAssignment(assignmentIndex);
    } else {
      // Update the assignment with remaining roles
      const updatedAssignments = assignments.map((a, i) => 
        i === assignmentIndex 
          ? { ...a, roles: updatedRoles }
          : a
      );
      setAssignments(updatedAssignments);
    }
  };

  const roleOptions = useMemo(() => getRoleOptions(), []);

  // Memoize crew assignments with their global indices for performance
  const crewAssignmentsWithIndices = useMemo(() => 
    getCrewAssignments().map(assignment => ({
      ...assignment,
      globalIndex: assignments.findIndex(a => a === assignment)
    })), [assignments]
  );

  // Get current competition type from form
  const currentCompetitionType = watch('competition_type');

  // Get participant name for display
  const getParticipantName = (participantId) => {
    const participant = participants.find(p => p.id === parseInt(participantId));
    return participant ? participant.name : `Unbekannte*r Teilnehmer*in (ID: ${participantId})`;
  };

  // Get assignment name for display (handles both participants and teams)
  const getAssignmentName = (assignment) => {
    if (assignment.team_id) {
      const team = teams.find(t => t.id === parseInt(assignment.team_id));
      return `🏆 ${team?.name || `Team ${assignment.team_id}`}`;
    }
    return getParticipantName(assignment.participant_id);
  };

  return (
    <div className="space-y-4">
      {/* Status Messages */}
      {error && (
        <ErrorMessage 
          error={error} 
          onRetry={() => setError(null)}
          className="mb-4"
        />
      )}
      {success && (
        <SuccessMessage 
          message={success} 
          onDismiss={() => setSuccess(null)}
          className="mb-4"
        />
      )}
      
      <ConsolidatedAdminForm
        title={round ? 'Runde bearbeiten' : 'Runde erstellen'}
        subtitle={round ? 'Runden-Informationen aktualisieren' : 'Neue Wettbewerbsrunde hinzufügen'}
        onSubmit={handleSubmit(handleFormSubmit)}
        onCancel={onCancel}
        loading={loading}
        error={formError}
        validationErrors={errors}
      >
      {/* Basic Round Information */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <FormField
          name="title"
          control={control}
          label="Runden-Titel"
          placeholder="Runden-Titel eingeben"
          required
          validation={{ required: 'Titel ist erforderlich' }}
        />
        
        <FormField
          name="date"
          control={control}
          label="Datum"
          type="date"
          required
          validation={{ required: 'Datum ist erforderlich' }}
        />
        
        <FormField
          name="start_time"
          control={control}
          label="Startzeit"
          type="time"
          required
          validation={{ required: 'Startzeit ist erforderlich' }}
        />
        
        <FormField
          name="end_time"
          control={control}
          label="Endzeit"
          type="time"
          required
          validation={{ required: 'Endzeit ist erforderlich' }}
        />
        
        <FormField
          name="location"
          control={control}
          label="Ort"
          placeholder="Veranstaltungsort eingeben"
          required
          validation={{ required: 'Ort ist erforderlich' }}
        />
        
        <FormField
          name="address"
          control={control}
          label="Adresse"
          placeholder="Vollständige Adresse eingeben"
        />
      </div>

      <FormField
        name="description"
        control={control}
        label="Beschreibung"
        type="textarea"
        placeholder="Runden-Beschreibung eingeben"
      />

      <FormField
        name="after_play_report"
        control={control}
        label="Nachbericht"
        type="textarea"
        placeholder="Nachbericht der Runde eingeben"
      />

      <FormField
        name="photos_cloud_url"
        control={control}
        label="Foto-Galerie Link"
        type="url"
        placeholder="https://photos.example.com/slam25-round-1"
      />

      {/* Competition Settings */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Wettbewerbseinstellungen
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField
            name="competition_type"
            control={control}
            label="Wettbewerbstyp"
            type="select"
            options={[
              { value: 'Einzelwettbewerb', label: 'Einzelwettbewerb' },
              { value: 'Teamwettbewerb', label: 'Teamwettbewerb' },
              { value: 'U20-Wettbewerb', label: 'U20-Wettbewerb' }
            ]}
          />
          <FormField
            name="total_jury_members"
            control={control}
            label="Anzahl Jury-Mitglieder"
            type="number"
            validation={{ min: 1, max: 20 }}
          />
        </div>
      </div>

      {/* Teilnehmer*innen Section */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Teilnehmer*innen
        </h4>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Teilnehmer*in hinzufügen</h5>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <ParticipantDropdown
                items={currentCompetitionType === 'Teamwettbewerb' ? teams : participants}
                value={inputState.participant}
                onChange={(value) => updateInput('participant', value)}
                placeholder={currentCompetitionType === 'Teamwettbewerb' 
                  ? "Team wählen..." 
                  : "Teilnehmer*in wählen..."}
                searchPlaceholder="Suchen..."
                label={currentCompetitionType === 'Teamwettbewerb' 
                  ? 'Team auswählen' 
                  : 'Teilnehmer*in auswählen'}
                disabled={participantsLoading || teamsLoading}
                loading={participantsLoading || teamsLoading}
                formatLabel={(item) => {
                  // Teams don't have a region field, so handle them differently
                  if (currentCompetitionType === 'Teamwettbewerb') {
                    return item.name; // Just show team name for teams
                  }
                  return `${item.name} (${item.region})`; // Show name and region for participants
                }}
                filterFn={(item) => {
                  // Allow all participants/teams to be selected
                  // The system supports multiple participants per round
                  return true;
                }}
                searchThreshold={8}
              />
            </div>
            
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  if (inputState.participant) {
                    addAssignmentWithRole(
                      'participant', 
                      inputState.participant, 
                      currentCompetitionType === 'Teamwettbewerb', 
                      () => updateInput('participant', '')
                    );
                  }
                }}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95"
                disabled={!inputState.participant}
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>

        {/* Participants List */}
        {getParticipantAssignments().length > 0 && (
          <ConsolidatedAdminTable
            columns={[
              { 
                key: 'participant_name', 
                label: 'Teilnehmer*in/Team', 
                render: (_, row) => getAssignmentName(row)
              },
              { key: 'actions', label: 'Aktionen', render: (_, row, index) => {
                const globalIndex = assignments.findIndex(a => a === row);
                return (
                  <button
                    onClick={() => removeAssignment(globalIndex)}
                    className="min-h-[44px] px-3 py-2 text-red-600 hover:text-red-800 text-sm touch-manipulation active:scale-95 rounded"
                  >
                    Entfernen
                  </button>
                );
              }}
            ]}
            data={getParticipantAssignments()}
            showHeader={true}
          />
        )}
      </div>

      {/* Moderation Section */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Moderation
        </h4>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Moderator*in hinzufügen</h5>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <ParticipantDropdown
                items={participants}
                value={inputState.moderator}
                onChange={(value) => updateInput('moderator', value)}
                placeholder="Teilnehmer*in wählen..."
                searchPlaceholder="Suchen..."
                label="Teilnehmer*in auswählen"
                disabled={participantsLoading}
                loading={participantsLoading}
                filterFn={(item) => {
                  // Allow all participants to be selected
                  // Multiple moderators can be assigned to a round
                  return true;
                }}
                searchThreshold={8}
              />
            </div>
            
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  if (inputState.moderator) {
                    addAssignmentWithRole(
                      'moderator', 
                      inputState.moderator, 
                      false, 
                      () => updateInput('moderator', '')
                    );
                  }
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!inputState.moderator}
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>

        {/* Moderators List */}
        {getModeratorAssignments().length > 0 && (
          <ConsolidatedAdminTable
            columns={[
              { 
                key: 'participant_name', 
                label: 'Moderator*in', 
                render: (_, row) => getAssignmentName(row)
              },
              { key: 'actions', label: 'Aktionen', render: (_, row, index) => {
                const globalIndex = assignments.findIndex(a => a === row);
                return (
                  <button
                    onClick={() => removeAssignment(globalIndex)}
                    className="min-h-[44px] px-3 py-2 text-red-600 hover:text-red-800 text-sm touch-manipulation active:scale-95 rounded"
                  >
                    Entfernen
                  </button>
                );
              }}
            ]}
            data={getModeratorAssignments()}
            showHeader={true}
          />
        )}
      </div>

      {/* Feature-Künstler*innen Section */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Feature-Künstler*innen
        </h4>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Feature-Künstler*in hinzufügen</h5>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <ParticipantDropdown
                items={participants}
                value={inputState.featureArtistParticipant}
                onChange={(value) => {
                  updateInput('featureArtistParticipant', value);
                  updateInput('featureArtistTeam', ''); // Clear team when participant selected
                }}
                placeholder="Teilnehmer*in wählen..."
                searchPlaceholder="Suchen..."
                label="Teilnehmer*in auswählen"
                disabled={participantsLoading}
                loading={participantsLoading}
                filterFn={(item) => {
                  // Allow all participants to be selected
                  // Multiple feature artists can be assigned to a round
                  return true;
                }}
                searchThreshold={8}
              />
            </div>
            
            <div>
              <ParticipantDropdown
                items={teams}
                value={inputState.featureArtistTeam}
                onChange={(value) => {
                  updateInput('featureArtistTeam', value);
                  updateInput('featureArtistParticipant', ''); // Clear participant when team selected
                }}
                placeholder="Team wählen..."
                searchPlaceholder="Suchen..."
                label="Oder Team auswählen"
                disabled={teamsLoading}
                loading={teamsLoading}
                filterFn={(item) => {
                  // Allow all teams to be selected
                  // Multiple feature artist teams can be assigned to a round
                  return true;
                }}
                searchThreshold={8}
              />
            </div>
            
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  const entityId = inputState.featureArtistParticipant || inputState.featureArtistTeam;
                  const isTeam = !!inputState.featureArtistTeam;
                  
                  if (entityId) {
                    addAssignmentWithRole('feature_artist', entityId, isTeam, () => {
                      updateInput('featureArtistParticipant', '');
                      updateInput('featureArtistTeam', '');
                    });
                  }
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!inputState.featureArtistParticipant && !inputState.featureArtistTeam}
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>

        {/* Feature Artists List */}
        {getFeatureArtistAssignments().length > 0 && (
          <ConsolidatedAdminTable
            columns={[
              { 
                key: 'participant_name', 
                label: 'Feature-Künstler*in', 
                render: (_, row) => getAssignmentName(row)
              },
              { key: 'actions', label: 'Aktionen', render: (_, row, index) => {
                const globalIndex = assignments.findIndex(a => a === row);
                return (
                  <button
                    onClick={() => removeAssignment(globalIndex)}
                    className="min-h-[44px] px-3 py-2 text-red-600 hover:text-red-800 text-sm touch-manipulation active:scale-95 rounded"
                  >
                    Entfernen
                  </button>
                );
              }}
            ]}
            data={getFeatureArtistAssignments()}
            showHeader={true}
          />
        )}
      </div>

      {/* Crew Section */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Crew
        </h4>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Crew-Mitglied hinzufügen</h5>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <ParticipantDropdown
                items={participants}
                value={inputState.crewMember}
                onChange={(value) => updateInput('crewMember', value)}
                placeholder="Teilnehmer*in wählen..."
                searchPlaceholder="Suchen..."
                label="Teilnehmer*in auswählen"
                disabled={participantsLoading}
                loading={participantsLoading}
                filterFn={(item) => {
                  // Don't filter out participants - allow multiple crew roles per person
                  return true;
                }}
                searchThreshold={8}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Crew-Rolle auswählen
              </label>
              <select
                value={inputState.crewRole}
                onChange={(e) => updateInput('crewRole', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
              >
                <option value="">Crew-Rolle wählen...</option>
                {Object.entries(CREW_ROLES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  if (inputState.crewMember && inputState.crewRole) {
                    addAssignmentWithRole(inputState.crewRole, inputState.crewMember, false, () => {
                      updateInput('crewMember', '');
                      updateInput('crewRole', '');
                    });
                  }
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!inputState.crewMember || !inputState.crewRole}
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>

        {/* Crew List */}
        {crewAssignmentsWithIndices.length > 0 && (
          <div className="space-y-4">
            {crewAssignmentsWithIndices.map(({ globalIndex, ...assignment }) => {
              const crewRoles = assignment.roles.filter(role => role.startsWith('crew_'));
              
              return (
                <div key={globalIndex} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h6 className="font-medium text-gray-900 dark:text-white">
                      {getAssignmentName(assignment)}
                    </h6>
                    <button
                      onClick={() => removeAssignment(globalIndex)}
                      className="min-h-[44px] px-3 py-2 text-red-600 hover:text-red-800 text-sm touch-manipulation active:scale-95 rounded"
                    >
                      Alle Rollen entfernen
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {crewRoles.map((role, roleIndex) => {
                      const roleOption = roleOptions.find(r => r.value === role);
                      const roleLabel = roleOption ? roleOption.label : role;
                      
                      return (
                        <div key={`${globalIndex}-${roleIndex}`} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded px-3 py-2">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {roleLabel}
                          </span>
                          <button
                            onClick={() => removeRoleFromAssignment(globalIndex, role)}
                            className="min-h-[44px] px-2 py-1 text-red-600 hover:text-red-800 text-xs touch-manipulation active:scale-95 rounded"
                          >
                            Entfernen
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Groups Management */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Gruppen & Jury-Bewertung
        </h4>
        
        {/* Step 1: Create/Edit Groups */}
        <div className="mb-6">
          <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Schritt 1: Gruppen erstellen</h5>
          <GroupCreator groups={groups} setGroups={setGroups} />
        </div>
        
        {/* Step 2: Assign Participants */}
        {groups.length > 0 && (
          <div className="mb-6">
            <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Schritt 2: Teilnehmer zu Gruppen zuweisen</h5>
            <ParticipantAssigner 
              groups={groups} 
              setGroups={setGroups}
              participants={participants}
              teams={teams}
              availableParticipants={assignments
                .filter(a => a.roles.includes('participant'))
                .map(a => ({
                  ...a,
                  id: a.participant_id || a.team_id,  // ADD THIS LINE - ParticipantDropdown expects 'id'
                  entity_name: a.team_id 
                    ? `🏆 ${teams.find(t => t.id === a.team_id)?.name || `Team ${a.team_id}`}`
                    : (participants.find(p => p.id === a.participant_id)?.name || `Teilnehmer ${a.participant_id}`)
                }))}
            />
          </div>
        )}
        
        {/* Step 3: Enter Jury Scores */}
        {groups.some(g => g.participants?.length > 0) && (
          <div className="mb-6">
            <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Schritt 3: Jury-Punkte eingeben</h5>
            <JuryScoreManager 
              groups={groups} 
              setGroups={setGroups}
              totalJuryMembers={watch('total_jury_members')}
              participants={participants}
              teams={teams}
            />
          </div>
        )}
      </div>
    </ConsolidatedAdminForm>
    </div>
  );
}




// Rounds List component
export function RoundsList({ 
  rounds = [], 
  loading = false, 
  onEdit, 
  onDelete, 
  onCreate 
}) {
  const formatGermanDate = (value) => {
    if (!value) return '-';
    if (typeof value === 'string') {
      const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        const [, y, mo, d] = m;
        return `${d}.${mo}.${y}`;
      }
    }
    try {
      const d = new Date(value);
      if (!isNaN(d)) return d.toLocaleDateString('de-DE');
    } catch {}
    return String(value);
  };

  const columns = [
    { key: 'title', label: 'Titel', sortable: true },
    { key: 'date', label: 'Datum', sortable: true, render: (val) => formatGermanDate(val) },
    { 
      key: 'actions', 
      label: 'Aktionen', 
      render: (_, round) => (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onEdit && onEdit(round)}
            className="min-h-[44px] px-3 py-2 text-blue-600 hover:text-blue-800 text-sm touch-manipulation active:scale-95 rounded"
          >
            Bearbeiten
          </button>
          <button
            onClick={() => onDelete && onDelete(round)}
            className="min-h-[44px] px-3 py-2 text-red-600 hover:text-red-800 text-sm touch-manipulation active:scale-95 rounded"
          >
            Löschen
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Wettbewerbsrunden
        </h2>
        <button
          onClick={onCreate}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation active:scale-95"
        >
          Runde erstellen
        </button>
      </div>

      <ConsolidatedAdminTable
        columns={columns}
        data={rounds}
        loading={loading}
        emptyMessage="Keine Runden gefunden. Erstellen Sie Ihre erste Runde, um zu beginnen."
      />
    </div>
  );
}

// Main simplified rounds admin component
export default function SimplifiedRoundsAdmin() {
  const [showForm, setShowForm] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch rounds
  const { data: rounds = [], isLoading: roundsLoading } = useQuery({
    queryKey: ['rounds'],
    queryFn: async () => {
      const response = await roundsService.getRounds();
      return response.data || [];
    },
    staleTime: 30 * 1000, // 30 seconds for admin components
    gcTime: 10 * 60 * 1000,
  });

  // Create round mutation
  const createRoundMutation = useMutation({
    mutationFn: roundsService.createRound,
    onMutate: () => {
      setIsSubmitting(true);
    },
    onSuccess: () => {
      // Invalidate all rounds-related queries
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
      queryClient.invalidateQueries({ queryKey: ['rounds', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['rounds', 'detail'] });
      setShowForm(false);
      setEditingRound(null);
      setSuccess('Runde erfolgreich erstellt');
      setError(null);
      setIsSubmitting(false);
    },
    onError: (error) => {
      setError(`Fehler beim Erstellen der Runde: ${error.message || 'Unbekannter Fehler'}`);
      setSuccess(null);
      setIsSubmitting(false);
    }
  });

  // Update round mutation
  const updateRoundMutation = useMutation({
    mutationFn: ({ id, data }) => roundsService.updateRound(id, data),
    onMutate: () => {
      setIsSubmitting(true);
    },
    onSuccess: () => {
      // Invalidate all rounds-related queries
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
      queryClient.invalidateQueries({ queryKey: ['rounds', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['rounds', 'detail'] });
      setShowForm(false);
      setEditingRound(null);
      setSuccess('Runde erfolgreich aktualisiert');
      setError(null);
      setIsSubmitting(false);
    },
    onError: (error) => {
      setError(`Fehler beim Aktualisieren der Runde: ${error.message || 'Unbekannter Fehler'}`);
      setSuccess(null);
      setIsSubmitting(false);
    }
  });

  // Delete round mutation
  const deleteRoundMutation = useMutation({
    mutationFn: roundsService.deleteRound,
    onSuccess: () => {
      // Invalidate all rounds-related queries
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
      queryClient.invalidateQueries({ queryKey: ['rounds', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['rounds', 'detail'] });
      setSuccess('Runde erfolgreich gelöscht');
      setError(null);
    },
    onError: (error) => {
      setError(`Fehler beim Löschen der Runde: ${error.message || 'Unbekannter Fehler'}`);
      setSuccess(null);
    }
  });

  // Auto-dismiss success messages after 3 seconds
  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleCreate = () => {
    setEditingRound(null);
    setGroups([]);
    setError(null);
    setSuccess(null);
    setShowForm(true);
  };

  const handleEdit = (round) => {
    setEditingRound(round);
    setGroups(round.groups || []);
    setError(null);
    setSuccess(null);
    setShowForm(true);
  };

  const handleDelete = async (round) => {
    if (confirm('Sind Sie sicher, dass Sie diese Runde löschen möchten?')) {
      deleteRoundMutation.mutate(round.id);
    }
  };

  const handleFormSubmit = async (data) => {
    if (isSubmitting) {
      return;
    }
    
    try {
      const formData = {
        ...data,
        groups: groups || [],
        assignments: data.assignments || []
      };
      
      if (editingRound) {
        updateRoundMutation.mutate({ id: editingRound.id, data: formData });
      } else {
        createRoundMutation.mutate(formData);
      }
    } catch (error) {
      // Error already handled by mutation error handlers
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingRound(null);
  };

  const loading = createRoundMutation.isPending || updateRoundMutation.isPending || deleteRoundMutation.isPending || isSubmitting;

  if (showForm) {
    return (
      <RoundForm
        round={editingRound}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
        loading={loading}
        groups={groups}
        setGroups={setGroups}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Messages */}
      {error && (
        <ErrorMessage 
          error={error} 
          onRetry={() => setError(null)}
          className="mb-4"
        />
      )}
      {success && (
        <SuccessMessage 
          message={success} 
          onDismiss={() => setSuccess(null)}
          className="mb-4"
        />
      )}
      
      <RoundsList
        rounds={rounds}
        loading={roundsLoading || loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
      />
    </div>
  );
}
