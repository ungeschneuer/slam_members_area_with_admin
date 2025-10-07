import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';

// Query keys for timetable
export const timetableKeys = {
  all: ['timetable'],
  lists: () => [...timetableKeys.all, 'list'],
  list: (filters) => [...timetableKeys.lists(), { filters }],
  details: () => [...timetableKeys.all, 'detail'],
  detail: (id) => [...timetableKeys.details(), id],
};

// Hook to fetch all timetable events
export function useTimetable(filters = {}) {
  return useQuery({
    queryKey: timetableKeys.list(filters),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/timetable`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch timetable: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to fetch a single timetable event by slug
export function useTimetableEvent(slug) {
  return useQuery({
    queryKey: timetableKeys.detail(slug),
    queryFn: async () => {
      if (!slug) return null;
      const response = await fetch(`${API_URL}/timetable/slug/${slug}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch timetable event: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || null;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Hook to create a timetable event
export function useCreateTimetableEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventData) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/timetable`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData)
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: (data) => {
      // Invalidate and refetch timetable list
      queryClient.invalidateQueries({ queryKey: timetableKeys.lists() });
      
      // If we have the created event data, add it to the cache
      if (data?.data) {
        queryClient.setQueryData(timetableKeys.detail(data.data.id), data.data);
      }
    },
  });
}

// Hook to update a timetable event
export function useUpdateTimetableEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...eventData }) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/timetable/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData)
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch timetable list
      queryClient.invalidateQueries({ queryKey: timetableKeys.lists() });
      
      // Update the specific event in cache
      if (data?.data) {
        queryClient.setQueryData(timetableKeys.detail(variables.id), data.data);
      }
    },
  });
}

// Hook to delete a timetable event
export function useDeleteTimetableEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/timetable/${id}`,
        {
          method: 'DELETE'
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: timetableKeys.detail(id) });
      
      // Invalidate and refetch timetable list
      queryClient.invalidateQueries({ queryKey: timetableKeys.lists() });
    },
  });
}
