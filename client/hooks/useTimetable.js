import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/apiWrapper.js';
import { TIMETABLE_ENDPOINTS } from '../constants/apiEndpoints.js';
import {
  createEntityQueryKeys,
  createOnSuccessHandler,
  updateOnSuccessHandler,
  deleteOnSuccessHandler,
  invalidateEntityQueries
} from '../utils/queryKeyFactory.js';
import { useEntityData } from './useEntityData.js';
import { getQueryConfig } from '../config/polling.js';

// Query keys for timetable
export const timetableKeys = createEntityQueryKeys('timetable');

// Hook to fetch all timetable events
export function useTimetable(filters = {}, isAdmin = false) {
  return useEntityData(
    'timetable',
    async () => {
      return await apiGet(TIMETABLE_ENDPOINTS.BASE);
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
      try {
        return await apiGet(TIMETABLE_ENDPOINTS.BY_SLUG(slug));
      } catch (error) {
        // Gracefully handle not-found without throwing
        if (error.status === 404) return null;
        throw error;
      }
    },
    enabled: !!slug,
    ...getQueryConfig('timetable', false, { refetchInterval: false }),
    // Avoid repeated refetches that can spam 404s
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  });
}

// Hook to create a timetable event
export function useCreateTimetableEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData) => {
      return await apiPost(TIMETABLE_ENDPOINTS.BASE, eventData);
    },
    onSuccess: createOnSuccessHandler(queryClient, 'timetable'),
  });
}

// Hook to update a timetable event
export function useUpdateTimetableEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...eventData }) => {
      return await apiPut(TIMETABLE_ENDPOINTS.BY_ID(id), eventData);
    },
    onSuccess: updateOnSuccessHandler(queryClient, 'timetable'),
  });
}

// Hook to delete a timetable event
export function useDeleteTimetableEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      return await apiDelete(TIMETABLE_ENDPOINTS.BY_ID(id));
    },
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: timetableKeys.detail(id) });

      // Use factory helper for standardized invalidation
      deleteOnSuccessHandler(queryClient, 'timetable')();
    },
  });
}

// Hook to update participant role in timetable entry
export function useUpdateTimetableParticipantRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, participantId, role }) => {
      return await apiPut(
        TIMETABLE_ENDPOINTS.UPDATE_PARTICIPANT(entryId, participantId),
        { role }
      );
    },
    onSuccess: () => {
      invalidateEntityQueries(queryClient, 'timetable');
    }
  });
}

// Hook to add participant to timetable entry
export function useAddTimetableParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, participantId }) => {
      return await apiPost(TIMETABLE_ENDPOINTS.ADD_PARTICIPANT(entryId), { participantId });
    },
    onSuccess: () => {
      invalidateEntityQueries(queryClient, 'timetable');
    }
  });
}

// Hook to remove participant from timetable entry
export function useRemoveTimetableParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, participantId }) => {
      return await apiDelete(TIMETABLE_ENDPOINTS.REMOVE_PARTICIPANT(entryId, participantId));
    },
    onSuccess: () => {
      invalidateEntityQueries(queryClient, 'timetable');
    }
  });
}
