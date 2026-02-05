import logger from '../config/logger.js';

/**
 * Format a date to YYYY-MM-DD format
 * @param {string|Date} dateInput - The date to format
 * @returns {string|null} Formatted date or original value if invalid
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return dateInput;
  const dt = new Date(dateInput);
  if (Number.isNaN(dt.getTime())) return dateInput;
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format a time to HH:mm format
 * @param {string} timeInput - The time to format
 * @param {string} context - Context for logging purposes
 * @returns {string|null} Formatted time or original value if invalid
 */
export const formatTime = (timeInput, context = 'unknown') => {
  if (!timeInput) return timeInput;
  try {
    if (typeof timeInput === 'string' && /^\d{2}:\d{2}$/.test(timeInput)) return timeInput;
    const dt = new Date(`1970-01-01T${timeInput}Z`);
    if (Number.isNaN(dt.getTime())) {
      logger.warn('Time normalization: invalid date format', {
        originalValue: timeInput,
        result: 'returning_original',
        context
      });
      return timeInput;
    }
    const hh = String(dt.getUTCHours()).padStart(2, '0');
    const mm = String(dt.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch (error) {
    logger.error('Time normalization: unexpected error', {
      error: error.message,
      originalValue: timeInput,
      result: 'returning_original',
      context
    });
    return timeInput;
  }
};

/**
 * Normalize a timetable event by formatting date and time fields
 * @param {object} timetableEvent - The timetable event to normalize
 * @param {string} context - Context for logging purposes
 * @returns {object} Normalized timetable event
 */
export const normalizeTimetableEvent = (timetableEvent, context = 'timetable_event') => {
  if (!timetableEvent) return timetableEvent;
  return {
    ...timetableEvent,
    date: formatDate(timetableEvent.date),
    time: formatTime(timetableEvent.time, context)
  };
};
