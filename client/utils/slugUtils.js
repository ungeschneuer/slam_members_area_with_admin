/**
 * Shared utility functions for generating and managing slugs
 * This file consolidates slug utilities for both client and server use
 */

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
    .replace(/[^\w\s-]/g, ' ') // Replace special chars with spaces
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
 * @returns {string} - The unique slug
 */
export function generateUniqueSlug(baseName, existingSlugs = []) {
  if (!baseName) return '';
  
  // Generate base slug from name
  const baseSlug = generateSlug(baseName);
  
  // Validate generated slug
  if (!baseSlug || baseSlug.length < 3) {
    throw new Error(`Cannot generate valid slug from name: ${baseName}`);
  }
  
  // Check if slug already exists and append number if needed
  let counter = 1;
  let uniqueSlug = baseSlug;
  
  while (existingSlugs.includes(uniqueSlug)) {
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