import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../utils/apiWrapper.js';
import { PARTICIPANTS_ENDPOINTS } from '../constants/apiEndpoints.js';

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

  return useQuery({
    queryKey: ['participants', 'search', searchTerm, filters, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (searchTerm?.trim()) {
        params.set('search', searchTerm.trim());
      }
      if (filters.role && filters.role !== 'all') {
        params.set('role', filters.role);
      }
      if (filters.region && filters.region !== 'all') {
        params.set('region', filters.region);
      }
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const url = `${PARTICIPANTS_ENDPOINTS.SEARCH}?${params}`;
      const result = await apiGet(url);

      if (result?.success === false) {
        console.warn('Participants search API returned error:', result.error);
        return {
          data: [],
          meta: {
            totalCount: 0,
            currentPage: page,
            totalPages: 0,
            searchTerm: searchTerm || '',
            filters
          }
        };
      }

      return result?.data || result;
    },
    enabled: enabled && (searchTerm?.length >= 2 || Object.values(filters).some(f => f && f !== 'all')),
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
export function useParticipantsFilterOptions(searchTerm = '', baseFilters = {}) {
  return useQuery({
    queryKey: ['participants', 'filter-options', searchTerm, baseFilters],
    queryFn: async () => {
      // Get a larger sample to determine available options
      const params = new URLSearchParams();
      if (searchTerm?.trim()) {
        params.set('search', searchTerm.trim());
      }
      params.set('limit', '1000'); // Get more results to analyze options
      params.set('page', '1');

      const url = `${PARTICIPANTS_ENDPOINTS.SEARCH}?${params}`;
      const result = await apiGet(url);
      const participants = result?.data?.data || [];

      // Extract unique regions and roles from results
      const regions = [...new Set(participants.map(p => p.region).filter(Boolean))].sort();
      const roles = [...new Set(participants.map(p => p.role).filter(Boolean))].sort();

      return { regions, roles };
    },
    enabled: searchTerm?.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false
  });
}
