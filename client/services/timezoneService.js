/**
 * Frontend Timezone Service
 * Provides timezone-aware time utilities for the frontend
 */

import { apiGet } from '../utils/apiWrapper.js';
import { SETTINGS_ENDPOINTS } from '../constants/apiEndpoints.js';

// Cache for timezone configuration to reduce API calls
let timezoneCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached timezone configuration or fetch from API
 * @returns {Promise<{timezone: string, app_name: string, app_version: string}>}
 */
async function getTimezoneConfig() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (timezoneCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return timezoneCache;
  }
  
  try {
    const data = await apiGet(SETTINGS_ENDPOINTS.BASE, {
      timeout: 5000
    });

    if (data.success && data.data) {
      timezoneCache = data.data;
      cacheTimestamp = now;
      return data.data;
    }

    throw new Error('Invalid response format');
  } catch (error) {
    // Failed to fetch timezone configuration - using fallback
    
    // Return fallback configuration
    return {
      timezone: 'Europe/Berlin',
      app_name: 'SLAM25 Members Area',
      app_version: '1.0.0'
    };
  }
}

/**
 * Get the current time in the configured timezone
 * @returns {Promise<Date>} - Current time in configured timezone
 */
export async function getCurrentTimeInConfiguredTimezone() {
  try {
    const config = await getTimezoneConfig();
    const timezone = config.timezone;
    const now = new Date();
    
    // Get the current time in the configured timezone
    // We need to create a Date object that represents the current time in the target timezone
    // This is done by getting the timezone offset and adjusting the UTC time accordingly
    const utcTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const targetTime = new Date(utcTime.toLocaleString("en-US", { timeZone: timezone }));
    const offset = targetTime.getTime() - utcTime.getTime();
    
    // Return a Date object representing the current time in the target timezone
    return new Date(now.getTime() + offset);
  } catch (error) {
    // Failed to get timezone configuration - using local time
    return new Date();
  }
}

/**
 * Format a date in the configured timezone
 * @param {Date|string} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {Promise<string>} - Formatted date string
 */
export async function formatDateInConfiguredTimezone(date, options = {}) {
  try {
    // Validate input date
    if (!date) {
      // Invalid date provided - using fallback
      return '';
    }
    
    const dateObj = new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      // Invalid date value - using fallback
      return '';
    }
    
    const config = await getTimezoneConfig();
    const timezone = config.timezone;
    
    return new Intl.DateTimeFormat('de-DE', {
      timeZone: timezone,
      ...options
    }).format(dateObj);
  } catch (error) {
    // Failed to get timezone configuration - using local timezone
    
    // Validate date before fallback formatting
    if (!date) {
      return '';
    }
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      // Invalid date value in fallback formatting
      return '';
    }
    
    return new Intl.DateTimeFormat('de-DE', options).format(dateObj);
  }
}

/**
 * Get timezone offset for countdown calculations
 * @returns {Promise<number>} - Timezone offset in minutes
 */
export async function getTimezoneOffset() {
  try {
    const config = await getTimezoneConfig();
    const timezone = config.timezone;
    const now = new Date();
    
    // Get offset for the configured timezone
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const targetTime = new Date(utc.toLocaleString("en-US", { timeZone: timezone }));
    return (targetTime.getTime() - utc.getTime()) / 60000;
  } catch (error) {
    // Failed to get timezone configuration - using local offset
    return new Date().getTimezoneOffset();
  }
}

/**
 * Get timezone offset for a specific date in the configured timezone
 * @param {Date|string} dateLike - Date to evaluate
 * @returns {Promise<number>} - Timezone offset in minutes at that date
 */
export async function getTimezoneOffsetFor(dateLike) {
  try {
    const config = await getTimezoneConfig();
    const timezone = config.timezone;
    const date = new Date(dateLike);
    const utc = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
    const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
    return (targetTime.getTime() - utc.getTime()) / 60000;
  } catch (error) {
    // Failed to get timezone configuration - using local offset for date
    const d = new Date(dateLike);
    return d.getTimezoneOffset();
  }
}

/**
 * Create a timezone-aware countdown timer
 * @param {Date|string} targetDate - Target date for countdown
 * @param {Function} updateCallback - Callback function to update countdown
 * @param {number} intervalMs - Update interval in milliseconds
 * @returns {Function} - Cleanup function to stop the timer
 */
export function createTimezoneAwareCountdown(targetDate, updateCallback, intervalMs = 1000) {
  const target = new Date(targetDate);
  
  const updateCountdown = async () => {
    try {
      // Compare UTC with UTC for accurate countdown calculation
      const now = new Date(); // Current UTC time
      const difference = target.getTime() - now.getTime();
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        updateCallback({
          days,
          hours,
          minutes,
          seconds,
          total: difference,
          expired: false
        });
      } else {
        updateCallback({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0,
          expired: true
        });
      }
    } catch (error) {
      // Error updating countdown - handled by error state
      // Fallback to UTC time comparison
      const now = new Date(); // Current UTC time
      const difference = target.getTime() - now.getTime();
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        updateCallback({
          days,
          hours,
          minutes,
          seconds,
          total: difference,
          expired: false
        });
      } else {
        updateCallback({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0,
          expired: true
        });
      }
    }
  };
  
  // Initial update
  updateCountdown();
  
  // Set up interval
  const interval = setInterval(updateCountdown, intervalMs);
  
  // Return cleanup function
  return () => clearInterval(interval);
}

/**
 * Clear the timezone configuration cache
 * Useful when timezone settings change
 */
export function clearTimezoneCache() {
  timezoneCache = null;
  cacheTimestamp = 0;
}

/**
 * Get the current cached timezone configuration
 * @returns {Object|null} - Cached configuration or null
 */
export function getCachedTimezoneConfig() {
  return timezoneCache;
}
