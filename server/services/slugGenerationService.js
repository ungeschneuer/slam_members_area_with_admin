/**
 * Slug Generation Service
 * 
 * Provides simple function-based slug generation for server routes.
 * Eliminates code duplication and ensures consistent behavior.
 */

import logger from '../config/logger.js';
import { generateSlug, generateUniqueSlug, validateSlugInput, generateRequestId } from '../utils/slugUtils.js';

/**
 * Generate a unique slug within a database transaction
 * @param {Object} client - Database client (from transaction)
 * @param {string} baseName - The base name to generate slug from
 * @param {string} tableName - The database table name
 * @param {string} requestId - Unique request identifier
 * @returns {Promise<string>} - The unique slug
 */
export async function generateUniqueSlugInTransaction(client, baseName, tableName, requestId) {
  try {
    // Validate and sanitize input
    const validatedName = validateSlugInput(baseName, `untitled-${tableName}`);
    
    // Generate base slug
    const baseSlug = generateSlug(validatedName);
    
    // Optimized query - only lock rows we actually need
    const existingSlugsResult = await client.query(
      `SELECT slug FROM ${tableName} WHERE slug = $1 OR slug LIKE $2 ORDER BY slug FOR UPDATE`,
      [baseSlug, `${baseSlug}-%`]
    );
    
    const existingSlugs = existingSlugsResult.rows.map(r => r.slug);
    
    // Generate unique slug with collision resistance
    const uniqueSlug = generateUniqueSlug(validatedName, existingSlugs, requestId);
    
    // Log successful generation
    logger.info('Slug generation completed', {
      operation: `CREATE_${tableName.toUpperCase()}`,
      originalName: baseName,
      validatedName,
      baseSlug,
      uniqueSlug,
      existingSlugCount: existingSlugs.length,
      requestId,
      tableName
    });
    
    return uniqueSlug;
  } catch (error) {
    // Simple error logging and re-throw
    logger.error('Slug generation failed', {
      operation: `CREATE_${tableName.toUpperCase()}`,
      originalName: baseName,
      requestId,
      tableName,
      error: error.message
    });
    
    throw error;
  }
}

/**
 * Generate request ID with proper fallback
 * @param {Object} req - Express request object
 * @returns {string} - Unique request ID
 */
export function generateRequestIdFromReq(req) {
  return generateRequestId(req);
}
