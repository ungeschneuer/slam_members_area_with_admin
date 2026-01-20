import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/apiWrapper.js';
import { PARTICIPANTS_ENDPOINTS } from '../constants/apiEndpoints.js';
import { createEntityQueryKeys } from '../utils/queryKeyFactory.js';
import { useEntityData } from './useEntityData.js';
import { getQueryConfig } from '../config/polling.js';

// Query keys for participants
export const participantsKeys = createEntityQueryKeys('participants');

// Hook to fetch all participants with pagination support
export function useParticipants(filters = {}, isAdmin = false) {
  return useEntityData(
    'participants',
    async (passedFilters = {}) => {
      // Support pagination via query params
      const effectiveLimit = Number.isFinite(passedFilters.limit) ? passedFilters.limit : undefined;
      const effectiveOffset = Number.isFinite(passedFilters.offset) ? passedFilters.offset : undefined;

      const params = new URLSearchParams();
      if (Number.isFinite(effectiveLimit)) params.set('limit', String(effectiveLimit));
      if (Number.isFinite(effectiveOffset) && effectiveOffset > 0) params.set('offset', String(effectiveOffset));

      const url = params.toString()
        ? `${PARTICIPANTS_ENDPOINTS.BASE}?${params.toString()}`
        : PARTICIPANTS_ENDPOINTS.BASE;

      const result = await apiGet(url);

      // Extract data from the response structure
      const responseData = result?.data;
      const items = Array.isArray(responseData?.data) ? responseData.data :
                    Array.isArray(result) ? result : [];
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
      // Disable polling for very large lists
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
      return await apiGet(PARTICIPANTS_ENDPOINTS.BY_ID(id));
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,  // 10 minutes
    gcTime: 20 * 60 * 1000,     // 20 minutes
  });
}

// Hook to create a participant (with optimistic updates)
export function useCreateParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (participantData) => {
      return await apiPost(PARTICIPANTS_ENDPOINTS.BASE, participantData);
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
    onError: (err, newParticipant, context) => {
      // Rollback on error
      if (context?.previousParticipants) {
        queryClient.setQueryData(participantsKeys.lists(), context.previousParticipants);
      }
    },
    onSuccess: (data) => {
      // Invalidate queries to refetch with server data
      queryClient.invalidateQueries({ queryKey: participantsKeys.all });

      // Set detail cache if available
      if (data?.id) {
        queryClient.setQueryData(participantsKeys.detail(data.id), data);
      }
    },
  });
}

// Hook to update a participant (with optimistic updates)
export function useUpdateParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...participantData }) => {
      return await apiPut(PARTICIPANTS_ENDPOINTS.BY_ID(id), participantData);
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
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousParticipants) {
        queryClient.setQueryData(participantsKeys.lists(), context.previousParticipants);
      }
      if (context?.previousParticipant) {
        queryClient.setQueryData(participantsKeys.detail(variables.id), context.previousParticipant);
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refetch with server data
      queryClient.invalidateQueries({ queryKey: participantsKeys.all });

      // Update the specific participant in cache
      if (data?.id) {
        queryClient.setQueryData(participantsKeys.detail(variables.id), data);
      }
    },
  });
}

// Hook to delete a participant (with optimistic updates)
export function useDeleteParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      return await apiDelete(PARTICIPANTS_ENDPOINTS.BY_ID(id));
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
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousParticipants) {
        queryClient.setQueryData(participantsKeys.lists(), context.previousParticipants);
      }
      if (context?.previousParticipant) {
        queryClient.setQueryData(participantsKeys.detail(id), context.previousParticipant);
      }
    },
    onSuccess: (data, id) => {
      // Invalidate queries to refetch with server data
      queryClient.invalidateQueries({ queryKey: participantsKeys.all });
    },
  });
}

// Hook to bulk import participants
export function useBulkImportParticipants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (participants) => {
      return await apiPost(PARTICIPANTS_ENDPOINTS.BULK_IMPORT, { participants });
    },
    onSuccess: () => {
      // Invalidate to refetch all participants
      queryClient.invalidateQueries({ queryKey: participantsKeys.all });
    },
  });
}
