import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTeams, useParticipants, useCreateTeam, useUpdateTeam, useDeleteTeam, useAddTeamMember, useRemoveTeamMember } from '../../hooks/index.js';
import LoadingSpinner from '../LoadingSpinner.jsx';
import ErrorFallback from '../ErrorFallback.jsx';
import { ErrorMessage, SuccessMessage } from '../StatusMessages.jsx';
import { formatInstagramUrl, normalizeInstagramInput, extractInstagramUsername } from '../../utils/instagramUtils.js';
import ParticipantMultiSelect from './ParticipantMultiSelect.jsx';
import { ADMIN_PARTICIPANTS_LIMIT } from '../../config/api.js';

const TeamsAdmin = () => {
  const { data: teams, isLoading: teamsLoading, error: teamsError } = useTeams();
  const { data: participants, isLoading: participantsLoading } = useParticipants({ limit: ADMIN_PARTICIPANTS_LIMIT }, true);
  const createTeamMutation = useCreateTeam();
  const updateTeamMutation = useUpdateTeam();
  const deleteTeamMutation = useDeleteTeam();
  const addTeamMemberMutation = useAddTeamMember();
  const removeTeamMemberMutation = useRemoveTeamMember();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingTeam, setEditingTeam] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [formError, setFormError] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [pendingMemberIds, setPendingMemberIds] = useState([]);
  const [success, setSuccess] = useState(null);

  // Form controllers
  const { 
    register: registerCreate, 
    handleSubmit: handleCreateSubmit, 
    reset: resetCreate, 
    formState: { errors: createErrors } 
  } = useForm({
    defaultValues: {
      name: '',
      instagram: ''
    }
  });

  const { 
    register: registerEdit, 
    handleSubmit: handleEditSubmit, 
    reset: resetEdit, 
    formState: { errors: editErrors } 
  } = useForm({
    defaultValues: {
      name: '',
      instagram: ''
    }
  });

  const loading = teamsLoading || participantsLoading;
  const error = teamsError;

  // Populate edit form when editingTeam changes
  useEffect(() => {
    if (editingTeam) {
      resetEdit({
        name: editingTeam.name,
        instagram: editingTeam.instagram || ''
      });
    }
  }, [editingTeam, resetEdit]);

  // Filter teams based on search term
  const filteredTeams = useMemo(() => {
    if (!teams) return [];

    return teams.filter(team => {
      const matchesSearch = !searchTerm || 
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.members?.some(member => 
          member.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

      return matchesSearch;
    });
  }, [teams, searchTerm]);


  // Get eligible participants (all roles can be team members)
  const eligibleParticipants = useMemo(() => {
    if (!participants) return [];
    // Handle new pagination structure: participants.data contains the array
    const participantsArray = participants.data || participants;
    if (!Array.isArray(participantsArray)) return [];
    // Allow all roles: Teilnehmer*in, SLAM-MC, Crew, Supporter*in
    return participantsArray;
  }, [participants]);

  const handleCreateTeam = async (teamData) => {
    try {
      const payload = {
        ...teamData,
        instagram: teamData.instagram ? (() => {
          try {
            const normalized = normalizeInstagramInput(teamData.instagram);
            return extractInstagramUsername(normalized) || teamData.instagram.replace(/^@/, '');
          } catch (error) {
            console.warn('Instagram normalization failed:', error);
            return teamData.instagram.replace(/^@/, '');
          }
        })() : ''
      };

      const result = await createTeamMutation.mutateAsync(payload);
      
      // Add selected members to the team with proper error handling
      if (selectedMembers.length > 0 && result?.id) {
        const memberErrors = [];
        
        for (const participantId of selectedMembers) {
          try {
            await addTeamMemberMutation.mutateAsync({ 
              teamId: result.id, 
              participantId 
            });
          } catch (error) {
            memberErrors.push(`Failed to add member ${participantId}: ${error.message}`);
          }
        }
        
        if (memberErrors.length > 0) {
          setFormError(`Team created but some members couldn't be added: ${memberErrors.join(', ')}`);
          return; // Don't close form if there were member errors
        }
      }
      
      setShowCreateForm(false);
      setSelectedMembers([]);
      setFormError(''); // Clear any previous errors
      setSuccess('Team erfolgreich erstellt!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setFormError(error?.message || 'Failed to create team');
      throw error; // Re-throw to prevent form submission
    }
  };

  const handleUpdateTeam = async (teamId, teamData) => {
    const payload = {
      ...teamData,
      instagram: teamData.instagram ? (() => {
        try {
          const normalized = normalizeInstagramInput(teamData.instagram);
          return extractInstagramUsername(normalized) || teamData.instagram.replace(/^@/, '');
        } catch (error) {
          console.warn('Instagram normalization failed:', error);
          return teamData.instagram.replace(/^@/, '');
        }
      })() : ''
    };
    
    await updateTeamMutation.mutateAsync({ teamId, teamData: payload });
    setEditingTeam(null);
    setSuccess('Team erfolgreich aktualisiert!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDeleteTeam = async (teamId) => {
    if (window.confirm('Sind Sie sicher, dass Sie dieses Team löschen möchten?')) {
      try {
        await deleteTeamMutation.mutateAsync(teamId);
        setSuccess('Team erfolgreich gelöscht!');
        setTimeout(() => setSuccess(null), 3000);
      } catch (error) {
        console.error('Failed to delete team:', error);
        // Show detailed conflict info when available
        if (error?.status === 409 && error?.details?.activeRounds?.length) {
          const rounds = error.details.activeRounds
            .map(r => `${r.title} (${r.status})`)
            .join(', ');
          setFormError(`Team kann nicht gelöscht werden, da es noch aktiven/geplanten Runden zugeordnet ist: ${rounds}`);
        } else {
          setFormError(error?.message || 'Failed to delete team');
        }
      }
    }
  };

  const handleAddMember = async (teamId, participantId) => {
    try {
      await addTeamMemberMutation.mutateAsync({ teamId, participantId });
    } catch (error) {
      console.error('Failed to add team member:', error);
    }
  };

  const handleRemoveMember = async (teamId, participantId) => {
    try {
      await removeTeamMemberMutation.mutateAsync({ teamId, participantId });
    } catch (error) {
      console.error('Failed to remove team member:', error);
      // Show user-friendly error message
      alert(`Failed to remove team member: ${error.message || 'Unknown error'}`);
    }
  };


  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorFallback error={error} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Error and Success Messages */}
      {formError && (
        <ErrorMessage 
          error={formError} 
          onRetry={() => setFormError(null)} 
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

      {/* Main Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Teams verwalten</h2>
            <p className="text-gray-600 dark:text-gray-400">Fügen Sie neue Teams hinzu oder bearbeiten Sie bestehende</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {showCreateForm ? 'Abbrechen' : 'Team hinzufügen'}
            </button>
          </div>
        </div>

        {/* Add Team Form */}
        {showCreateForm && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Neues Team hinzufügen</h3>
            <form onSubmit={handleCreateSubmit(async (data) => {
              try {
                setFormError('');
                await handleCreateTeam(data);
                resetCreate();
                setShowCreateForm(false);
              } catch (err) {
                console.error('Create team failed:', err);
                setFormError(err?.message || 'Erstellen fehlgeschlagen');
              }
            })} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <input
                  type="text"
                  placeholder="Team Name"
                  {...registerCreate('name', { required: 'Name ist erforderlich' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                {createErrors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{createErrors.name.message}</p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4">
                <input
                  type="text"
                  placeholder="Instagram-Benutzername (optional, z. B. @team_name oder team_name)"
                  {...registerCreate('instagram')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              {/* Member Selection */}
              <ParticipantMultiSelect
                items={eligibleParticipants}
                selectedIds={selectedMembers}
                onChange={setSelectedMembers}
                label="Team Mitglieder"
                searchPlaceholder="Nach Namen oder Region suchen..."
                maxSelections={10}
                showRegion={true}
              />
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={createTeamMutation.isPending}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-70"
                >
                  {createTeamMutation.isPending ? 'Hinzufügen...' : 'Hinzufügen'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetCreate();
                    setFormError('');
                    setSelectedMembers([]);
                  }}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search Controls */}
        <div className="mb-6 space-y-4 md:space-y-0 md:flex md:space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Teams suchen..."
              value={searchTerm || ''}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Teams Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Members</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Instagram</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aktionen</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTeams.map((team) => (
                <tr key={team.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{team.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {team.members?.length || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {team.instagram ? (
                      <a
                        href={formatInstagramUrl(team.instagram)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-600 hover:text-pink-700 transition-colors"
                      >
                        Instagram
                      </a>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingTeam(team)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      >
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTeam(team);
                          setShowMemberManagement(true);
                        }}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                      >
                        Members
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      >
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTeams.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Keine Teams gefunden
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Versuchen Sie andere Suchkriterien oder fügen Sie ein neues Team hinzu.
            </p>
          </div>
        )}
      </div>

      {/* Edit Team Modal */}
      {editingTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Team bearbeiten</h3>
            <form onSubmit={handleEditSubmit(async (data) => {
              try {
                setFormError('');
                await handleUpdateTeam(editingTeam.id, data);
                setEditingTeam(null);
              } catch (err) {
                console.error('Update team failed:', err);
                setFormError(err?.message || 'Aktualisierung fehlgeschlagen');
              }
            })} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Team Name"
                  {...registerEdit('name', { required: 'Name ist erforderlich' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                {editErrors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{editErrors.name.message}</p>
                )}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Instagram-Benutzername (z.B. team_name oder @team_name)"
                  {...registerEdit('instagram')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={updateTeamMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70"
                >
                  {updateTeamMutation.isPending ? 'Speichern...' : 'Speichern'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Management Modal */}
      {showMemberManagement && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Manage Team Members: {selectedTeam.name}
            </h2>
            
            {/* Current Members */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Current Members ({teams?.find(t => t.id === selectedTeam.id)?.members?.length || 0})
              </h3>
              <div className="space-y-2">
                {teams?.find(t => t.id === selectedTeam.id)?.members?.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{member.region}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(selectedTeam.id, member.id)}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Members */}
            <div className="mb-6">
              <ParticipantMultiSelect
                items={eligibleParticipants.filter(p => 
                  !teams?.find(t => t.id === selectedTeam.id)?.members?.some(m => m.id === p.id)
                )}
                selectedIds={pendingMemberIds}
                onChange={setPendingMemberIds}
                label="Add Members"
                searchPlaceholder="Suchen..."
                maxSelections={20}
                disabled={addTeamMemberMutation.isPending}
              />
              
              {pendingMemberIds.length > 0 && (
                <button
                  onClick={async () => {
                    try {
                      // Add members sequentially (could batch in future)
                      for (const participantId of pendingMemberIds) {
                        await addTeamMemberMutation.mutateAsync({
                          teamId: selectedTeam.id,
                          participantId
                        });
                      }
                      setPendingMemberIds([]);
                    } catch (error) {
                      alert(`Failed to add members: ${error.message}`);
                    }
                  }}
                  disabled={addTeamMemberMutation.isPending}
                  className="mt-3 w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addTeamMemberMutation.isPending 
                    ? 'Adding...' 
                    : `Add ${pendingMemberIds.length} Member${pendingMemberIds.length !== 1 ? 's' : ''}`
                  }
                </button>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowMemberManagement(false);
                  setSelectedTeam(null);
                  setPendingMemberIds([]);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsAdmin;
