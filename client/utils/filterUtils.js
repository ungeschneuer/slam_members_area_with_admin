/**
 * Filter utility functions for content filtering
 * Provides functions to generate available filter options and validate filter values
 */

import { getRoleDisplayLabel } from '@shared/constants/roles.js';

/**
 * Get available filter options based on data and predefined options
 * @param {Array} data - Array of data items to filter
 * @param {Array} predefinedOptions - Array of predefined filter options
 * @param {string} field - Field name to extract from data items
 * @returns {Array} Available filter options
 */
export function getAvailableFilterOptions(data, predefinedOptions, field) {
  if (!Array.isArray(data) || !Array.isArray(predefinedOptions)) {
    return predefinedOptions || [];
  }

  if (data.length === 0) {
    // Return all predefined options if no data exists
    return predefinedOptions;
  }

  // Get unique values from data
  const existingValues = new Set(
    data
      .map(item => item[field])
      .filter(Boolean)
  );

  // Filter predefined options to only include those with existing data
  return predefinedOptions.filter(option => 
    option.id === 'all' || 
    option.value === 'all' || 
    existingValues.has(option.id) || 
    existingValues.has(option.value)
  );
}

/**
 * Get available filter options for published content only
 * @param {Array} data - Array of data items to filter
 * @param {Array} predefinedOptions - Array of predefined filter options
 * @param {string} field - Field name to extract from data items
 * @returns {Array} Available filter options for published content
 */
export function getAvailablePublishedFilterOptions(data, predefinedOptions, field) {
  if (!Array.isArray(data) || !Array.isArray(predefinedOptions)) {
    return predefinedOptions || [];
  }

  if (data.length === 0) {
    // Return all predefined options if no data exists
    return predefinedOptions;
  }

  // Get unique values from published data only
  const existingValues = new Set(
    data
      .filter(item => item.status === 'PUBLISHED' || item.is_published)
      .map(item => item[field])
      .filter(Boolean)
  );

  // Filter predefined options to only include those with existing published data
  return predefinedOptions.filter(option => 
    option.id === 'all' || 
    option.value === 'all' || 
    existingValues.has(option.id) || 
    existingValues.has(option.value)
  );
}

/**
 * Get available content filter options (alias for getAvailableFilterOptions)
 * @param {Array} data - Array of data items to filter
 * @param {Array} predefinedOptions - Array of predefined filter options
 * @param {string} field - Field name to extract from data items
 * @returns {Array} Available filter options
 */
export function getAvailableContentFilterOptions(data, predefinedOptions, field) {
  return getAvailableFilterOptions(data, predefinedOptions, field);
}

/**
 * Get available complex filter options with custom extraction function
 * @param {Array} data - Array of data items to filter
 * @param {Array} predefinedOptions - Array of predefined filter options
 * @param {Function} extractValue - Function to extract value from data item
 * @returns {Array} Available filter options
 */
export function getAvailableComplexFilterOptions(data, predefinedOptions, extractValue) {
  if (!Array.isArray(data) || !Array.isArray(predefinedOptions)) {
    return predefinedOptions || [];
  }

  if (data.length === 0) {
    // Return all predefined options if no data exists
    return predefinedOptions;
  }

  // Get unique values using custom extraction function
  const existingValues = new Set(
    data
      .map(extractValue)
      .filter(Boolean)
  );

  // Filter predefined options to only include those with existing data
  return predefinedOptions.filter(option => 
    option.id === 'all' || 
    option.value === 'all' || 
    existingValues.has(option.id) || 
    existingValues.has(option.value)
  );
}

/**
 * Validate filter value against available options
 * @param {string} currentValue - Current filter value
 * @param {Array} availableOptions - Array of available filter options
 * @returns {string} Valid filter value (current value if valid, 'all' if invalid)
 */
export function validateFilterValue(currentValue, availableOptions) {
  if (!Array.isArray(availableOptions) || availableOptions.length === 0) {
    return 'all';
  }

  if (!currentValue) {
    return 'all';
  }

  // Check if current value exists in available options
  const isValid = availableOptions.some(option => 
    option.id === currentValue || 
    option.value === currentValue
  );

  return isValid ? currentValue : 'all';
}

/**
 * Extract unique values from filtered data for a specific field
 * Used for single-pass cascading filter calculations
 * @param {Array} data - Array of data items to filter
 * @param {string} field - Field name to extract from data items
 * @param {Array} predefinedOptions - Array of predefined filter options
 * @returns {Array} Available options based on filtered data
 */
export function extractUniqueValues(data, field, predefinedOptions) {
  const uniqueValues = [...new Set(data.map(item => item[field]).filter(Boolean))].sort();
  
  // Return in options format if predefined options exist
  if (predefinedOptions) {
    return [
      predefinedOptions.find(opt => opt.id === 'all' || opt.value === 'all'),
      ...uniqueValues.map(value => 
        predefinedOptions.find(opt => opt.id === value || opt.value === value) || 
        { id: value, name: value }
      )
    ].filter(Boolean);
  }
  
  return uniqueValues;
}

/**
 * Extract unique complex values using custom extractor function
 * @param {Array} data - Array of data items to filter
 * @param {Function} extractFn - Function to extract value from data item
 * @param {Array} predefinedOptions - Array of predefined filter options
 * @returns {Array} Available options based on filtered data
 */
export function extractUniqueComplexValues(data, extractFn, predefinedOptions) {
  const values = new Set();
  data.forEach(item => {
    const extracted = extractFn(item);
    if (Array.isArray(extracted)) {
      extracted.forEach(v => v && values.add(v));
    } else if (extracted) {
      values.add(extracted);
    }
  });
  
  const uniqueValues = Array.from(values).sort();
  
  if (predefinedOptions) {
    return [
      predefinedOptions.find(opt => opt.id === 'all' || opt.value === 'all'),
      ...uniqueValues.map(value => 
        predefinedOptions.find(opt => opt.id === value || opt.value === value) || 
        { id: value, name: value }
      )
    ].filter(Boolean);
  }
  
  return uniqueValues;
}

/**
 * Extract roles from participant data, handling complex role logic
 * @param {Object} participant - Participant object
 * @returns {Array} Array of normalized roles
 */
export function extractParticipantRoles(participant) {
  if (!participant || participant.type !== 'participant') {
    return [];
  }
  
  let roles = [];
  
  if (Array.isArray(participant.roles)) {
    roles = participant.roles;
  } else if (participant.role) {
    // Handle comma-separated roles
    roles = participant.role.includes(',') 
      ? participant.role.split(',').map(r => r.trim())
      : [participant.role];
  }
  
  // Filter out Jury roles and normalize Supporter to Supporter*in
  return roles
    .filter(role => role !== 'Jury' && role !== 'Jury-Mitglied')
    .map(role => role === 'Supporter' ? 'Supporter*in' : role);
}

/**
 * Translate role values to German
 * @param {string} role - Role value to translate
 * @returns {string} German translation of the role
 */
export function translateRole(role) {
  // Use centralized role translation
  return getRoleDisplayLabel(role);
}

/**
 * Check if participant matches role filter
 * @param {Object} participant - Participant object
 * @param {string} roleFilter - Role filter value
 * @returns {boolean} Whether participant matches role filter
 */
export function matchesParticipantRole(participant, roleFilter) {
  if (roleFilter === 'all') return true;
  if (participant.type === 'team') return true; // Teams always match
  
  if (participant.type === 'participant') {
    const roles = extractParticipantRoles(participant);
    return roles.includes(roleFilter) || 
      (roleFilter === 'Supporter*in' && roles.includes('Supporter'));
  }
  
  return false;
}

/**
 * Get color classes for participant/team cards based on their primary role
 * @param {Object} item - Participant or team object
 * @returns {Object} Object with background, border, and text color classes
 */
export function getRoleBasedColors(item) {
  if (item.type === 'team') {
    return {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-primary/30 dark:border-primary/50',
      text: 'text-blue-900 dark:text-blue-100'
    };
  }

  // Extract primary role for participants
  let primaryRole = '';
  if (Array.isArray(item.roles)) {
    primaryRole = item.roles[0] || '';
  } else if (item.role) {
    const roles = item.role.includes(',') 
      ? item.role.split(',').map(r => r.trim())
      : [item.role];
    primaryRole = roles[0] || '';
  }

  // Normalize role names
  primaryRole = primaryRole === 'Supporter' ? 'Supporter*in' : primaryRole;

  // Define color schemes for different roles
  const roleColors = {
    'Wettbewerb-Teilnehmer*in': {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-900 dark:text-green-100'
    },
    'Supporter*in': {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800',
      text: 'text-orange-900 dark:text-orange-100'
    },
    'SLAM25-Team': {
      bg: 'bg-amber-50 dark:bg-amber-900/30',
      border: 'border-amber-400/60 dark:border-amber-500/60',
      text: 'text-amber-900 dark:text-amber-100',
      shadow: 'shadow-xl shadow-amber-300/40 dark:shadow-amber-800/30',
      glow: 'ring-2 ring-amber-400/60 dark:ring-amber-500/60',
      animation: 'animate-pulse-slow',
      premium: 'slam25-team-premium-bg'
    },
    'SLAM-MC': {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-900 dark:text-red-100'
    },
    'Organisator*in': {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      border: 'border-primary/30 dark:border-primary/50',
      text: 'text-indigo-900 dark:text-indigo-100'
    },
    'Moderator*in': {
      bg: 'bg-pink-50 dark:bg-pink-900/20',
      border: 'border-primary/30 dark:border-primary/50',
      text: 'text-pink-900 dark:text-pink-100'
    },
    'Techniker*in': {
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      border: 'border-gray-200 dark:border-gray-800',
      text: 'text-gray-900 dark:text-gray-100'
    },
    'Fotograf*in': {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-900 dark:text-yellow-100'
    },
    'Videograf*in': {
      bg: 'bg-cyan-50 dark:bg-cyan-900/20',
      border: 'border-primary/30 dark:border-primary/50',
      text: 'text-cyan-900 dark:text-cyan-100'
    },
    'Feature Artist': {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-900 dark:text-emerald-100'
    }
  };

  // Return role-specific colors or default colors
  return roleColors[primaryRole] || {
    bg: 'bg-white dark:bg-gray-700',
    border: 'border-gray-200 dark:border-gray-600',
    text: 'text-gray-900 dark:text-white'
  };
}