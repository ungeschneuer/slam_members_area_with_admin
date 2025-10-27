import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';
import { useEntityData } from './useEntityData.js';
import { getQueryConfig } from '../config/polling.js';

// Query keys for city tips
export const cityTipsKeys = {
  all: ['city-tips'],
  lists: () => [...cityTipsKeys.all, 'list'],
  list: (filters) => [...cityTipsKeys.lists(), { filters }],
  details: () => [...cityTipsKeys.all, 'detail'],
  detail: (id) => [...cityTipsKeys.details(), id],
  bySlug: (slug) => [...cityTipsKeys.details(), 'slug', slug],
};

// Hook to fetch all city tips
export function useCityTips(filters = {}, isAdmin = false) {
  return useEntityData(
    'city-tips',
    async () => {
      const response = await fetch(`${API_URL}/city-tips`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch city tips: ${response.statusText}`);
      }
      const result = await response.json();
      // Handle nested data structure or direct array
      const data = result?.data?.data?.rows || result?.data?.rows || result?.data || result;
      return Array.isArray(data) ? data : [];
    },
    { filters, ...getQueryConfig('cityTips', isAdmin), isAdmin }
  );
}

// Hook to fetch a single city tip by ID
export function useCityTip(id) {
  return useQuery({
    queryKey: cityTipsKeys.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`${API_URL}/city-tips/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch city tip: ${response.statusText}`);
      }
      const result = await response.json();
      return result?.data || result || null;
    },
    enabled: !!id,
    ...getQueryConfig('cityTips', false, { refetchInterval: false }), // Detail pages don't need polling
  });
}

// Hook to fetch a city tip by slug
export function useCityTipBySlug(slug) {
  return useQuery({
    queryKey: cityTipsKeys.bySlug(slug),
    queryFn: async () => {
      if (!slug) return null;
      const response = await fetch(`${API_URL}/city-tips/${slug}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch city tip: ${response.statusText}`);
      }
      const result = await response.json();
      // Extract the actual city tip data from the database result
      const data = result?.data;
      if (data && data.rows && data.rows.length > 0) {
        return data.rows[0];
      }
      return null;
    },
    enabled: !!slug,
    ...getQueryConfig('cityTips', false, { refetchInterval: false }), // Detail pages don't need polling
  });
}

// Hook to create a city tip
export function useCreateCityTip() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (cityTipData) => {
      console.log('[useCreateCityTip] Starting mutation with data:', cityTipData);
      
      try {
        const response = await authService.authenticatedRequest(
          `${API_URL}/city-tips`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cityTipData)
          }
        );
        
        console.log('[useCreateCityTip] Response status:', response.status);
        console.log('[useCreateCityTip] Response headers:', Object.fromEntries(response.headers.entries()));
        
        const result = await response.json();
        console.log('[useCreateCityTip] Response body:', result);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${result.error || result.message || 'Unknown error'}`);
        }
        
        return result?.data || result;
      } catch (error) {
        console.error('[useCreateCityTip] Mutation error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidate all city-tips-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['city-tips'] });
      queryClient.invalidateQueries({ queryKey: cityTipsKeys.lists() });
      
      // If we have the created city tip data, add it to the cache
      if (data?.data) {
        queryClient.setQueryData(cityTipsKeys.detail(data.data.id), data.data);
        if (data.data.slug) {
          queryClient.setQueryData(cityTipsKeys.bySlug(data.data.slug), data.data);
        }
      }
    },
  });
}

// Hook to update a city tip
export function useUpdateCityTip() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...cityTipData }) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/city-tips/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cityTipData)
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: (data, variables) => {
      // Invalidate all city-tips-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['city-tips'] });
      queryClient.invalidateQueries({ queryKey: cityTipsKeys.lists() });
      
      // Update the specific city tip in cache
      if (data?.data) {
        queryClient.setQueryData(cityTipsKeys.detail(variables.id), data.data);
        if (data.data.slug) {
          queryClient.setQueryData(cityTipsKeys.bySlug(data.data.slug), data.data);
        }
      }
    },
  });
}

// Hook to delete a city tip
export function useDeleteCityTip() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const response = await authService.authenticatedRequest(
        `${API_URL}/city-tips/${id}`,
        {
          method: 'DELETE'
        }
      );
      const result = await response.json();
      return result?.data || result;
    },
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: cityTipsKeys.detail(id) });
      
      // Invalidate all city-tips-related queries to ensure admin components update
      queryClient.invalidateQueries({ queryKey: ['city-tips'] });
      queryClient.invalidateQueries({ queryKey: cityTipsKeys.lists() });
    },
  });
}
