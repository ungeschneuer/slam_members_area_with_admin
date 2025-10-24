/**
 * ICS (iCalendar) utility functions for generating RFC 5545 compliant calendar files
 * Used for exporting timetable events to calendar applications
 */

/**
 * Format date and time to ICS datetime format (YYYYMMDDTHHMMSS)
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in HH:MM or HH:MM:SS format
 * @returns {string} - Formatted datetime string
 */
export function formatDateTimeForICS(date, time) {
  if (!date || !time) {
    throw new Error('Date and time are required for ICS generation');
  }

  // Ensure date is in YYYY-MM-DD format
  const dateStr = date.toString();
  let timeStr = time.toString();

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
  }

  // Normalize time format - handle both HH:MM and HH:MM:SS
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
    // Remove seconds if present
    timeStr = timeStr.substring(0, 5);
  }

  // Validate normalized time format
  if (!/^\d{2}:\d{2}$/.test(timeStr)) {
    throw new Error(`Invalid time format: ${timeStr}. Expected HH:MM or HH:MM:SS`);
  }

  // Combine date and time, removing separators and adding seconds
  const dateTime = dateStr.replace(/-/g, '') + 'T' + timeStr.replace(/:/g, '') + '00';
  
  return dateTime;
}

/**
 * Escape special characters in ICS text content
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
export function escapeICSText(text) {
  if (!text) return '';
  
  return text
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/,/g, '\\,')   // Escape commas
    .replace(/;/g, '\\;')   // Escape semicolons
    .replace(/\n/g, '\\n')  // Escape newlines
    .replace(/\r/g, '\\r'); // Escape carriage returns
}

/**
 * Wrap ICS lines at 75 characters with space continuation
 * @param {string} line - Line to wrap
 * @returns {string} - Wrapped line with CRLF endings
 */
export function wrapICSLine(line) {
  if (!line || line.length <= 75) {
    return line + '\r\n';
  }

  const lines = [];
  let remaining = line;
  
  while (remaining.length > 75) {
    // Find the last space before 75 characters
    let breakPoint = 75;
    for (let i = 74; i >= 0; i--) {
      if (remaining[i] === ' ') {
        breakPoint = i;
        break;
      }
    }
    
    lines.push(remaining.substring(0, breakPoint));
    remaining = ' ' + remaining.substring(breakPoint + 1);
  }
  
  if (remaining.length > 0) {
    lines.push(remaining);
  }
  
  return lines.join('\r\n') + '\r\n';
}

/**
 * Generate a unique UID for the event
 * @param {string} slug - Event slug
 * @returns {string} - Unique identifier
 */
export function generateUID(slug) {
  if (!slug) {
    slug = 'event-' + Date.now();
  }
  return `timetable-${slug}@slam25.de`;
}

/**
 * Calculate end time if not provided (default to start time + 1 hour)
 * @param {string} date - Event date
 * @param {string} startTime - Start time in HH:MM or HH:MM:SS format
 * @param {string} end_time - End time (optional) in HH:MM or HH:MM:SS format
 * @returns {string} - Formatted end datetime
 */
export function calculateEndDateTime(date, startTime, end_time) {
  if (end_time) {
    return formatDateTimeForICS(date, end_time);
  }

  // Normalize start time format
  let normalizedStartTime = startTime;
  if (/^\d{2}:\d{2}:\d{2}$/.test(startTime)) {
    normalizedStartTime = startTime.substring(0, 5);
  }

  // Default to start time + 1 hour
  const [hours, minutes] = normalizedStartTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + 60; // Add 1 hour
  
  const endHours = Math.floor(endMinutes / 60) % 24;
  const endMins = endMinutes % 60;
  
  const endTimeStr = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  
  // If we've crossed midnight, we need to adjust the date
  if (endMinutes >= 24 * 60) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];
    return formatDateTimeForICS(nextDayStr, endTimeStr);
  }
  
  return formatDateTimeForICS(date, endTimeStr);
}

/**
 * Generate complete ICS content for an event
 * @param {Object} event - Event data from timetable_entries
 * @returns {string} - Complete ICS file content
 */
export function generateICS(event) {
  if (!event) {
    throw new Error('Event data is required');
  }

  // Validate required fields
  if (!event.title) {
    throw new Error('Event title is required');
  }
  if (!event.date) {
    throw new Error('Event date is required');
  }
  if (!event.time) {
    throw new Error('Event time is required');
  }

  try {
    // Format start datetime
    const startDateTime = formatDateTimeForICS(event.date, event.time);
    
    // Calculate end datetime
    const endDateTime = calculateEndDateTime(event.date, event.time, event.end_time);
    
    // Generate UID
    const uid = generateUID(event.slug);
    
    // Current timestamp in UTC
    const now = new Date();
    const dtstamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    
    // Build description
    let description = '';
    if (event.description) {
      description += event.description;
    }
    if (event.detailed_description) {
      if (description) description += '\n\n';
      description += event.detailed_description;
    }
    
    // Escape text content
    const summary = escapeICSText(event.title);
    const location = escapeICSText(event.location || '');
    const descriptionText = escapeICSText(description);
    
    // Get event year for timezone transitions (more accurate than current year)
    const eventYear = new Date(event.date).getFullYear();
    
    // Build ICS content with proper timezone definition
    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SLAM25//Timetable Event//DE',
      'CALSCALE:GREGORIAN',
      'BEGIN:VTIMEZONE',
      'TZID:Europe/Berlin',
      'BEGIN:STANDARD',
      `DTSTART:${eventYear}1031T030000`,
      'TZOFFSETFROM:+0200',
      'TZOFFSETTO:+0100',
      'TZNAME:CET',
      'END:STANDARD',
      'BEGIN:DAYLIGHT',
      `DTSTART:${eventYear}0331T020000`,
      'TZOFFSETFROM:+0100',
      'TZOFFSETTO:+0200',
      'TZNAME:CEST',
      'END:DAYLIGHT',
      'END:VTIMEZONE',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}Z`,
      `CREATED:${dtstamp}Z`,
      `LAST-MODIFIED:${dtstamp}Z`,
      `DTSTART;TZID=Europe/Berlin:${startDateTime}`,
      `DTEND;TZID=Europe/Berlin:${endDateTime}`,
      `SUMMARY:${summary}`,
      `STATUS:CONFIRMED`
    ];
    
    // Add optional fields
    if (location) {
      icsLines.push(`LOCATION:${location}`);
    }
    
    if (descriptionText) {
      icsLines.push(`DESCRIPTION:${descriptionText}`);
    }
    
    icsLines.push('END:VEVENT');
    icsLines.push('END:VCALENDAR');
    
    // Wrap all lines and join
    const icsContent = icsLines.map(wrapICSLine).join('');
    
    return icsContent;
    
  } catch (error) {
    // Provide more specific error messages for common issues
    if (error.message.includes('Invalid date format')) {
      throw new Error('Ungültiges Datumsformat. Bitte überprüfen Sie das Event-Datum.');
    }
    if (error.message.includes('Invalid time format')) {
      throw new Error('Ungültiges Zeitformat. Bitte überprüfen Sie die Event-Zeit.');
    }
    if (error.message.includes('Event title is required')) {
      throw new Error('Event-Titel ist erforderlich.');
    }
    throw new Error(`Kalendereintrag konnte nicht erstellt werden: ${error.message}`);
  }
}

/**
 * Download ICS file using browser Blob API
 * @param {string} icsContent - ICS file content
 * @param {string} filename - Filename for download
 */
export async function downloadICS(icsContent, filename) {
  if (!icsContent) {
    throw new Error('ICS content is required for download');
  }

  let url = null;
  
  try {
    // Ensure filename has .ics extension
    const finalFilename = filename && filename.endsWith('.ics') ? filename : `${filename || 'event'}.ics`;
    
    // Debug logging removed for production
    
    // Create blob with proper MIME type for calendar files
    const blob = new Blob([icsContent], { 
      type: 'text/calendar;charset=utf-8' 
    });
    
    // Method 1: Try modern download API first
    if (window.showSaveFilePicker) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: finalFilename,
          types: [{
            description: 'Calendar files',
            accept: {
              'text/calendar': ['.ics']
            }
          }]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (error) {
        // File System Access API not available, falling back to blob download
      }
    }
    
    // Method 2: Fallback to blob URL download
    url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    
    // Set all necessary attributes for proper download
    link.style.display = 'none';
    link.setAttribute('download', finalFilename);
    link.setAttribute('type', 'text/calendar');
    link.setAttribute('data-filename', finalFilename);
    
    // Add to DOM
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up immediately after download
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    
  } catch (error) {
    // Provide user-friendly error messages
    if (error.message.includes('ICS content is required')) {
      throw new Error('Kalenderinhalt ist leer. Bitte versuchen Sie es erneut.');
    }
    throw new Error(`Download fehlgeschlagen: ${error.message}`);
  } finally {
    // Always clean up URL to prevent memory leaks
    if (url) {
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * Generate and download ICS file for an event
 * @param {Object} event - Event data
 * @param {string} filename - Optional filename (defaults to event slug)
 */
export async function generateAndDownloadICS(event, filename) {
  try {
    const icsContent = generateICS(event);
    // Ensure filename has .ics extension and uses event slug
    const baseFilename = filename || event.slug || 'event';
    const downloadFilename = baseFilename.endsWith('.ics') ? baseFilename : `${baseFilename}.ics`;
    
    // Debug logging removed for production
    
    await downloadICS(icsContent, downloadFilename);
  } catch (error) {
    // Re-throw with user-friendly message
    throw new Error(`Kalendereintrag konnte nicht heruntergeladen werden: ${error.message}`);
  }
}

export default {
  formatDateTimeForICS,
  escapeICSText,
  wrapICSLine,
  generateUID,
  calculateEndDateTime,
  generateICS,
  downloadICS,
  generateAndDownloadICS
};