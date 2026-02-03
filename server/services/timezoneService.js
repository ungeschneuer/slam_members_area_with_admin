/**
 * Timezone Configuration Service
 * Manages timezone settings for the application
 * Uses environment variable APP_TIMEZONE for configuration
 */

/**
 * Get the configured timezone for the application
 * @returns {string} - Timezone identifier from environment variable
 */
export function getConfiguredTimezone() {
  return process.env.APP_TIMEZONE || 'Europe/Berlin';
}


/**
 * Get list of supported timezones
 * @returns {Array} - Array of timezone objects with id, name, and offset
 */
export function getSupportedTimezones() {
  return [
    { id: 'Europe/Berlin', name: 'Berlin (CET/CEST)', offset: '+01:00/+02:00' },
    { id: 'Europe/London', name: 'London (GMT/BST)', offset: '+00:00/+01:00' },
    { id: 'Europe/Paris', name: 'Paris (CET/CEST)', offset: '+01:00/+02:00' },
    { id: 'Europe/Madrid', name: 'Madrid (CET/CEST)', offset: '+01:00/+02:00' },
    { id: 'Europe/Rome', name: 'Rome (CET/CEST)', offset: '+01:00/+02:00' },
    { id: 'Europe/Amsterdam', name: 'Amsterdam (CET/CEST)', offset: '+01:00/+02:00' },
    { id: 'Europe/Vienna', name: 'Vienna (CET/CEST)', offset: '+01:00/+02:00' },
    { id: 'Europe/Zurich', name: 'Zurich (CET/CEST)', offset: '+01:00/+02:00' },
    { id: 'America/New_York', name: 'New York (EST/EDT)', offset: '-05:00/-04:00' },
    { id: 'America/Los_Angeles', name: 'Los Angeles (PST/PDT)', offset: '-08:00/-07:00' },
    { id: 'Asia/Tokyo', name: 'Tokyo (JST)', offset: '+09:00' },
    { id: 'Asia/Shanghai', name: 'Shanghai (CST)', offset: '+08:00' },
    { id: 'Australia/Sydney', name: 'Sydney (AEST/AEDT)', offset: '+10:00/+11:00' },
    { id: 'UTC', name: 'UTC', offset: '+00:00' }
  ];
}

/**
 * Format time in the specified timezone
 * @param {Date} date - Date to format
 * @param {string} timezone - Timezone identifier
 * @param {string} format - Format string (default: 'yyyy-MM-dd HH:mm')
 * @returns {string} - Formatted time string
 */
export function formatTimeInTimezone(date, timezone = 'Europe/Berlin', format = 'yyyy-MM-dd HH:mm') {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(date);

  // Helper function to safely extract part value
  const getPart = (type) => {
    const part = parts.find(p => p.type === type);
    if (!part) {
      throw new Error(`Date part '${type}' not found in formatted date`);
    }
    return part.value;
  };

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');
  
  return format
    .replace('yyyy', year)
    .replace('MM', month)
    .replace('dd', day)
    .replace('HH', hour)
    .replace('mm', minute);
}

/**
 * Get current time in the configured timezone
 * @returns {Date} - Current time in configured timezone
 */
export function getCurrentTimeInConfiguredTimezone() {
  const timezone = getConfiguredTimezone();
  const now = new Date();
  
  // Use a simpler approach: get the current time and format it in the target timezone
  // This gives us the correct local time in the configured timezone
  const timeInTimezone = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  
  return timeInTimezone;
}

/**
 * Convert time from one timezone to another
 * @param {Date} date - Date to convert
 * @param {string} fromTimezone - Source timezone
 * @param {string} toTimezone - Target timezone
 * @returns {Date} - Converted date
 */
export function convertTimezone(date, fromTimezone, toTimezone) {
  // Create a date in the source timezone
  const sourceFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: fromTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const sourceParts = sourceFormatter.formatToParts(date);

  // Helper function to safely extract part value
  const getSourcePart = (type) => {
    const part = sourceParts.find(p => p.type === type);
    if (!part) {
      throw new Error(`Source date part '${type}' not found`);
    }
    return part.value;
  };

  const sourceDate = new Date(
    `${getSourcePart('year')}-${getSourcePart('month')}-${getSourcePart('day')}T${getSourcePart('hour')}:${getSourcePart('minute')}:${getSourcePart('second')}`
  );
  
  // Convert to target timezone
  const targetFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: toTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const targetParts = targetFormatter.formatToParts(sourceDate);

  // Helper function to safely extract part value
  const getTargetPart = (type) => {
    const part = targetParts.find(p => p.type === type);
    if (!part) {
      throw new Error(`Target date part '${type}' not found`);
    }
    return part.value;
  };

  return new Date(
    `${getTargetPart('year')}-${getTargetPart('month')}-${getTargetPart('day')}T${getTargetPart('hour')}:${getTargetPart('minute')}:${getTargetPart('second')}`
  );
}
