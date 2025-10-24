import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';
import { useEntityData } from './useEntityData.js';

// Query keys for schnellzugriff
export const schnellzugriffKeys = {
  all: ['schnellzugriff'],
  lists: () => [...schnellzugriffKeys.all, 'list'],
  list: (filters) => [...schnellzugriffKeys.lists(), { filters }],
  details: () => [...schnellzugriffKeys.all, 'detail'],
  detail: (id) => [...schnellzugriffKeys.details(), id],
};

// Hook to fetch all schnellzugriff links
export function useSchnellzugriff(filters = {}, isAdmin = false) {
  return useQuery({
    queryKey: schnellzugriffKeys.list(filters),
    queryFn: async () => {
      const endpoint = isAdmin ? '/schnellzugriff/admin/all' : '/schnellzugriff';
      const response = await fetch(`${API_URL}${endpoint}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch schnellzugriff links: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || [];
    },
    enabled: true
  });
}

// Hook to fetch a single schnellzugriff link
export function useSchnellzugriffLink(id) {
  return useQuery({
    queryKey: schnellzugriffKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/schnellzugriff/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch schnellzugriff link: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || null;
    },
    enabled: !!id,
  });
}

// Hook to create a new schnellzugriff link
export function useCreateSchnellzugriff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newLink) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/schnellzugriff`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newLink)
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: () => {
      // Invalidate all schnellzugriff-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['schnellzugriff'] });
      queryClient.invalidateQueries({ queryKey: schnellzugriffKeys.all });
    },
  });
}

// Hook to update a schnellzugriff link
export function useUpdateSchnellzugriff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updatedLink }) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/schnellzugriff/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedLink)
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: () => {
      // Invalidate all schnellzugriff-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['schnellzugriff'] });
      queryClient.invalidateQueries({ queryKey: schnellzugriffKeys.all });
    },
  });
}

// Hook to delete a schnellzugriff link
export function useDeleteSchnellzugriff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/schnellzugriff/${id}`,
        {
          method: 'DELETE'
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: () => {
      // Invalidate all schnellzugriff-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['schnellzugriff'] });
      queryClient.invalidateQueries({ queryKey: schnellzugriffKeys.all });
    },
  });
}
