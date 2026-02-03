import { useQuery } from '@tanstack/react-query';
import { API_URL } from '../config/api';

/**
 * Custom hook for server-side participant search with pagination and filtering
 *
 * @param {Object} params - Search parameters
 * @param {string} params.search - Search term for name, region, role, pronouns
 * @param {string} params.role - Role filter (or 'all')
 * @param {string} params.region - Region filter (or 'all')
 * @param {number} params.page - Page number (1-indexed)
 * @param {number} params.limit - Results per page
 * @param {boolean} enabled - Whether the query should run
 * @returns {Object} React Query result with participants data and metadata
 */
export function useParticipantSearch({
  search = '',
  role = 'all',
  region = 'all',
  page = 1,
  limit = 25
} = {}, enabled = true) {
  return useQuery({
    queryKey: ['participants', 'search', { search, role, region, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: search.trim(),
        role,
        region,
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${API_URL}/participants/search?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      return response.json();
    },
    enabled,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch on window focus for search results
  });
}
