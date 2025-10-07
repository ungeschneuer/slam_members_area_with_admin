/**
 * Server-side utility functions for generating and managing slugs
 * Re-exports shared utilities from client utils
 */

// Re-export shared utilities
export { 
  normalizeGermanChars, 
  generateSlug, 
  generateUniqueSlug,
  isValidSlug 
} from '../../client/utils/slugUtils.js';