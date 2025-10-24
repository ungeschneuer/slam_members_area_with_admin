import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';
import { useEntityData } from './useEntityData.js';

// Query keys for links
export const linksKeys = {
  all: ['links'],
  lists: () => [...linksKeys.all, 'list'],
  list: (filters) => [...linksKeys.lists(), { filters }],
  details: () => [...linksKeys.all, 'detail'],
  detail: (id) => [...linksKeys.details(), id],
};

// Hook to fetch all links
export function useLinks(filters = {}, isAdmin = false) {
  return useEntityData(
    'links',
    async () => {
      const response = await fetch(`${API_URL}/links`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch links: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || [];
    },
    { filters, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, isAdmin }
  );
}

// Hook to fetch a single link
export function useLink(id) {
  return useQuery({
    queryKey: linksKeys.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`${API_URL}/links/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch link: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || null;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}


// Hook to create a link
export function useCreateLink() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (linkData) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/links`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(linkData)
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: (data) => {
      // Invalidate all links-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: linksKeys.lists() });
      
      // If we have the created link data, add it to the cache
      if (data?.data) {
        queryClient.setQueryData(linksKeys.detail(data.data.id), data.data);
      }
    },
  });
}

// Hook to update a link
export function useUpdateLink() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...linkData }) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/links/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(linkData)
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: (data, variables) => {
      // Invalidate all links-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: linksKeys.lists() });
      
      // Update the specific link in cache
      if (data?.data) {
        queryClient.setQueryData(linksKeys.detail(variables.id), data.data);
      }
    },
  });
}

// Hook to delete a link
export function useDeleteLink() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/links/${id}`,
        {
          method: 'DELETE'
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: linksKeys.detail(id) });
      
      // Invalidate all links-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: linksKeys.lists() });
    },
  });
}
