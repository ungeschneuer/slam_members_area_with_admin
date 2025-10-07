/**
 * Frontend Timezone Service
 * Provides timezone-aware time utilities for the frontend
 */

/**
 * Get the current time in the configured timezone
 * @returns {Promise<Date>} - Current time in configured timezone
 */
export async function getCurrentTimeInConfiguredTimezone() {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/settings`);
    const data = await response.json();
    
    if (data.success && data.data.timezone) {
      const timezone = data.data.timezone;
      const now = new Date();
      
      // Convert to the configured timezone
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const parts = formatter.formatToParts(now);
      return new Date(
        `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}T${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}:${parts.find(p => p.type === 'second').value}`
      );
    }
    
    // Fallback to local time if API fails
    return new Date();
  } catch (error) {
    console.warn('Failed to fetch timezone configuration, using local time:', error);
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
    const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/settings`);
    const data = await response.json();
    
    if (data.success && data.data.timezone) {
      const timezone = data.data.timezone;
      const dateObj = new Date(date);
      
      return new Intl.DateTimeFormat('de-DE', {
        timeZone: timezone,
        ...options
      }).format(dateObj);
    }
    
    // Fallback to local timezone
    return new Intl.DateTimeFormat('de-DE', options).format(new Date(date));
  } catch (error) {
    console.warn('Failed to fetch timezone configuration, using local timezone:', error);
    return new Intl.DateTimeFormat('de-DE', options).format(new Date(date));
  }
}

/**
 * Get timezone offset for countdown calculations
 * @returns {Promise<number>} - Timezone offset in minutes
 */
export async function getTimezoneOffset() {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/settings`);
    const data = await response.json();
    
    if (data.success && data.data.timezone) {
      const timezone = data.data.timezone;
      const now = new Date();
      
      // Get offset for the configured timezone
      const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      const targetTime = new Date(utc.toLocaleString("en-US", { timeZone: timezone }));
      return (targetTime.getTime() - utc.getTime()) / 60000;
    }
    
    // Fallback to local timezone offset
    return new Date().getTimezoneOffset();
  } catch (error) {
    console.warn('Failed to fetch timezone configuration, using local offset:', error);
    return new Date().getTimezoneOffset();
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
      const now = await getCurrentTimeInConfiguredTimezone();
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
      console.error('Error updating countdown:', error);
      // Fallback to local time
      const now = new Date();
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
