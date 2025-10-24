/**
 * Centralized Polling Configuration
 * 
 * Defines consistent polling intervals for real-time updates across the application.
 * Follows the simplified architecture principle of using simple polling instead of WebSockets.
 */

/**
 * Polling intervals in milliseconds
 */
export const POLLING_INTERVALS = {
  // Fast polling for critical real-time data
  CRITICAL: 15 * 1000,        // 15 seconds - rounds, countdown
  
  // Standard polling for admin data
  ADMIN: 30 * 1000,           // 30 seconds - participants, news, teams
  
  // Slow polling for less critical data
  STANDARD: 60 * 1000,        // 1 minute - city tips, info pages
  
  // No polling for static data
  NONE: false                 // No polling - static content
};

/**
 * Get polling interval based on data type and user role
 * @param {string} dataType - Type of data (rounds, participants, news, etc.)
 * @param {boolean} isAdmin - Whether user is admin
 * @returns {number|false} Polling interval in milliseconds or false for no polling
 */
export function getPollingInterval(dataType, isAdmin = false) {
  // Admin users get more frequent updates
  if (isAdmin) {
    switch (dataType) {
      case 'rounds':
      case 'countdown':
        return POLLING_INTERVALS.CRITICAL;
      case 'participants':
      case 'news':
      case 'teams':
        return POLLING_INTERVALS.ADMIN;
      case 'cityTips':
      case 'infoPages':
        return POLLING_INTERVALS.STANDARD;
      default:
        return POLLING_INTERVALS.NONE;
    }
  }
  
  // Regular users get less frequent updates
  switch (dataType) {
    case 'rounds':
    case 'countdown':
      return POLLING_INTERVALS.CRITICAL;
    case 'participants':
    case 'news':
    case 'teams':
      return POLLING_INTERVALS.ADMIN;
    case 'cityTips':
    case 'infoPages':
      return POLLING_INTERVALS.STANDARD;
    default:
      return POLLING_INTERVALS.NONE;
  }
}

/**
 * React Query configuration with consistent polling
 * @param {string} dataType - Type of data
 * @param {boolean} isAdmin - Whether user is admin
 * @param {Object} options - Additional options
 * @returns {Object} React Query configuration
 */
export function getQueryConfig(dataType, isAdmin = false, options = {}) {
  const refetchInterval = getPollingInterval(dataType, isAdmin);
  
  return {
    staleTime: 5 * 60 * 1000,        // 5 minutes
    gcTime: 10 * 60 * 1000,          // 10 minutes
    refetchInterval,
    refetchOnWindowFocus: false,      // Don't refetch on window focus
    refetchIntervalInBackground: false, // Don't poll in background
    ...options
  };
}

export default {
  POLLING_INTERVALS,
  getPollingInterval,
  getQueryConfig
};
