import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';
import { useEntityData } from './useEntityData.js';
import { getQueryConfig } from '../config/polling.js';
import logger from '../services/logger.js';
import { useToast } from '../contexts/ToastContext.jsx';

// Participants hooks for data management
// STANDARDIZED: All data fetching hooks use consistent patterns:
// - Direct fetch() calls with credentials: 'include'
// - Standardized response unwrapping: result?.data || result || []
// - Consistent error handling and caching strategies

// Query keys for participants
export const participantsKeys = {
  all: ['participants'],
  lists: () => [...participantsKeys.all, 'list'],
  list: (filters) => [...participantsKeys.lists(), { filters }],
  details: () => [...participantsKeys.all, 'detail'],
  detail: (id) => [...participantsKeys.details(), id]
};

// Hook to fetch all participants
export function useParticipants(filters = {}, isAdmin = false) {
  return useEntityData(
    'participants',
    async (passedFilters = {}) => {
      // Support pagination via query params; only include when provided
      const effectiveLimit = Number.isFinite(passedFilters.limit) ? passedFilters.limit : undefined;
      const effectiveOffset = Number.isFinite(passedFilters.offset) ? passedFilters.offset : undefined;
      const params = new URLSearchParams();
      if (Number.isFinite(effectiveLimit)) params.set('limit', String(effectiveLimit));
      if (Number.isFinite(effectiveOffset) && effectiveOffset > 0) params.set('offset', String(effectiveOffset));
      const url = params.toString()
        ? `${API_URL}/participants?${params.toString()}`
        : `${API_URL}/participants`;

      const response = await fetch(url, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch participants: ${response.statusText}`);
      }
      const result = await response.json();
      
      // Handle both success and error responses, always return an array
      if (result?.success === false) {
        console.warn('Participants API returned error:', result.error);
        return { data: [], totalCount: 0, limit: effectiveLimit || 50, offset: effectiveOffset || 0 };
      }
      
      // Extract data from the response structure
      // The server now returns: { success: true, data: { data: [...], meta: {...} }, meta: {...} }
      const responseData = result?.data;
      const items = Array.isArray(responseData?.data) ? responseData.data : [];
      const meta = responseData?.meta || {};
      
      // Return pagination metadata along with data
      return {
        data: items,
        totalCount: meta.totalCount || items.length,
        limit: meta.limit || effectiveLimit || 50,
        offset: meta.offset || effectiveOffset || 0,
        currentPage: meta.currentPage || Math.floor((effectiveOffset || 0) / (effectiveLimit || 50)) + 1,
        totalPages: meta.totalPages || Math.ceil((meta.totalCount || items.length) / (effectiveLimit || 50))
      };
    },
    (() => {
      // Derive query config and turn off polling when requesting very large lists
      const cfg = { ...getQueryConfig('participants', isAdmin) };
      if (Number.isFinite(filters?.limit) && filters.limit >= 1000) {
        cfg.refetchInterval = false;
      }
      return { filters, ...cfg, isAdmin };
    })()
  );
}

// Hook to fetch a single participant
export function useParticipant(id) {
  return useQuery({
    queryKey: participantsKeys.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`${API_URL}/participants/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch participant: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || null;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,  // 10 minutes (was 5)
    gcTime: 20 * 60 * 1000,     // 20 minutes (was 10)
  });
}

// Hook to create a participant
export function useCreateParticipant() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async (participantData) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/participants`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(participantData)
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
        logger.error('Create participant error', { error: error.message });
        throw error;
      }
    },
    onMutate: async (newParticipant) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: participantsKeys.lists() });
      
      // Snapshot the previous value
      const previousParticipants = queryClient.getQueryData(participantsKeys.lists());
      
      // Optimistically update to the new value
      queryClient.setQueryData(participantsKeys.lists(), (old) => {
        const tempId = `temp-${Date.now()}`;
        return [...(old || []), { ...newParticipant, id: tempId, _isOptimistic: true }];
      });
      
      return { previousParticipants };
    },
    onError: (error, newParticipant, context) => {
      logger.error('Create participant mutation error', { error: error.message });
      showErrorToast('Fehler beim Erstellen des Teilnehmers: ' + (error.message || 'Unbekannter Fehler'));
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousParticipants) {
        queryClient.setQueryData(participantsKeys.lists(), context.previousParticipants);
      }
    },
    onSuccess: (data) => {
      // Invalidate all participants-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: participantsKeys.all });
      queryClient.invalidateQueries({ queryKey: participantsKeys.lists() });
      
      // If we have the created participant data, add it to the cache
      if (data && data.id) {
        queryClient.setQueryData(participantsKeys.detail(data.id), data);
      }
    },
  });
}

// Hook to update a participant
export function useUpdateParticipant() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async ({ id, ...participantData }) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/participants/${id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(participantData)
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
        logger.error('Update participant error', { error: error.message });
        throw error;
      }
    },
    onMutate: async ({ id, ...participantData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: participantsKeys.lists() });
      await queryClient.cancelQueries({ queryKey: participantsKeys.detail(id) });
      
      // Snapshot the previous values
      const previousParticipants = queryClient.getQueryData(participantsKeys.lists());
      const previousParticipant = queryClient.getQueryData(participantsKeys.detail(id));
      
      // Optimistically update the participant in the list
      queryClient.setQueryData(participantsKeys.lists(), (old) => {
        if (!old) return old;
        return old.map(participant => 
          participant.id === id 
            ? { ...participant, ...participantData, _isOptimistic: true }
            : participant
        );
      });
      
      // Optimistically update the specific participant
      queryClient.setQueryData(participantsKeys.detail(id), (old) => {
        if (!old) return old;
        return { ...old, ...participantData, _isOptimistic: true };
      });
      
      return { previousParticipants, previousParticipant };
    },
    onError: (error, variables, context) => {
      logger.error('Update participant mutation error', { error: error.message });
      showErrorToast('Fehler beim Aktualisieren des Teilnehmers: ' + (error.message || 'Unbekannter Fehler'));
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousParticipants) {
        queryClient.setQueryData(participantsKeys.lists(), context.previousParticipants);
      }
      if (context?.previousParticipant) {
        queryClient.setQueryData(participantsKeys.detail(variables.id), context.previousParticipant);
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate all participants-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: participantsKeys.all });
      queryClient.invalidateQueries({ queryKey: participantsKeys.lists() });
      
      // Update the specific participant in cache
      if (data && data.id) {
        queryClient.setQueryData(participantsKeys.detail(variables.id), data);
      }
    },
  });
}

// Hook to delete a participant
export function useDeleteParticipant() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async (id) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/participants/${id}`,
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
        logger.error('Delete participant error', { error: error.message });
        throw error;
      }
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: participantsKeys.lists() });
      await queryClient.cancelQueries({ queryKey: participantsKeys.detail(id) });
      
      // Snapshot the previous values
      const previousParticipants = queryClient.getQueryData(participantsKeys.lists());
      const previousParticipant = queryClient.getQueryData(participantsKeys.detail(id));
      
      // Optimistically remove the participant from the list
      queryClient.setQueryData(participantsKeys.lists(), (old) => {
        if (!old) return old;
        return old.filter(participant => participant.id !== id);
      });
      
      // Remove the specific participant from cache
      queryClient.removeQueries({ queryKey: participantsKeys.detail(id) });
      
      return { previousParticipants, previousParticipant };
    },
    onError: (error, id, context) => {
      logger.error('Delete participant mutation error', { error: error.message });
      showErrorToast('Fehler beim Löschen des Teilnehmers: ' + (error.message || 'Unbekannter Fehler'));
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousParticipants) {
        queryClient.setQueryData(participantsKeys.lists(), context.previousParticipants);
      }
      if (context?.previousParticipant) {
        queryClient.setQueryData(participantsKeys.detail(id), context.previousParticipant);
      }
    },
    onSuccess: (data, id) => {
      // Invalidate all participants-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: participantsKeys.all });
      queryClient.invalidateQueries({ queryKey: participantsKeys.lists() });
    },
  });
}

// Hook to bulk import participants
export function useBulkImportParticipants() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  return useMutation({
    networkMode: 'always', // Execute even when offline to show proper error messages
    mutationFn: async (participants) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/participants/bulk-import`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participants })
          }
        );

        if (!response.ok) {
          const error = await response.json().catch(() => {
            throw new Error('Ungültige Serverantwort');
          });
          throw new Error(error.error || 'Bulk import failed');
        }

        return await response.json().catch(() => {
          throw new Error('Ungültige Serverantwort');
        });
      } catch (error) {
        logger.error('Bulk import participants error', { error: error.message });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: participantsKeys.lists() });
    },
    onError: (error) => {
      logger.error('Bulk import participants mutation error', { error: error.message });
      showErrorToast('Fehler beim Massenimport der Teilnehmer: ' + (error.message || 'Unbekannter Fehler'));
    }
  });
}
