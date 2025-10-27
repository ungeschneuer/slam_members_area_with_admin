// Unified date utilities - Simple and consistent date handling
// Follows project simplicity principles: one service, clear responsibilities

const BERLIN_TIMEZONE = 'Europe/Berlin';

/**
 * Format date for HTML date input (YYYY-MM-DD)
 * Handles timezone issues by using local date components
 * @param {string|Date} dateString - Date to format
 * @returns {string} Date in YYYY-MM-DD format
 */
export function formatDateForInput(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    // Validate the date
    if (isNaN(date.getTime())) {
      // Invalid date string - using fallback
      return '';
    }
    
    // Get local date components to avoid timezone shifts
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    // Error formatting date for input - using fallback
    return '';
  }
}

/**
 * Format date for display in German locale with Berlin timezone
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDateForDisplay(date, options = {}) {
  if (!date) return '';
  
  try {
    const defaultOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: BERLIN_TIMEZONE
    };
    
    return new Date(date).toLocaleDateString('de-DE', { ...defaultOptions, ...options });
  } catch (error) {
    // Error formatting date for display - using fallback
    return '';
  }
}

/**
 * Get today's date in Berlin timezone as YYYY-MM-DD string
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export function getTodayBerlinDateString() {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: BERLIN_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    // Error getting today Berlin date - using fallback
    return new Date().toISOString().split('T')[0]; // Fallback to local date
  }
}

/**
 * Check if a date string is in the future compared to Berlin timezone
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {boolean} True if date is in the future
 */
export function isFutureDateBerlin(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  
  // Validate date format first
  if (!isValidDateString(dateString)) return false;
  
  try {
    const todayStr = getTodayBerlinDateString();
    return dateString > todayStr; // String comparison works for YYYY-MM-DD format
  } catch (error) {
    // Error checking future date - using fallback
    return false;
  }
}

/**
 * Validate date string format (YYYY-MM-DD)
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid format
 */
export function isValidDateString(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  
  // Check YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  // Check if it's a valid date and matches the input
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;
  
  // Additional validation: check if the date components match
  const [year, month, day] = dateString.split('-').map(Number);
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}

/**
 * Create a date object from date and time strings
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in HH:mm format
 * @returns {Date} Combined datetime object
 */
export function createDateTime(date, time) {
  if (!date || !time) return null;
  
  try {
    // Parse date components
    const dateParts = date.split('-');
    if (dateParts.length !== 3) {
      throw new Error(`Invalid date format: ${date}`);
    }
    const [year, month, day] = dateParts.map(Number);
    
    // Parse time components
    const timeParts = time.split(':');
    if (timeParts.length < 2) {
      throw new Error(`Invalid time format: ${time}`);
    }
    const [hours, minutes, seconds = 0] = timeParts.map(Number);
    
    // Validate values
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
      throw new Error(`Invalid date/time values: ${date} ${time}`);
    }
    
    // Create date object
    const dateTime = new Date(year, month - 1, day, hours, minutes, seconds);
    
    // Validate the created date
    if (isNaN(dateTime.getTime())) {
      throw new Error(`Invalid date/time combination: ${date} ${time}`);
    }
    
    return dateTime;
  } catch (error) {
    // Error creating datetime - using fallback
    return null;
  }
}

/**
 * Get current time in Berlin timezone
 * @returns {Date} Current date in Berlin timezone
 */
export function getCurrentBerlinTime() {
  try {
    return new Date().toLocaleString('en-US', { timeZone: BERLIN_TIMEZONE });
  } catch (error) {
    // Error getting current Berlin time - using fallback
    return new Date(); // Fallback to local time
  }
}

// Export constants for use in other modules
export { BERLIN_TIMEZONE };
