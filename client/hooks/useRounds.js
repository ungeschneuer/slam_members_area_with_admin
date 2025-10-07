import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';

// Query keys for rounds
export const roundsKeys = {
  all: ['rounds'],
  lists: () => [...roundsKeys.all, 'list'],
  list: (filters) => [...roundsKeys.lists(), { filters }],
  details: () => [...roundsKeys.all, 'detail'],
  detail: (id) => [...roundsKeys.details(), id],
  bySlug: (slug) => [...roundsKeys.details(), 'slug', slug],
};

// Hook to fetch all rounds
export function useRounds(filters = {}) {
  return useQuery({
    queryKey: roundsKeys.list(filters),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/rounds`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch rounds: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to fetch a single round by ID
export function useRound(id) {
  return useQuery({
    queryKey: roundsKeys.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`${API_URL}/rounds/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch round: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || null;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Hook to fetch a round by slug
export function useRoundBySlug(slug) {
  return useQuery({
    queryKey: roundsKeys.bySlug(slug),
    queryFn: async () => {
      if (!slug) return null;
      const response = await fetch(`${API_URL}/rounds/slug/${slug}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch round: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || null;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Hook to create a round
export function useCreateRound() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (roundData) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/rounds`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(roundData)
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: (data) => {
      // Invalidate and refetch rounds list
      queryClient.invalidateQueries({ queryKey: roundsKeys.lists() });
      
      // If we have the created round data, add it to the cache
      if (data?.data) {
        queryClient.setQueryData(roundsKeys.detail(data.data.id), data.data);
        if (data.data.slug) {
          queryClient.setQueryData(roundsKeys.bySlug(data.data.slug), data.data);
        }
      }
    },
  });
}

// Hook to update a round
export function useUpdateRound() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...roundData }) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/rounds/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(roundData)
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch rounds list
      queryClient.invalidateQueries({ queryKey: roundsKeys.lists() });
      
      // Update the specific round in cache
      if (data?.data) {
        queryClient.setQueryData(roundsKeys.detail(variables.id), data.data);
        if (data.data.slug) {
          queryClient.setQueryData(roundsKeys.bySlug(data.data.slug), data.data);
        }
      }
    },
  });
}

// Hook to delete a round
export function useDeleteRound() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      try {
        // Check if user is authenticated before making the request
        if (!authService.isAuthenticated) {
          throw new Error('User not authenticated. Please log in again.');
        }

        const response = await authService.authenticatedRequest(
          `${API_URL}/rounds/${id}`,
          {
            method: 'DELETE'
          }
        );
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        return result?.data || result;
      } catch (error) {
        console.error('Delete round error:', error);
        throw error;
      }
    },
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: roundsKeys.detail(id) });
      
      // Invalidate and refetch rounds list
      queryClient.invalidateQueries({ queryKey: roundsKeys.lists() });
    },
    onError: (error) => {
      console.error('Delete round mutation error:', error);
    }
  });
}
