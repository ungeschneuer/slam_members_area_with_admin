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
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  const hour = parts.find(p => p.type === 'hour').value;
  const minute = parts.find(p => p.type === 'minute').value;
  
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
  const sourceDate = new Date(
    `${sourceParts.find(p => p.type === 'year').value}-${sourceParts.find(p => p.type === 'month').value}-${sourceParts.find(p => p.type === 'day').value}T${sourceParts.find(p => p.type === 'hour').value}:${sourceParts.find(p => p.type === 'minute').value}:${sourceParts.find(p => p.type === 'second').value}`
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
  return new Date(
    `${targetParts.find(p => p.type === 'year').value}-${targetParts.find(p => p.type === 'month').value}-${targetParts.find(p => p.type === 'day').value}T${targetParts.find(p => p.type === 'hour').value}:${targetParts.find(p => p.type === 'minute').value}:${targetParts.find(p => p.type === 'second').value}`
  );
}
