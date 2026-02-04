import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';

/**
 * Custom hook to debounce a value
 */
function useDebouncedValue(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for server-side participants search
 * Implements debounced search with server-side filtering for optimal performance
 */
export function useParticipantsSearch(searchTerm, filters = {}, options = {}) {
  const {
    page = 1,
    limit = 25,
    enabled = true,
    debounceMs = 300
  } = options;

  // Debounce the search term to avoid firing a request on every keystroke
  const debouncedSearchTerm = useDebouncedValue(searchTerm, debounceMs);

  return useQuery({
    queryKey: ['participants', 'search', debouncedSearchTerm, filters, page, limit],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();

      if (debouncedSearchTerm?.trim()) {
        params.set('search', debouncedSearchTerm.trim());
      }
      if (filters.role && filters.role !== 'all') {
        params.set('role', filters.role);
      }
      if (filters.region && filters.region !== 'all') {
        params.set('region', filters.region);
      }
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const response = await fetch(`${API_URL}/participants/search?${params}`, {
        credentials: 'include',
        signal
      });

      if (!response.ok) {
        throw new Error(`Failed to search participants: ${response.statusText}`);
      }

      const result = await response.json();

      if (result?.success === false) {
        console.warn('Participants search API returned error:', result.error);
        return {
          data: [],
          meta: {
            totalCount: 0,
            currentPage: page,
            totalPages: 0,
            searchTerm: debouncedSearchTerm || '',
            filters
          }
        };
      }

      return result?.data || result;
    },
    enabled: enabled && (debouncedSearchTerm?.length >= 2 || Object.values(filters).some(f => f && f !== 'all')),
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000)
  });
}

/**
 * Hook for getting available filter options from search results
 * This helps populate dropdowns with current search context
 */
export function useParticipantsFilterOptions() {
  return useQuery({
    queryKey: ['participants', 'filter-options'],
    queryFn: async ({ signal }) => {
      const response = await fetch(`${API_URL}/participants/filter-options`, {
        credentials: 'include',
        signal
      });

      if (!response.ok) {
        throw new Error(`Failed to get filter options: ${response.statusText}`);
      }

      const result = await response.json();
      return result?.data || { regions: [], roles: [] };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache (options change rarely)
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false
  });
}
