// Timezone utilities for consistent Berlin time handling

const BERLIN_TIMEZONE = 'Europe/Berlin';

/**
 * Format a date string to German locale with Berlin timezone
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDateToBerlin(date, options = {}) {
  const defaultOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: BERLIN_TIMEZONE
  };
  
  return new Date(date).toLocaleDateString('de-DE', { ...defaultOptions, ...options });
}

/**
 * Format a time string to German locale with Berlin timezone
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted time string
 */
export function formatTimeToBerlin(date, options = {}) {
  const defaultOptions = {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BERLIN_TIMEZONE
  };
  
  return new Date(date).toLocaleTimeString('de-DE', { ...defaultOptions, ...options });
}

/**
 * Format a date and time string to German locale with Berlin timezone
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date and time string
 */
export function formatDateTimeToBerlin(date, options = {}) {
  const defaultOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BERLIN_TIMEZONE
  };
  
  return new Date(date).toLocaleString('de-DE', { ...defaultOptions, ...options });
}

/**
 * Format a full date string (with weekday) to German locale with Berlin timezone
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted full date string
 */
export function formatFullDateToBerlin(date, options = {}) {
  const defaultOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: BERLIN_TIMEZONE
  };
  
  return new Date(date).toLocaleDateString('de-DE', { ...defaultOptions, ...options });
}

/**
 * Get current time in Berlin timezone
 * @returns {Date} Current date in Berlin timezone
 */
export function getCurrentBerlinTime() {
  return new Date().toLocaleString('en-US', { timeZone: BERLIN_TIMEZONE });
}

/**
 * Convert a date to Berlin timezone
 * @param {string|Date} date - Date to convert
 * @returns {Date} Date in Berlin timezone
 */
export function toBerlinTime(date) {
  const berlinTime = new Date(date).toLocaleString('en-US', { timeZone: BERLIN_TIMEZONE });
  return new Date(berlinTime);
}

/**
 * Check if a date is in the future (Berlin time)
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if date is in the future
 */
export function isFutureDate(date) {
  const now = new Date();
  const targetDate = new Date(date);
  return targetDate > now;
}

/**
 * Get time difference between now and target date (Berlin time)
 * @param {string|Date} targetDate - Target date
 * @returns {Object} Object with days, hours, minutes, seconds
 */
export function getTimeDifference(targetDate) {
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  const distance = target - now;

  if (distance <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((distance % (1000 * 60)) / 1000)
  };
}

/**
 * Format relative time (e.g., "in 2 days", "yesterday")
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const targetDate = new Date(date);
  const diffTime = targetDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'heute';
  } else if (diffDays === 1) {
    return 'morgen';
  } else if (diffDays === -1) {
    return 'gestern';
  } else if (diffDays > 1) {
    return `in ${diffDays} Tagen`;
  } else {
    return `vor ${Math.abs(diffDays)} Tagen`;
  }
}

export default {
  BERLIN_TIMEZONE,
  formatDateToBerlin,
  formatTimeToBerlin,
  formatDateTimeToBerlin,
  formatFullDateToBerlin,
  getCurrentBerlinTime,
  toBerlinTime,
  isFutureDate,
  getTimeDifference,
  formatRelativeTime
};


















