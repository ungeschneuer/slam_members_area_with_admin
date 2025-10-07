import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';

// Participants hooks for data management

// Query keys for participants
export const participantsKeys = {
  all: ['participants'],
  lists: () => [...participantsKeys.all, 'list'],
  list: (filters) => [...participantsKeys.lists(), { filters }],
  details: () => [...participantsKeys.all, 'detail'],
  detail: (id) => [...participantsKeys.details(), id]
};

// Hook to fetch all participants
export function useParticipants(filters = {}) {
  return useQuery({
    queryKey: participantsKeys.list(filters),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/participants`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch participants: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
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
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Hook to create a participant
export function useCreateParticipant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (participantData) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(participantData)
        }
      );
      const result = await response.json();
      return result?.data || result;
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
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousParticipants) {
        queryClient.setQueryData(participantsKeys.lists(), context.previousParticipants);
      }
    },
    onSuccess: (data) => {
      // Invalidate and refetch participants list
      queryClient.invalidateQueries({ queryKey: participantsKeys.lists() });
      
      // If we have the created participant data, add it to the cache
      if (data?.data) {
        queryClient.setQueryData(participantsKeys.detail(data.data.id), data.data);
      }
    },
  });
}

// Hook to update a participant
export function useUpdateParticipant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...participantData }) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/participants/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(participantData)
        }
      );
      const result = await response.json();
      return result?.data || result;
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
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousParticipants) {
        queryClient.setQueryData(participantsKeys.lists(), context.previousParticipants);
      }
      if (context?.previousParticipant) {
        queryClient.setQueryData(participantsKeys.detail(variables.id), context.previousParticipant);
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch participants list
      queryClient.invalidateQueries({ queryKey: participantsKeys.lists() });
      
      // Update the specific participant in cache
      if (data?.data) {
        queryClient.setQueryData(participantsKeys.detail(variables.id), data.data);
      }
    },
  });
}

// Hook to delete a participant
export function useDeleteParticipant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/participants/${id}`,
        {
          method: 'DELETE'
        }
      );
      const result = await response.json();
      return result?.data || result;
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
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousParticipants) {
        queryClient.setQueryData(participantsKeys.lists(), context.previousParticipants);
      }
      if (context?.previousParticipant) {
        queryClient.setQueryData(participantsKeys.detail(id), context.previousParticipant);
      }
    },
    onSuccess: (data, id) => {
      // Invalidate and refetch participants list
      queryClient.invalidateQueries({ queryKey: participantsKeys.lists() });
    },
  });
}
