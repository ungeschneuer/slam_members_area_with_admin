import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import { getQueryConfig } from '../config/polling.js';
import logger from '../services/logger.js';
import { useToast } from '../contexts/ToastContext.jsx';

// Fetch all teams
export const useTeams = (isAdmin = false) => {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/teams`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      const result = await response.json();
      return result?.data || result || [];
    },
    ...getQueryConfig('teams', isAdmin),
  });
};

// Fetch single team by slug
export const useTeamBySlug = (slug) => {
  return useQuery({
    queryKey: ['teams', slug],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/teams/${slug}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch team');
      }
      const result = await response.json();
      return result?.data || result;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
};

// Fetch team members
export const useTeamMembers = (teamId) => {
  return useQuery({
    queryKey: ['teams', teamId, 'members'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/teams/${teamId}/members`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }
      const result = await response.json();
      return result?.data || result || [];
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });
};

// Fetch teams by round
export const useTeamsByRound = (roundId) => {
  return useQuery({
    queryKey: ['teams', 'round', roundId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/teams/round/${roundId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch teams for round');
      }
      const result = await response.json();
      return result?.data || result || [];
    },
    enabled: !!roundId,
    staleTime: 5 * 60 * 1000,
  });
};

// Fetch participant teams
export const useParticipantTeams = (participantId) => {
  return useQuery({
    queryKey: ['teams', 'participant', participantId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/teams/participant/${participantId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch participant teams');
      }
      const result = await response.json();
      return result?.data || result || [];
    },
    enabled: !!participantId,
    staleTime: 5 * 60 * 1000,
  });
};

// Create team mutation
export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async (teamData) => {
      try {
        const response = await fetch(`${API_URL}/teams`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(teamData),
        });

        if (!response.ok) {
          throw new Error('Failed to create team');
        }

        const result = await response.json().catch(() => {
          throw new Error('Ungültige Serverantwort');
        });

        if (!result.success && result.error) {
          throw new Error(result.error);
        }

        return result?.data || result;
      } catch (error) {
        logger.error('Create team error', { error: error.message });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
    },
    onError: (error) => {
      logger.error('Create team mutation error', { error: error.message });
      showErrorToast('Fehler beim Erstellen des Teams: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
};

// Update team mutation
export const useUpdateTeam = () => {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async ({ teamId, teamData }) => {
      try {
        const response = await fetch(`${API_URL}/teams/${teamId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(teamData),
        });

        if (!response.ok) {
          throw new Error('Failed to update team');
        }

        const result = await response.json().catch(() => {
          throw new Error('Ungültige Serverantwort');
        });

        if (!result.success && result.error) {
          throw new Error(result.error);
        }

        return result?.data || result;
      } catch (error) {
        logger.error('Update team error', { error: error.message });
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['teams']);
      queryClient.invalidateQueries(['teams', variables.teamId]);
    },
    onError: (error) => {
      logger.error('Update team mutation error', { error: error.message });
      showErrorToast('Fehler beim Aktualisieren des Teams: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
};

// Delete team mutation
export const useDeleteTeam = () => {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async (teamId) => {
      try {
        const response = await fetch(`${API_URL}/teams/${teamId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!response.ok) {
          let bodyText = '';
          try {
            bodyText = await response.text();
            const parsed = bodyText ? JSON.parse(bodyText) : {};
            const err = new Error(parsed?.error || parsed?.message || `Failed to delete team (${response.status})`);
            err.status = response.status;
            if (parsed?.details) err.details = parsed.details;
            throw err;
          } catch (e) {
            if (e instanceof SyntaxError) {
              const err = new Error(`Failed to delete team (${response.status})`);
              err.status = response.status;
              throw err;
            }
            throw e;
          }
        }

        const result = await response.json().catch(() => {
          throw new Error('Ungültige Serverantwort');
        });

        return result?.data || result;
      } catch (error) {
        logger.error('Delete team error', { error: error.message });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
    },
    onError: (error) => {
      logger.error('Delete team mutation error', { error: error.message });
      showErrorToast('Fehler beim Löschen des Teams: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
};

// Add team member mutation
export const useAddTeamMember = () => {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async ({ teamId, participantId }) => {
      try {
        const response = await fetch(`${API_URL}/teams/${teamId}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ participant_id: participantId }),
        });

        if (!response.ok) {
          throw new Error('Failed to add team member');
        }

        const result = await response.json().catch(() => {
          throw new Error('Ungültige Serverantwort');
        });

        if (!result.success && result.error) {
          throw new Error(result.error);
        }

        return result?.data || result;
      } catch (error) {
        logger.error('Add team member error', { error: error.message });
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['teams']);
      queryClient.invalidateQueries(['teams', variables.teamId]);
      queryClient.invalidateQueries(['teams', variables.teamId, 'members']);
      queryClient.invalidateQueries(['teams', 'participant', variables.participantId]);
    },
    onError: (error) => {
      logger.error('Add team member mutation error', { error: error.message });
      showErrorToast('Fehler beim Hinzufügen des Teammitglieds: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
};

// Remove team member mutation
export const useRemoveTeamMember = () => {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async ({ teamId, participantId }) => {
      try {
        const response = await fetch(`${API_URL}/teams/${teamId}/members/${participantId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to remove team member');
        }

        const result = await response.json().catch(() => {
          throw new Error('Ungültige Serverantwort');
        });

        if (!result.success && result.error) {
          throw new Error(result.error);
        }

        return result?.data || result;
      } catch (error) {
        logger.error('Remove team member error', { error: error.message });
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['teams']);
      queryClient.invalidateQueries(['teams', variables.teamId]);
      queryClient.invalidateQueries(['teams', variables.teamId, 'members']);
      queryClient.invalidateQueries(['teams', 'participant', variables.participantId]);
    },
    onError: (error) => {
      logger.error('Remove team member mutation error', { error: error.message });
      showErrorToast('Fehler beim Entfernen des Teammitglieds: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
};
