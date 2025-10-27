import { useQuery } from '@tanstack/react-query';

/**
 * Generic entity data hook to reduce duplication across entity hooks
 * @param {string} entityType - e.g. 'participants', 'rounds', 'news'
 * @param {Function} fetchFn - function that fetches the data
 * @param {object} options - optional query options and filter params
 */
export function useEntityData(entityType, fetchFn, options = {}) {
  const { 
    filters = {}, 
    staleTime = 10 * 60 * 1000,  // 10 minutes (was 5 minutes)
    gcTime = 20 * 60 * 1000,     // 20 minutes (was 10 minutes)
    enabled = true,
    refetchInterval = false, // No polling by default - let entities opt-in
    isAdmin = false, // Add admin flag for polling configuration
    refetchOnWindowFocus = false,
    refetchIntervalInBackground = false
  } = options;

  return useQuery({
    queryKey: [entityType, filters],
    queryFn: () => fetchFn(filters),
    staleTime: staleTime, // Use the staleTime from options (set by getQueryConfig)
    gcTime,
    enabled,
    refetchInterval,
    refetchOnWindowFocus,
    refetchIntervalInBackground
  });
}



