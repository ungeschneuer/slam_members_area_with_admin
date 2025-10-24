/**
 * Slug Validation Utilities
 * 
 * Provides validation and sanitization for URL slugs to prevent
 * injection attacks and ensure consistent slug formatting.
 */

/**
 * Validate that a slug matches the expected format
 * Slugs should only contain lowercase letters, numbers, and hyphens
 * 
 * @param {string} slug - The slug to validate
 * @returns {boolean} True if slug is valid
 */
export function isValidSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    return false;
  }
  
  // Slug regex: lowercase letters, numbers, and hyphens only
  // Must start and end with alphanumeric, hyphens in between
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  
  // Check format
  if (!slugRegex.test(slug)) {
    return false;
  }
  
  // Check length constraints
  if (slug.length < 3 || slug.length > 255) {
    return false;
  }
  
  // Check for SQL injection patterns
  const sqlPatterns = [
    /drop|select|insert|update|delete|union|exec|execute/i,
    /--|;|\/\*|\*\//,  // SQL comment markers
    /['"]/,  // Quotes
    /\\/  // Backslashes
  ];
  
  for (const pattern of sqlPatterns) {
    if (pattern.test(slug)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validate slug and throw error if invalid
 * 
 * @param {string} slug - The slug to validate
 * @param {string} entityType - Type of entity (for error message)
 * @throws {Error} If slug is invalid
 */
export function validateSlug(slug, entityType = 'resource') {
  if (!isValidSlug(slug)) {
    const error = new Error(`Invalid ${entityType} slug format`);
    error.statusCode = 400;
    error.code = 'INVALID_SLUG';
    throw error;
  }
}

/**
 * Validate numeric ID
 * 
 * @param {string|number} id - The ID to validate
 * @returns {number} Validated numeric ID
 * @throws {Error} If ID is invalid
 */
export function validateNumericId(id, entityType = 'resource') {
  const numericId = parseInt(id, 10);
  
  if (isNaN(numericId) || numericId < 1 || numericId > 2147483647) {
    const error = new Error(`Invalid ${entityType} ID`);
    error.statusCode = 400;
    error.code = 'INVALID_ID';
    throw error;
  }
  
  return numericId;
}

/**
 * Validate that a parameter is either a valid ID or valid slug
 * 
 * @param {string} param - The parameter to validate
 * @returns {{ type: 'id'|'slug', value: number|string }} Validated parameter
 * @throws {Error} If parameter is invalid
 */
export function validateIdOrSlug(param, entityType = 'resource') {
  // Try parsing as numeric ID first
  const numericId = parseInt(param, 10);
  
  if (!isNaN(numericId)) {
    // It's a number, validate as ID
    return {
      type: 'id',
      value: validateNumericId(param, entityType)
    };
  }
  
  // Not a number, validate as slug
  validateSlug(param, entityType);
  return {
    type: 'slug',
    value: param
  };
}

/**
 * Sanitize slug input (lowercase, remove invalid characters)
 * 
 * @param {string} input - Raw input string
 * @returns {string} Sanitized slug
 */
export function sanitizeSlug(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')  // Replace invalid chars with hyphens
    .replace(/-+/g, '-')           // Replace multiple hyphens with single
    .replace(/^-|-$/g, '')         // Remove leading/trailing hyphens
    .substring(0, 255);            // Limit length
}

/**
 * Express middleware to validate slug parameter
 * 
 * @param {string} paramName - Name of the route parameter (default: 'slug')
 * @param {string} entityType - Type of entity for error messages
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.get('/news/:slug', validateSlugMiddleware('slug', 'news'), handler);
 */
export function validateSlugMiddleware(paramName = 'slug', entityType = 'resource') {
  return (req, res, next) => {
    const slug = req.params[paramName];
    
    try {
      validateSlug(slug, entityType);
      next();
    } catch (error) {
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message,
        code: error.code
      });
    }
  };
}

/**
 * Express middleware to validate ID or slug parameter
 * 
 * @param {string} paramName - Name of the route parameter (default: 'id')
 * @param {string} entityType - Type of entity for error messages
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.get('/news/:id', validateIdOrSlugMiddleware('id', 'news'), handler);
 */
export function validateIdOrSlugMiddleware(paramName = 'id', entityType = 'resource') {
  return (req, res, next) => {
    const param = req.params[paramName];
    
    try {
      const validated = validateIdOrSlug(param, entityType);
      // Attach validated value to request for use in handler
      req.validated = req.validated || {};
      req.validated[paramName] = validated;
      next();
    } catch (error) {
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message,
        code: error.code
      });
    }
  };
}

export default {
  isValidSlug,
  validateSlug,
  validateNumericId,
  validateIdOrSlug,
  sanitizeSlug,
  validateSlugMiddleware,
  validateIdOrSlugMiddleware
};
