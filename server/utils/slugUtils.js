/**
 * Server-side utility functions for generating and managing slugs
 * This file provides slug utilities specifically for server use
 */

import logger from '../config/logger.js';

// German and English stopwords to remove for cleaner slugs
const STOPWORDS = new Set([
  // German stopwords
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'eines',
  'und', 'oder', 'aber', 'sondern', 'doch', 'jedoch', 'denn', 'weil', 'da', 'wenn',
  'als', 'wie', 'dass', 'ob', 'damit', 'während', 'bevor', 'nachdem', 'seit', 'bis',
  'von', 'zu', 'in', 'auf', 'an', 'mit', 'für', 'über', 'unter', 'durch', 'gegen',
  'ohne', 'um', 'bis', 'seit', 'während', 'trotz', 'wegen', 'statt', 'anstatt',
  'ist', 'sind', 'war', 'waren', 'wird', 'werden', 'haben', 'hat', 'hatte', 'hatten',
  'kann', 'können', 'konnte', 'konnten', 'muss', 'müssen', 'musste', 'mussten',
  'soll', 'sollen', 'sollte', 'sollten', 'darf', 'dürfen', 'durfte', 'durften',
  'will', 'wollen', 'wollte', 'wollten', 'mag', 'mögen', 'mochte', 'mochten',
  // English stopwords
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with'
]);

/**
 * Generate a unique request ID for tracking and collision resistance
 * @param {Object} req - Express request object
 * @returns {string} - Unique request ID
 */
export function generateRequestId(req) {
  return req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate and sanitize input for slug generation
 * @param {any} input - The input to validate
 * @param {string} fallback - Fallback value if input is invalid
 * @returns {string} - Validated and sanitized input
 */
export function validateSlugInput(input, fallback = 'untitled') {
  if (!input || typeof input !== 'string') return fallback;
  
  // Enhanced sanitization to prevent XSS
  const sanitized = input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick, onload, etc.)
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .trim();
  
  if (sanitized.length === 0) return fallback;
  
  // Add length validation to prevent memory issues
  if (sanitized.length > 1000) {
    logger.warn('Input too long, truncating', { 
      originalLength: sanitized.length,
      context: 'slug_validation'
    });
    return sanitized.substring(0, 1000).trim();
  }
  
  return sanitized;
}

/**
 * Normalize German characters to their ASCII equivalents
 * @param {string} text - The text to normalize
 * @returns {string} - The normalized text
 */
export function normalizeGermanChars(text) {
  return text
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue');
}

/**
 * Remove stopwords from text for cleaner slugs
 * @param {string} text - The text to process
 * @returns {string} - The text with stopwords removed
 */
function removeStopwordsHelper(text) {
  return text
    .split(' ')
    .filter(word => word.length > 0 && !STOPWORDS.has(word.toLowerCase()))
    .join(' ');
}

/**
 * Intelligently truncate text to specified length
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
function intelligentTruncate(text, maxLength = 50) {
  if (text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace);
  }
  
  return truncated;
}

/**
 * Generate a URL-friendly slug from a string with improved logic
 * 
 * STANDARDIZED OPTIONS: All admin components use maxLength: 50 and removeStopwords: true
 * for consistent slug generation across the application.
 * 
 * @param {string} text - The text to convert to a slug
 * @param {Object} options - Options for slug generation
 * @param {number} options.maxLength - Maximum length of the slug (default: 50)
 * @param {boolean} options.removeStopwords - Whether to remove stopwords (default: true)
 * @param {boolean} options.preserveNumbers - Whether to preserve numbers (default: true)
 * @returns {string} - The generated slug
 */
export function generateSlug(text, options = {}) {
  if (!text) return '';
  
  // Default configuration
  const {
    maxLength = 50,
    removeStopwords = true,
    preserveNumbers = true
  } = options;
  
  let slug = text
    .toLowerCase()
    .trim();
  
  // Normalize German characters
  slug = normalizeGermanChars(slug);
  
  // Remove or replace special characters
  slug = slug
    .replace(/[^a-z0-9\s-]/g, ' ') // Replace special chars with spaces (including underscores)
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
  
  // Remove stopwords if enabled
  if (removeStopwords) {
    slug = removeStopwordsHelper(slug);
  }
  
  // Remove numbers if not preserving them
  if (!preserveNumbers) {
    slug = slug.replace(/\d+/g, '');
  }
  
  // Clean up spaces again after stopword removal
  slug = slug.replace(/\s+/g, ' ').trim();
  
  // Intelligent truncation
  slug = intelligentTruncate(slug, maxLength);
  
  // Convert to final slug format
  slug = slug
    .replace(/\s/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove multiple consecutive hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  
  return slug;
}

/**
 * Generate a unique slug by appending a number if needed
 * @param {string} baseName - The name to slugify
 * @param {Array<string>} existingSlugs - Array of existing slug strings
 * @param {string} requestId - Optional request ID for collision resistance
 * @returns {string} - The unique slug
 */
export function generateUniqueSlug(baseName, existingSlugs = [], requestId = null) {
  // Validate input first
  const validatedName = validateSlugInput(baseName, 'untitled');
  
  // Generate base slug from validated name
  const baseSlug = generateSlug(validatedName);
  
  // Graceful fallback for invalid slugs with collision resistance
  if (!baseSlug || baseSlug.length < 1) {
    const fallbackSlug = generateCollisionResistantFallback(existingSlugs, requestId);
    return fallbackSlug;
  }
  
  return ensureUniqueSlug(baseSlug, existingSlugs);
}

/**
 * Generate collision-resistant fallback slug
 * @param {Array<string>} existingSlugs - Array of existing slug strings
 * @param {string} requestId - Optional request ID for additional uniqueness
 * @returns {string} - Collision-resistant fallback slug
 */
function generateCollisionResistantFallback(existingSlugs = [], requestId = null) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const requestSuffix = requestId ? `-${requestId}` : '';
  const fallbackSlug = `untitled-${timestamp}-${random}${requestSuffix}`;
  
  return ensureUniqueSlug(fallbackSlug, existingSlugs);
}

/**
 * Ensure slug uniqueness by appending number if needed
 * @param {string} baseSlug - The base slug to make unique
 * @param {Array<string>} existingSlugs - Array of existing slug strings
 * @returns {string} - The unique slug
 */
function ensureUniqueSlug(baseSlug, existingSlugs) {
  // Use Set for O(1) lookup performance
  const existingSet = new Set(existingSlugs);
  let counter = 1;
  let uniqueSlug = baseSlug;
  
  while (existingSet.has(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
  
  return uniqueSlug;
}

/**
 * Validate slug format
 * @param {string} slug - The slug to validate
 * @returns {boolean} - True if valid slug format
 */
export function isValidSlug(slug) {
  if (!slug) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}