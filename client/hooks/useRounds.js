import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';
import { useEntityData } from './useEntityData.js';
import { getQueryConfig } from '../config/polling.js';

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
export function useRounds(filters = {}, isAdmin = false) {
  return useEntityData(
    'rounds',
    async () => {
      const response = await fetch(`${API_URL}/rounds`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch rounds: ${response.statusText}`);
      }
      const result = await response.json();
      // Handle both success and error responses, always return an array
      if (result?.success === false) {
        console.warn('Rounds API returned error:', result.error);
        return [];
      }
      return Array.isArray(result?.data) ? result.data : (Array.isArray(result) ? result : []);
    },
    { filters, ...getQueryConfig('rounds', isAdmin), isAdmin }
  );
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
    ...getQueryConfig('rounds', false),
  });
}

// Hook to fetch a round by slug
export function useRoundBySlug(slug) {
  return useQuery({
    queryKey: roundsKeys.bySlug(slug),
    queryFn: async () => {
      if (!slug) return null;
      const response = await fetch(`${API_URL}/rounds/${slug}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch round: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || null;
    },
    enabled: !!slug,
    ...getQueryConfig('rounds', false),
  });
}

// Hook to create a round
export function useCreateRound() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (roundData) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/rounds`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(roundData)
          }
        );
        
        const result = await response.json();
        
        if (!result.success && result.error) {
          throw new Error(result.error);
        }
        
        return result?.data || result;
      } catch (error) {
        console.error('Create round error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidate all rounds-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: roundsKeys.all });
      queryClient.invalidateQueries({ queryKey: roundsKeys.lists() });
      
      // If we have the created round data, add it to the cache
      if (data && data.id) {
        queryClient.setQueryData(roundsKeys.detail(data.id), data);
        if (data.slug) {
          queryClient.setQueryData(roundsKeys.bySlug(data.slug), data);
        }
      }
    },
    onError: (error) => {
      console.error('Create round mutation error:', error);
    }
  });
}

// Hook to update a round
export function useUpdateRound() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, version, ...roundData }) => {
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/rounds/${id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...roundData, version })
          }
        );
        
        const result = await response.json();
        
        if (!result.success && result.error) {
          throw new Error(result.error);
        }
        
        return result?.data || result;
      } catch (error) {
        console.error('Update round error:', error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate all rounds-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: roundsKeys.all });
      queryClient.invalidateQueries({ queryKey: roundsKeys.lists() });
      
      // Update the specific round in cache
      if (data && data.id) {
        queryClient.setQueryData(roundsKeys.detail(variables.id), data);
        if (data.slug) {
          queryClient.setQueryData(roundsKeys.bySlug(data.slug), data);
        }
      }
    },
    onError: (error) => {
      console.error('Update round mutation error:', error);
    }
  });
}

// Hook to delete a round
export function useDeleteRound() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      try {
        // Check if user is authenticated before making the request
        if (!authService.isLoggedIn()) {
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
      
      // Invalidate all rounds-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: roundsKeys.all });
      queryClient.invalidateQueries({ queryKey: roundsKeys.lists() });
    },
    onError: (error) => {
      console.error('Delete round mutation error:', error);
    }
  });
}
