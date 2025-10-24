import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import { getQueryConfig } from '../config/polling.js';

// Fetch all teams
export const useTeams = () => {
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
    ...getQueryConfig('teams', false),
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
  
  return useMutation({
    mutationFn: async (teamData) => {
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
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
    },
  });
};

// Update team mutation
export const useUpdateTeam = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ teamId, teamData }) => {
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
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['teams']);
      queryClient.invalidateQueries(['teams', variables.teamId]);
    },
  });
};

// Delete team mutation
export const useDeleteTeam = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (teamId) => {
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
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
    },
  });
};

// Add team member mutation
export const useAddTeamMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ teamId, participantId }) => {
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
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['teams']);
      queryClient.invalidateQueries(['teams', variables.teamId]);
      queryClient.invalidateQueries(['teams', variables.teamId, 'members']);
      queryClient.invalidateQueries(['teams', 'participant', variables.participantId]);
    },
  });
};

// Remove team member mutation
export const useRemoveTeamMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ teamId, participantId }) => {
      const response = await fetch(`${API_URL}/teams/${teamId}/members/${participantId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to remove team member');
      }
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['teams']);
      queryClient.invalidateQueries(['teams', variables.teamId]);
      queryClient.invalidateQueries(['teams', variables.teamId, 'members']);
      queryClient.invalidateQueries(['teams', 'participant', variables.participantId]);
    },
  });
};
