import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';
import { useEntityData } from './useEntityData.js';
import { getQueryConfig } from '../config/polling.js';
import logger from '../services/logger.js';
import { useToast } from '../contexts/ToastContext.jsx';

// Query keys for timetable
export const timetableKeys = {
  all: ['timetable'],
  lists: () => [...timetableKeys.all, 'list'],
  list: (filters) => [...timetableKeys.lists(), { filters }],
  details: () => [...timetableKeys.all, 'detail'],
  detail: (id) => [...timetableKeys.details(), id],
};

// Hook to fetch all timetable events
export function useTimetable(filters = {}, isAdmin = false) {
  return useEntityData(
    'timetable',
    async () => {
      const response = await fetch(`${API_URL}/timetable`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch timetable: ${response.statusText}`);
      }
      const result = await response.json();
      // Handle nested data structure or direct array
      const data = result?.data?.data?.rows || result?.data?.rows || result?.data || result;
      return Array.isArray(data) ? data : [];
    },
    { filters, ...getQueryConfig('timetable', isAdmin), isAdmin }
  );
}

// Hook to fetch a single timetable event by slug
export function useTimetableEvent(slug) {
  return useQuery({
    queryKey: timetableKeys.detail(slug),
    queryFn: async () => {
      if (!slug) return null;
      const response = await fetch(`${API_URL}/timetable/${slug}`, {
        credentials: 'include'
      });
      // Gracefully handle not-found without throwing to avoid console 404 noise
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Failed to fetch timetable event: ${response.statusText}`);
      const result = await response.json();
      return result?.data || result || null;
    },
    enabled: !!slug,
    ...getQueryConfig('timetable', false, { refetchInterval: false }), // Detail pages don't need polling
    // Avoid repeated refetches that can spam 404s during navigation or focus
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  });
}

// Hook to create a timetable event
export function useCreateTimetableEvent() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async (eventData) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/timetable`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
          }
        );

        const result = await response.json().catch(() => {
          throw new Error('Ungültige Serverantwort');
        });

        if (!result.success && result.error) {
          throw new Error(result.error);
        }

        return result?.data || result;
      } catch (error) {
        logger.error('Create timetable event error', { error: error.message });
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidate all timetable-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      queryClient.invalidateQueries({ queryKey: timetableKeys.lists() });

      // If we have the created event data, add it to the cache
      if (data?.data) {
        queryClient.setQueryData(timetableKeys.detail(data.data.id), data.data);
      }
    },
    onError: (error) => {
      logger.error('Create timetable event mutation error', { error: error.message });
      showErrorToast('Fehler beim Erstellen des Zeitplan-Eintrags: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}

// Hook to update a timetable event
export function useUpdateTimetableEvent() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async ({ id, ...eventData }) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/timetable/${id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
          }
        );

        const result = await response.json().catch(() => {
          throw new Error('Ungültige Serverantwort');
        });

        if (!result.success && result.error) {
          throw new Error(result.error);
        }

        return result?.data || result;
      } catch (error) {
        logger.error('Update timetable event error', { error: error.message });
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate all timetable-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      queryClient.invalidateQueries({ queryKey: timetableKeys.lists() });

      // Update the specific event in cache
      if (data?.data) {
        queryClient.setQueryData(timetableKeys.detail(variables.id), data.data);
      }
    },
    onError: (error) => {
      logger.error('Update timetable event mutation error', { error: error.message });
      showErrorToast('Fehler beim Aktualisieren des Zeitplan-Eintrags: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}

// Hook to delete a timetable event
export function useDeleteTimetableEvent() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async (id) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/timetable/${id}`,
          {
            method: 'DELETE'
          }
        );

        const result = await response.json().catch(() => {
          throw new Error('Ungültige Serverantwort');
        });

        if (!result.success && result.error) {
          throw new Error(result.error);
        }

        return result?.data || result;
      } catch (error) {
        logger.error('Delete timetable event error', { error: error.message });
        throw error;
      }
    },
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: timetableKeys.detail(id) });

      // Invalidate all timetable-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      queryClient.invalidateQueries({ queryKey: timetableKeys.lists() });
    },
    onError: (error) => {
      logger.error('Delete timetable event mutation error', { error: error.message });
      showErrorToast('Fehler beim Löschen des Zeitplan-Eintrags: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}

// Hook to update participant role in timetable entry
export function useUpdateTimetableParticipantRole() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async ({ entryId, participantId, role }) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/timetable/${entryId}/participants/${participantId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role })
          }
        );

        const result = await response.json().catch(() => {
          throw new Error('Ungültige Serverantwort');
        });

        if (!result.success && result.error) {
          throw new Error(result.error);
        }

        return result?.data || result;
      } catch (error) {
        logger.error('Update timetable participant role error', { error: error.message });
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all timetable-related queries to ensure participant detail pages show current information
      queryClient.invalidateQueries({ queryKey: timetableKeys.all });
      queryClient.invalidateQueries({ queryKey: timetableKeys.lists() });
    },
    onError: (error) => {
      logger.error('Update timetable participant role mutation error', { error: error.message });
      showErrorToast('Fehler beim Aktualisieren der Teilnehmerrolle: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}

// Hook to add participant to timetable entry
export function useAddTimetableParticipant() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async ({ entryId, participantId, role }) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/timetable/${entryId}/participants`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participantId, role })
          }
        );

        const result = await response.json().catch(() => {
          throw new Error('Ungültige Serverantwort');
        });

        if (!result.success && result.error) {
          throw new Error(result.error);
        }

        return result?.data || result;
      } catch (error) {
        logger.error('Add timetable participant error', { error: error.message });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timetableKeys.all });
      queryClient.invalidateQueries({ queryKey: timetableKeys.lists() });
    },
    onError: (error) => {
      logger.error('Add timetable participant mutation error', { error: error.message });
      showErrorToast('Fehler beim Hinzufügen des Teilnehmers zum Zeitplan: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}

// Hook to remove participant from timetable entry
export function useRemoveTimetableParticipant() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async ({ entryId, participantId }) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/timetable/${entryId}/participants/${participantId}`,
          {
            method: 'DELETE'
          }
        );

        const result = await response.json().catch(() => {
          throw new Error('Ungültige Serverantwort');
        });

        if (!result.success && result.error) {
          throw new Error(result.error);
        }

        return result?.data || result;
      } catch (error) {
        logger.error('Remove timetable participant error', { error: error.message });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timetableKeys.all });
      queryClient.invalidateQueries({ queryKey: timetableKeys.lists() });
    },
    onError: (error) => {
      logger.error('Remove timetable participant mutation error', { error: error.message });
      showErrorToast('Fehler beim Entfernen des Teilnehmers vom Zeitplan: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}
