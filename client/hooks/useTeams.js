import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/apiWrapper.js';
import { TEAMS_ENDPOINTS } from '../constants/apiEndpoints.js';
import { createEntityQueryKeys, invalidateEntityQueries } from '../utils/queryKeyFactory.js';
import { getQueryConfig } from '../config/polling.js';

// Query keys for teams
export const teamsKeys = createEntityQueryKeys('teams');

// Add custom query keys for team-specific queries
teamsKeys.bySlug = (slug) => [...teamsKeys.details(), 'slug', slug];
teamsKeys.members = (teamId) => [...teamsKeys.all, teamId, 'members'];
teamsKeys.byRound = (roundId) => [...teamsKeys.all, 'round', roundId];
teamsKeys.byParticipant = (participantId) => [...teamsKeys.all, 'participant', participantId];

// Fetch all teams
export const useTeams = (isAdmin = false) => {
  return useQuery({
    queryKey: teamsKeys.all,
    queryFn: async () => {
      return await apiGet(TEAMS_ENDPOINTS.BASE);
    },
    ...getQueryConfig('teams', isAdmin),
  });
};

// Fetch single team by slug
export const useTeamBySlug = (slug) => {
  return useQuery({
    queryKey: teamsKeys.bySlug(slug),
    queryFn: async () => {
      return await apiGet(TEAMS_ENDPOINTS.BY_SLUG(slug));
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
};

// Fetch team members
export const useTeamMembers = (teamId) => {
  return useQuery({
    queryKey: teamsKeys.members(teamId),
    queryFn: async () => {
      return await apiGet(TEAMS_ENDPOINTS.MEMBERS(teamId));
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });
};

// Fetch teams by round
export const useTeamsByRound = (roundId) => {
  return useQuery({
    queryKey: teamsKeys.byRound(roundId),
    queryFn: async () => {
      return await apiGet(TEAMS_ENDPOINTS.BY_ROUND(roundId));
    },
    enabled: !!roundId,
    staleTime: 5 * 60 * 1000,
  });
};

// Fetch participant teams
export const useParticipantTeams = (participantId) => {
  return useQuery({
    queryKey: teamsKeys.byParticipant(participantId),
    queryFn: async () => {
      return await apiGet(TEAMS_ENDPOINTS.BY_PARTICIPANT(participantId));
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
      return await apiPost(TEAMS_ENDPOINTS.BASE, teamData);
    },
    onSuccess: () => {
      invalidateEntityQueries(queryClient, 'teams');
    },
  });
};

// Update team mutation
export const useUpdateTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, teamData }) => {
      return await apiPut(TEAMS_ENDPOINTS.BY_ID(teamId), teamData);
    },
    onSuccess: (data, variables) => {
      invalidateEntityQueries(queryClient, 'teams');

      // Also invalidate specific team query
      if (variables.teamId) {
        queryClient.invalidateQueries({ queryKey: teamsKeys.detail(variables.teamId) });
      }
    },
  });
};

// Delete team mutation
export const useDeleteTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId) => {
      // apiDelete handles all error extraction automatically
      return await apiDelete(TEAMS_ENDPOINTS.BY_ID(teamId));
    },
    onSuccess: () => {
      invalidateEntityQueries(queryClient, 'teams');
    },
  });
};

// Add team member mutation
export const useAddTeamMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, participantId }) => {
      return await apiPost(TEAMS_ENDPOINTS.MEMBERS(teamId), { participant_id: participantId });
    },
    onSuccess: (data, variables) => {
      // Invalidate all team queries
      invalidateEntityQueries(queryClient, 'teams');

      // Invalidate specific queries
      queryClient.invalidateQueries({ queryKey: teamsKeys.detail(variables.teamId) });
      queryClient.invalidateQueries({ queryKey: teamsKeys.members(variables.teamId) });
      queryClient.invalidateQueries({ queryKey: teamsKeys.byParticipant(variables.participantId) });
    },
  });
};

// Remove team member mutation
export const useRemoveTeamMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, participantId }) => {
      return await apiDelete(TEAMS_ENDPOINTS.REMOVE_MEMBER(teamId, participantId));
    },
    onSuccess: (data, variables) => {
      // Invalidate all team queries
      invalidateEntityQueries(queryClient, 'teams');

      // Invalidate specific queries
      queryClient.invalidateQueries({ queryKey: teamsKeys.detail(variables.teamId) });
      queryClient.invalidateQueries({ queryKey: teamsKeys.members(variables.teamId) });
      queryClient.invalidateQueries({ queryKey: teamsKeys.byParticipant(variables.participantId) });
    },
  });
};
