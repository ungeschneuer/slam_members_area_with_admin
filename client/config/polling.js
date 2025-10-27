/**
 * Centralized Polling Configuration
 * 
 * Defines consistent polling intervals for real-time updates across the application.
 * Follows the simplified architecture principle of using simple polling for real-time updates.
 */

/**
 * Polling intervals in milliseconds
 */
export const POLLING_INTERVALS = {
  // Fast polling for critical real-time data
  CRITICAL: 60 * 1000,        // 1 minute - rounds, countdown
  
  // Standard polling for admin data
  ADMIN: 5 * 60 * 1000,       // 5 minutes - participants, teams
  
  // Medium polling for content data
  MEDIUM: 5 * 60 * 1000,     // 5 minutes - news, info pages, timetable, city tips
  
  // Slow polling for static data
  SLOW: 5 * 60 * 1000,       // 5 minutes - links, schnellzugriff
  
  // Very slow polling for settings
  SETTINGS: 5 * 60 * 1000,    // 5 minutes - dashboard settings
  
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
      case 'teams':
        return POLLING_INTERVALS.ADMIN;
      case 'news':
      case 'infoPages':
      case 'timetable':
      case 'cityTips':
        return POLLING_INTERVALS.MEDIUM;
      case 'breakingNews':
        return POLLING_INTERVALS.ADMIN;
      case 'links':
      case 'schnellzugriff':
        return POLLING_INTERVALS.SLOW;
      case 'dashboard-settings':
        return POLLING_INTERVALS.SETTINGS;
      default:
        return POLLING_INTERVALS.NONE;
    }
  }
  
  // Regular users get same polling intervals
  switch (dataType) {
    case 'rounds':
    case 'countdown':
      return POLLING_INTERVALS.CRITICAL;
    case 'participants':
    case 'teams':
      return POLLING_INTERVALS.ADMIN;
    case 'news':
    case 'infoPages':
    case 'timetable':
    case 'cityTips':
      return POLLING_INTERVALS.MEDIUM;
    case 'breakingNews':
      return POLLING_INTERVALS.ADMIN;
    case 'links':
    case 'schnellzugriff':
      return POLLING_INTERVALS.SLOW;
    case 'dashboard-settings':
      return POLLING_INTERVALS.SETTINGS;
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
  
  // Enable background polling for critical live event data
  const enableBackgroundPolling = ['rounds', 'countdown', 'participants', 'teams', 'breakingNews'].includes(dataType);
  
  return {
    staleTime: 5 * 60 * 1000,        // 5 minutes
    gcTime: 10 * 60 * 1000,          // 10 minutes
    refetchInterval,
    refetchOnWindowFocus: false,      // Don't refetch on window focus
    refetchIntervalInBackground: enableBackgroundPolling, // Poll in background for live events
    ...options
  };
}

export default {
  POLLING_INTERVALS,
  getPollingInterval,
  getQueryConfig
};
