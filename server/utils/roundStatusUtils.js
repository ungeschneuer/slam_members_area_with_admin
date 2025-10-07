/**
 * Round Status Calculation Utilities
 * Automatically calculates round status based on date and time
 * Uses Berlin timezone as default, with configurable timezone support
 */

import { getCurrentTimeInConfiguredTimezone, getConfiguredTimezone } from '../services/timezoneService.js';

/**
 * Calculate the status of a round based on current time and round schedule
 * @param {string} date - Round date (YYYY-MM-DD format)
 * @param {string} startTime - Round start time (HH:MM format)
 * @param {string} endTime - Round end time (HH:MM format)
 * @param {string} currentStatus - Current status in database (for CANCELLED rounds)
 * @param {string} timezone - Timezone for calculation (optional, uses configured timezone if not provided)
 * @returns {string} - Calculated status: SCHEDULED, ACTIVE, COMPLETED, or CANCELLED
 */
export function calculateRoundStatus(date, startTime, endTime, currentStatus = null, timezone = null) {
  // If the round is explicitly cancelled, keep it cancelled
  if (currentStatus === 'CANCELLED') {
    return 'CANCELLED';
  }

  // Use configured timezone if none specified
  const targetTimezone = timezone || getConfiguredTimezone();
  
  // Get current time in the specified timezone
  const now = getCurrentTimeInConfiguredTimezone();
  
  // Create datetime objects for start and end times in the specified timezone
  const startDateTime = new Date(`${date}T${startTime}:00`);
  const endDateTime = new Date(`${date}T${endTime}:00`);
  
  // If we're before the start time, it's scheduled
  if (now < startDateTime) {
    return 'SCHEDULED';
  }
  
  // If we're between start and end time, it's active
  if (now >= startDateTime && now <= endDateTime) {
    return 'ACTIVE';
  }
  
  // If we're after the end time, it's completed
  return 'COMPLETED';
}

/**
 * Calculate status for multiple rounds
 * @param {Array} rounds - Array of round objects with date, startTime, endTime, status
 * @param {string} timezone - Timezone for calculation (optional, uses configured timezone if not provided)
 * @returns {Array} - Array of rounds with calculated status
 */
export function calculateRoundsStatus(rounds, timezone = null) {
  const roundsWithStatus = rounds.map((round) => ({
    ...round,
    status: calculateRoundStatus(
      round.date, 
      round.startTime, 
      round.endTime, 
      round.status,
      timezone
    )
  }));
  
  return roundsWithStatus;
}

/**
 * Get status description for display
 * @param {string} status - Round status
 * @returns {string} - Human-readable status description
 */
export function getStatusDescription(status) {
  const descriptions = {
    'SCHEDULED': 'Scheduled',
    'ACTIVE': 'Currently Active',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled'
  };
  
  return descriptions[status] || 'Unknown';
}

/**
 * Get status color for UI display
 * @param {string} status - Round status
 * @returns {string} - CSS color class or hex color
 */
export function getStatusColor(status) {
  const colors = {
    'SCHEDULED': 'text-blue-600 bg-blue-100',
    'ACTIVE': 'text-green-600 bg-green-100',
    'COMPLETED': 'text-gray-600 bg-gray-100',
    'CANCELLED': 'text-red-600 bg-red-100'
  };
  
  return colors[status] || 'text-gray-600 bg-gray-100';
}

/**
 * Check if a round is currently active
 * @param {string} date - Round date
 * @param {string} startTime - Round start time
 * @param {string} endTime - Round end time
 * @returns {boolean} - True if round is currently active
 */
export function isRoundActive(date, startTime, endTime) {
  const status = calculateRoundStatus(date, startTime, endTime);
  return status === 'ACTIVE';
}

/**
 * Check if a round is completed
 * @param {string} date - Round date
 * @param {string} startTime - Round start time
 * @param {string} endTime - Round end time
 * @returns {boolean} - True if round is completed
 */
export function isRoundCompleted(date, startTime, endTime) {
  const status = calculateRoundStatus(date, startTime, endTime);
  return status === 'COMPLETED';
}
