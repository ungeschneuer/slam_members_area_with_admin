/**
 * Round Status Service
 * Calculates round status based on current time and timezone
 */

import { getCurrentTimeInConfiguredTimezone } from './timezoneService.js';
import logger from '../config/logger.js';

export class RoundStatusService {
  
  /**
   * Calculate round status based on current time and round timing
   * @param {Object} round - Round object with date, start_time, end_time
   * @returns {string} - Calculated status: 'SCHEDULED', 'ACTIVE', 'COMPLETED'
   */
  calculateRoundStatus(round) {
    if (!round.date || !round.start_time || !round.end_time) {
      return 'SCHEDULED'; // Default to scheduled if timing info is missing
    }

    try {
      const now = getCurrentTimeInConfiguredTimezone();
      
      // Create datetime objects for round timing
      const roundStart = this.createRoundDateTime(round.date, round.start_time);
      const roundEnd = this.createRoundDateTime(round.date, round.end_time);
      
      // If round spans multiple days, adjust end time
      if (roundEnd <= roundStart) {
        // Round ends next day
        roundEnd.setDate(roundEnd.getDate() + 1);
      }
      
      // Calculate status based on current time
      if (now < roundStart) {
        return 'SCHEDULED';
      } else if (now >= roundStart && now <= roundEnd) {
        return 'ACTIVE';
      } else {
        return 'COMPLETED';
      }
    } catch (error) {
      console.error('Error calculating round status:', error);
      return 'SCHEDULED'; // Default to scheduled on error
    }
  }

  /**
   * Create a datetime object from date and time strings
   * @param {string} date - Date in YYYY-MM-DD format or ISO string
   * @param {string} time - Time in HH:mm format
   * @returns {Date} - Combined datetime object
   */
  createRoundDateTime(date, time) {
    try {
      let year, month, day;
      
      // Ensure date is a string and handle different formats
      const dateStr = typeof date === 'string' ? date : String(date);
      
      // Handle both ISO date strings and YYYY-MM-DD format
      if (dateStr.includes && (dateStr.includes('T') || dateStr.includes('Z'))) {
        // ISO date string - extract just the date part
        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) {
          throw new Error(`Invalid date format: ${dateStr}`);
        }
        year = dateObj.getFullYear();
        month = dateObj.getMonth() + 1;
        day = dateObj.getDate();
      } else {
        // YYYY-MM-DD format
        const dateParts = dateStr.split('-');
        if (dateParts.length !== 3) {
          throw new Error(`Invalid date format: ${dateStr}`);
        }
        [year, month, day] = dateParts.map(Number);
      }
      
      // Parse time (HH:mm)
      const timeStr = typeof time === 'string' ? time : String(time);
      const timeParts = timeStr.split(':');
      if (timeParts.length < 2) {
        throw new Error(`Invalid time format: ${timeStr}`);
      }
      const [hours, minutes] = timeParts.map(Number);
      
      // Validate parsed values
      if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
        throw new Error(`Invalid date/time values: ${dateStr} ${timeStr}`);
      }
      
      // Create date object in configured timezone
      const dateTime = new Date(year, month - 1, day, hours, minutes, 0);
      
      // Validate the created date
      if (isNaN(dateTime.getTime())) {
        throw new Error(`Invalid date/time combination: ${dateStr} ${timeStr}`);
      }
      
      return dateTime;
    } catch (error) {
      console.error('Error creating round datetime:', error);
      // Return current time as fallback
      return new Date();
    }
  }

  /**
   * Get time remaining until round starts
   * @param {Object} round - Round object
   * @returns {Object} - Time remaining object
   */
  getTimeUntilStart(round) {
    if (!round.date || !round.start_time) {
      return null;
    }

    try {
      const now = getCurrentTimeInConfiguredTimezone();
      const roundStart = this.createRoundDateTime(round.date, round.start_time);
      
      const diff = roundStart.getTime() - now.getTime();
      
      if (diff <= 0) {
        return { hasStarted: true, milliseconds: 0 };
      }
      
      return {
        hasStarted: false,
        milliseconds: diff,
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      };
    } catch (error) {
      console.error('Error calculating time until start:', error);
      return null;
    }
  }

  /**
   * Get time remaining until round ends
   * @param {Object} round - Round object
   * @returns {Object} - Time remaining object
   */
  getTimeUntilEnd(round) {
    if (!round.date || !round.end_time) {
      return null;
    }

    try {
      const now = getCurrentTimeInConfiguredTimezone();
      const roundEnd = this.createRoundDateTime(round.date, round.end_time);
      
      // If round spans multiple days, adjust end time
      if (round.start_time && round.start_time > round.end_time) {
        roundEnd.setDate(roundEnd.getDate() + 1);
      }
      
      const diff = roundEnd.getTime() - now.getTime();
      
      if (diff <= 0) {
        return { hasEnded: true, milliseconds: 0 };
      }
      
      return {
        hasEnded: false,
        milliseconds: diff,
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      };
    } catch (error) {
      console.error('Error calculating time until end:', error);
      return null;
    }
  }

  /**
   * Enhance round object with calculated status and timing info
   * @param {Object} round - Round object from database
   * @returns {Object} - Enhanced round object with calculated status
   */
  enhanceRoundWithStatus(round) {
    const calculatedStatus = this.calculateRoundStatus(round);
    const timeUntilStart = this.getTimeUntilStart(round);
    const timeUntilEnd = this.getTimeUntilEnd(round);
    
    return {
      ...round,
      calculatedStatus,
      timeUntilStart,
      timeUntilEnd,
      // Keep original status for reference
      originalStatus: round.status
    };
  }
}

export default new RoundStatusService();
