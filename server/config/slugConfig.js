/**
 * Centralized slug configuration for consistent slug generation across the application
 */

export const SLUG_CONFIG = {
  // Maximum length for generated slugs
  maxLength: 50,
  
  // Whether to remove common stopwords (and, or, the, etc.)
  removeStopwords: true,
  
  // Whether to preserve numbers in slugs
  preserveNumbers: true,
  
  // Whether to preserve special characters (only hyphens are preserved by default)
  preserveSpecialChars: false,
  
  // Custom stopwords for German content
  stopwords: [
    'der', 'die', 'das', 'und', 'oder', 'aber', 'mit', 'von', 'zu', 'in', 'auf', 'für', 'an', 'bei',
    'the', 'and', 'or', 'but', 'with', 'from', 'to', 'in', 'on', 'for', 'at', 'by'
  ],
  
  // Characters to replace with hyphens
  replaceChars: {
    'ä': 'ae',
    'ö': 'oe', 
    'ü': 'ue',
    'ß': 'ss',
    ' ': '-',
    '_': '-',
    '.': '',
    ',': '',
    '!': '',
    '?': '',
    ':': '',
    ';': '',
    '(': '',
    ')': '',
    '[': '',
    ']': '',
    '{': '',
    '}': '',
    '"': '',
    "'": '',
    '`': ''
  },
  
  // Characters to remove completely
  removeChars: /[^a-z0-9-]/g,
  
  // Maximum retry attempts for unique slug generation
  maxRetryAttempts: 3,
  
  // Retry delay in milliseconds (exponential backoff)
  retryDelayMs: 100
};

/**
 * Get slug configuration for a specific content type
 * @param {string} contentType - The type of content (news, participants, rounds, etc.)
 * @returns {Object} Configuration object for the content type
 */
export function getSlugConfig(contentType) {
  const baseConfig = { ...SLUG_CONFIG };
  
  // Content-specific overrides
  switch (contentType) {
    case 'news':
      return {
        ...baseConfig,
        maxLength: 60, // News titles can be longer
        removeStopwords: true
      };
      
    case 'participants':
      return {
        ...baseConfig,
        maxLength: 40, // Names are typically shorter
        removeStopwords: false // Preserve all words in names
      };
      
    case 'rounds':
      return {
        ...baseConfig,
        maxLength: 45,
        removeStopwords: true
      };
      
    case 'timetable':
      return {
        ...baseConfig,
        maxLength: 50,
        removeStopwords: true
      };
      
    case 'city-tips':
      return {
        ...baseConfig,
        maxLength: 45,
        removeStopwords: true
      };
      
    case 'info-pages':
      return {
        ...baseConfig,
        maxLength: 55,
        removeStopwords: true
      };
      
    default:
      return baseConfig;
  }
}

/**
 * Validate slug format
 * @param {string} slug - The slug to validate
 * @returns {Object} Validation result with isValid and message
 */
export function validateSlugFormat(slug) {
  if (!slug || typeof slug !== 'string') {
    return { isValid: false, message: 'Slug is required' };
  }
  
  if (slug.length === 0) {
    return { isValid: false, message: 'Slug cannot be empty' };
  }
  
  if (slug.length > SLUG_CONFIG.maxLength) {
    return { isValid: false, message: `Slug cannot be longer than ${SLUG_CONFIG.maxLength} characters` };
  }
  
  // Check for valid characters (only lowercase letters, numbers, and hyphens)
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { isValid: false, message: 'Slug can only contain lowercase letters, numbers, and hyphens' };
  }
  
  // Check for consecutive hyphens
  if (slug.includes('--')) {
    return { isValid: false, message: 'Slug cannot contain consecutive hyphens' };
  }
  
  // Check for leading/trailing hyphens
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { isValid: false, message: 'Slug cannot start or end with hyphens' };
  }
  
  return { isValid: true, message: 'Valid slug format' };
}

/**
 * Get default slug configuration for form schemas
 * @returns {Object} Default configuration for Zod schemas
 */
export function getSlugSchemaConfig() {
  return {
    min: 1,
    max: SLUG_CONFIG.maxLength,
    regex: /^[a-z0-9-]+$/,
    message: {
      min: 'Slug ist erforderlich',
      max: `Slug darf maximal ${SLUG_CONFIG.maxLength} Zeichen lang sein`,
      regex: 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten'
    }
  };
}
