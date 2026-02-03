import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeams, useDeleteTeam } from '../../hooks/index.js';
import LoadingSpinner from '../LoadingSpinner.jsx';
import { ErrorMessage, SuccessMessage } from '../StatusMessages.jsx';
import ConsolidatedAdminTable from './ConsolidatedAdminTable.jsx';
import { formatInstagramUrl } from '../../utils/instagramUtils.js';
import { handleLinkClick } from '../../utils/linkUtils.js';

const TeamsAdmin = () => {
  const navigate = useNavigate();
  const { data: teams, isLoading: teamsLoading, error: teamsError } = useTeams(true);
  const deleteTeamMutation = useDeleteTeam();

  const [searchTerm, setSearchTerm] = useState('');
  const [success, setSuccess] = useState(null);
  const [formError, setFormError] = useState('');

  const loading = teamsLoading;
  const error = teamsError;

  // Filter and sort teams based on search term
  const filteredTeams = useMemo(() => {
    if (!teams) return [];

    const filtered = teams.filter(team => {
      const matchesSearch = !searchTerm ||
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.members?.some(member =>
          member.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

      return matchesSearch;
    });

    // Sort by first character of name alphabetically
    return filtered.sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [teams, searchTerm]);

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Bist du sicher, dass du dieses Team löschen möchtest?')) return;

    try {
      await deleteTeamMutation.mutateAsync(teamId);
      setSuccess('Team erfolgreich gelöscht!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setFormError(error?.message || 'Failed to delete team');
      setTimeout(() => setFormError(''), 3000);
    }
  };

  if (loading) {
    return <LoadingSpinner size="xl" text="Teams werden geladen..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        error={error}
        onRetry={() => window.location.reload()}
        className="max-w-4xl mx-auto"
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Success/Error Messages */}
      {formError && (
        <ErrorMessage
          error={formError}
          onRetry={() => setFormError('')}
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
      <div className="card-base p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
          <div>
            <h2 className="heading-primary mb-2">Teams verwalten</h2>
            <p className="text-gray-600 dark:text-gray-400">Erstelle und verwalte Teams</p>
          </div>
          <button
            onClick={() => navigate('/admin/teams/new')}
            className="w-full sm:w-auto min-h-[44px] btn-primary touch-manipulation active:scale-95"
          >
            Team hinzufügen
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Teams suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Teams Table */}
        <ConsolidatedAdminTable
          columns={[
            {
              key: 'name',
              label: 'Team Name',
              render: (value) => (
                <div className="text-sm font-medium text-gray-900 dark:text-white">{value}</div>
              )
            },
            {
              key: 'members',
              label: 'Mitglieder',
              render: (members) => (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {members && members.length > 0 ? (
                    <span>{members.length} Mitglied{members.length !== 1 ? 'er' : ''}</span>
                  ) : (
                    <span className="text-gray-400">Keine Mitglieder</span>
                  )}
                </div>
              )
            },
            {
              key: 'members',
              label: 'Mitglieder Namen',
              render: (members) => (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {members && members.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {members.map((member, index) => (
                        <span key={member.id}>
                          {member.name}
                          {index < members.length - 1 && ','}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              )
            },
            {
              key: 'instagram',
              label: 'Instagram',
              render: (value) => (
                value ? (
                  <a
                    href={formatInstagramUrl(value)}
                    onClick={(e) => {
                      const instagramLink = {
                        url: formatInstagramUrl(value),
                        title: `Instagram Profil von ${value}`,
                        is_external: true
                      };
                      handleLinkClick(instagramLink, e);
                    }}
                    className="text-pink-600 hover:text-pink-700 transition-colors"
                  >
                    Instagram
                  </a>
                ) : (
                  <span className="text-gray-400">-</span>
                )
              )
            }
          ]}
          data={filteredTeams}
          actions={(team) => (
            <>
              <button
                onClick={() => navigate(`/admin/teams/${team.id}/edit`)}
                className="min-h-[44px] min-w-[44px] px-4 py-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors touch-manipulation active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              >
                Bearbeiten
              </button>
              <button
                onClick={() => handleDeleteTeam(team.id)}
                className="min-h-[44px] min-w-[44px] px-4 py-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors touch-manipulation active:scale-95 focus-visible:ring-2 focus-visible:ring-red-500 rounded"
              >
                Löschen
              </button>
            </>
          )}
        />

        {filteredTeams.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Keine Teams gefunden
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Versuche andere Suchkriterien oder füge ein neues Team hinzu.' : 'Erstelle dein erstes Team.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamsAdmin;
