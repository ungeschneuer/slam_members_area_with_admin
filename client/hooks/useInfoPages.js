import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';

// Query keys for info pages
export const infoPagesKeys = {
  all: ['info-pages'],
  lists: () => [...infoPagesKeys.all, 'list'],
  list: (filters) => [...infoPagesKeys.lists(), { filters }],
  details: () => [...infoPagesKeys.all, 'detail'],
  detail: (id) => [...infoPagesKeys.details(), id],
  bySlug: (slug) => [...infoPagesKeys.details(), 'slug', slug],
};

// Hook to fetch all info pages
export function useInfoPages(filters = {}) {
  return useQuery({
    queryKey: infoPagesKeys.list(filters),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/info-pages`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch info pages: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || [];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes (info pages change rarely)
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

// Hook to fetch a single info page by ID
export function useInfoPage(id) {
  return useQuery({
    queryKey: infoPagesKeys.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`${API_URL}/info-pages/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch info page: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || null;
    },
    enabled: !!id,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

// Hook to fetch an info page by slug
export function useInfoPageBySlug(slug) {
  return useQuery({
    queryKey: infoPagesKeys.bySlug(slug),
    queryFn: async () => {
      if (!slug) return null;
      const response = await fetch(`${API_URL}/info-pages/slug/${slug}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch info page: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || null;
    },
    enabled: !!slug,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

// Hook to create an info page
export function useCreateInfoPage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (infoPageData) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/info-pages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(infoPageData)
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: (data) => {
      // Invalidate and refetch info pages list
      queryClient.invalidateQueries({ queryKey: infoPagesKeys.lists() });
      
      // If we have the created info page data, add it to the cache
      if (data?.data) {
        queryClient.setQueryData(infoPagesKeys.detail(data.data.id), data.data);
        if (data.data.slug) {
          queryClient.setQueryData(infoPagesKeys.bySlug(data.data.slug), data.data);
        }
      }
    },
  });
}

// Hook to update an info page
export function useUpdateInfoPage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...infoPageData }) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/info-pages/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(infoPageData)
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch info pages list
      queryClient.invalidateQueries({ queryKey: infoPagesKeys.lists() });
      
      // Update the specific info page in cache
      if (data?.data) {
        queryClient.setQueryData(infoPagesKeys.detail(variables.id), data.data);
        if (data.data.slug) {
          queryClient.setQueryData(infoPagesKeys.bySlug(data.data.slug), data.data);
        }
      }
    },
  });
}

// Hook to delete an info page
export function useDeleteInfoPage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/info-pages/${id}`,
        {
          method: 'DELETE'
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: infoPagesKeys.detail(id) });
      
      // Invalidate and refetch info pages list
      queryClient.invalidateQueries({ queryKey: infoPagesKeys.lists() });
    },
  });
}
