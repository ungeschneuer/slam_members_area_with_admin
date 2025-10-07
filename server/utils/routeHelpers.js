import express from 'express';
import optimizedQueryService from '../services/optimizedQueryService.js';
import { emitDataUpdate, emitAdminUpdate, emitCacheInvalidation } from '../services/websocketService.js';
import { authenticateCookie, authorize as authorizeCookie } from '../middleware/cookieAuth.js';
import { executeQuery } from '../config/database.js';
import logger from '../config/logger.js';
import { generateSlug, generateUniqueSlug } from './slugUtils.js';

/**
 * Performance timing helper
 */
function startTiming() {
  return process.hrtime.bigint();
}

function endTiming(startTime) {
  const endTime = process.hrtime.bigint();
  return Number(endTime - startTime) / 1000000;
}

/**
 * Enhanced Socket.io notification helper with TanStack Query integration
 */
function notifyDataUpdate(entityType, data = null, options = {}) {
  try { 
    optimizedQueryService.clearCache(); 
  } catch {}
  try { 
    // Emit data update with enhanced payload
    emitDataUpdate(entityType, data, options);
    emitAdminUpdate(entityType, data, options);
    
    // Emit cache invalidation for TanStack Query
    const queryKeys = getQueryKeysForEntity(entityType);
    if (queryKeys.length > 0) {
      emitCacheInvalidation(queryKeys, 'member');
      emitCacheInvalidation(queryKeys, 'admin');
    }
  } catch (error) {
    logger.error('Error in notifyDataUpdate:', error);
  }
}

/**
 * Get query keys for entity type for TanStack Query invalidation
 */
function getQueryKeysForEntity(entityType) {
  const queryKeyMap = {
    'participants': ['participants'],
    'rounds': ['rounds'],
    'news': ['news'],
    'timetable': ['timetable'],
    'city-tips': ['city-tips'],
    'info-pages': ['info-pages'],
    'links': ['links'],
    'schnellzugriff': ['schnellzugriff'],
    'breaking-news': ['news'],
    'countdown': ['countdown'],
  };
  
  return queryKeyMap[entityType] || [];
}

/**
 * Standardized success response helper
 */
function sendSuccessResponse(res, data, queryType, duration, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    data,
    meta: {
      queryType,
      duration: `${Math.round(duration)}ms`
    }
  });
}

/**
 * Standardized error response helper with enhanced error handling
 */
function sendErrorResponse(res, error, message, statusCode = 500) {
  // Prevent double response
  if (res.headersSent) {
    return;
  }
  
  // Enhanced error logging with context
  logger.error(message, { 
    error: error.message,
    stack: error.stack,
    code: error.code,
    constraint: error.constraint,
    detail: error.detail
  });
  
  // Handle specific error types
  let finalMessage = message;
  let finalStatusCode = statusCode;
  
  if (error.code === '23505') { // Unique constraint violation
    if (error.constraint && error.constraint.includes('slug')) {
      finalMessage = 'Slug already exists. Please choose a different slug.';
      finalStatusCode = 409; // Conflict
    } else {
      finalMessage = 'Duplicate entry. This item already exists.';
      finalStatusCode = 409;
    }
  } else if (error.code === '42P01') { // Undefined table
    finalMessage = 'Database table not found.';
    finalStatusCode = 500;
  } else if (error.code === '23503') { // Foreign key violation
    finalMessage = 'Cannot delete item: it is referenced by other records.';
    finalStatusCode = 409;
  } else if (error.code === '23502') { // Not null violation
    finalMessage = 'Required field is missing.';
    finalStatusCode = 400;
  } else if (error.code === '22001') { // String data too long
    finalMessage = 'Data too long for field.';
    finalStatusCode = 400;
  } else if (error.code === '22P02') { // Invalid text representation
    finalMessage = 'Invalid data format.';
    finalStatusCode = 400;
  }
  
  res.status(finalStatusCode).json({
    success: false,
    error: finalMessage,
    code: error.code,
    constraint: error.constraint
  });
}

/**
 * Standardized not found response helper
 */
function sendNotFoundResponse(res, entityName) {
  // Prevent double response
  if (res.headersSent) {
    return;
  }
  
  res.status(404).json({
    success: false,
    error: `${entityName} not found`
  });
}

/**
 * Generic CRUD operation wrapper
 */
async function executeCrudOperation(operation, query, params, entityType, queryType, res) {
  // Input validation
  if (!['create', 'read', 'update', 'delete'].includes(operation)) {
    return sendErrorResponse(res, new Error('Invalid operation'), 'Invalid operation type', 400);
  }
  
  if (typeof query !== 'string' || !Array.isArray(params)) {
    return sendErrorResponse(res, new Error('Invalid parameters'), 'Invalid query or parameters', 400);
  }
  
  if (!entityType || typeof entityType !== 'string') {
    return sendErrorResponse(res, new Error('Invalid entity type'), 'Invalid entity type', 400);
  }
  
  const startTime = startTiming();
  
  try {
    const result = await executeQuery(query, params);
    const duration = endTiming(startTime);
    
    // Handle empty results
    if (result.rows.length === 0) {
      if (operation === 'delete' || operation === 'update') {
        return sendNotFoundResponse(res, entityType);
      }
      if (operation === 'create') {
        return sendErrorResponse(res, new Error('No rows returned'), 'Failed to create entity', 500);
      }
    }
    
    // Validate result has data
    if (!result.rows[0]) {
      return sendErrorResponse(res, new Error('Invalid result'), 'Invalid database result', 500);
    }
    
    logger.info(`${entityType} ${operation} completed successfully`, {
      [`${entityType}Id`]: result.rows[0].id,
      duration: `${Math.round(duration)}ms`
    });
    
    notifyDataUpdate(entityType);
    sendSuccessResponse(res, result.rows[0], queryType, duration, operation === 'create' ? 201 : 200);
    
  } catch (error) {
    sendErrorResponse(res, error, `Failed to ${operation} ${entityType}`);
  }
}

/**
 * Generic CRUD operation wrapper with slug generation for any table
 * Includes race condition protection with retry logic
 */
async function executeSlugCrudOperation(operation, query, params, entityType, tableName, queryType, res, slugData = null) {
  // Input validation
  if (!['create', 'read', 'update', 'delete'].includes(operation)) {
    return sendErrorResponse(res, new Error('Invalid operation'), 'Invalid operation type', 400);
  }
  
  if (typeof query !== 'string' || !Array.isArray(params)) {
    return sendErrorResponse(res, new Error('Invalid parameters'), 'Invalid query or parameters', 400);
  }
  
  if (!entityType || typeof entityType !== 'string') {
    return sendErrorResponse(res, new Error('Invalid entity type'), 'Invalid entity type', 400);
  }
  
  if (!tableName || typeof tableName !== 'string') {
    return sendErrorResponse(res, new Error('Invalid table name'), 'Invalid table name', 400);
  }
  
  const startTime = startTiming();
  
  try {
    let finalParams = params;
    let finalQuery = query;
    
    // Handle slug generation for create and update operations
    if ((operation === 'create' || operation === 'update') && slugData) {
      const { title, slug, name } = slugData; // Support both 'title' and 'name' fields
      let finalSlug = slug;
      
      // Generate slug if not provided or if title/name changed
      if (!finalSlug || (title && !slug) || (name && !slug)) {
        const sourceText = title || name;
        if (sourceText) {
          finalSlug = generateSlug(sourceText);
        }
      }
      
      // Replace the slug parameter in the query
      finalParams = [...params];
      const slugIndex = finalParams.findIndex(param => param === slug);
      if (slugIndex !== -1) {
        finalParams[slugIndex] = finalSlug;
      }
    }
    
    // Execute with retry logic for unique constraint violations
    const result = await executeWithSlugRetry(finalQuery, finalParams, tableName, operation, slugData, 3);
    const duration = endTiming(startTime);
    
    // Handle empty results
    if (result.rows.length === 0) {
      if (operation === 'delete' || operation === 'update') {
        return sendNotFoundResponse(res, entityType);
      }
      if (operation === 'create') {
        return sendErrorResponse(res, new Error('No rows returned'), 'Failed to create entity', 500);
      }
    }
    
    // Validate result has data
    if (!result.rows[0]) {
      return sendErrorResponse(res, new Error('Invalid result'), 'Invalid database result', 500);
    }
    
    logger.info(`${entityType} ${operation} completed successfully`, {
      [`${entityType}Id`]: result.rows[0].id,
      duration: `${Math.round(duration)}ms`
    });
    
    notifyDataUpdate(entityType);
    sendSuccessResponse(res, result.rows[0], queryType, duration, operation === 'create' ? 201 : 200);
    
  } catch (error) {
    sendErrorResponse(res, error, `Failed to ${operation} ${entityType}`);
  }
}

/**
 * Execute query with retry logic for slug uniqueness conflicts
 */
async function executeWithSlugRetry(query, params, tableName, operation, slugData, maxRetries = 3) {
  let attempt = 0;
  let lastError = null;
  
  while (attempt < maxRetries) {
    try {
      return await executeQuery(query, params);
    } catch (error) {
      lastError = error;
      
      // Check if it's a unique constraint violation on slug
      if (error.code === '23505' && error.constraint && error.constraint.includes('slug')) {
        attempt++;
        
        logger.warn(`Slug conflict detected, attempt ${attempt}/${maxRetries}`, {
          tableName,
          operation,
          attempt,
          error: error.message
        });
        
        if (attempt >= maxRetries) {
          logger.error(`Slug conflict: Unable to generate unique slug after ${maxRetries} attempts`, {
            tableName,
            operation,
            attempts: attempt,
            originalError: error.message
          });
          throw new Error(`Slug conflict: Unable to generate unique slug after ${maxRetries} attempts. Please try a different title.`);
        }
        
        // Generate new unique slug for retry
        if (slugData && (operation === 'create' || operation === 'update')) {
          const { title, name } = slugData;
          const sourceText = title || name;
          if (sourceText) {
            const baseSlug = generateSlug(sourceText);
            const newSlug = `${baseSlug}-${attempt}`;
            
            logger.info(`Retrying with new slug: ${newSlug}`, {
              tableName,
              operation,
              attempt,
              originalSlug: baseSlug
            });
            
            // Update the slug parameter in the query
            const slugIndex = params.findIndex(param => param === slugData.slug);
            if (slugIndex !== -1) {
              params[slugIndex] = newSlug;
            }
          }
        }
        
        // Wait a short time before retry (exponential backoff)
        const delay = 100 * Math.pow(2, attempt - 1); // 100ms, 200ms, 400ms
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Re-throw non-slug related errors immediately
      throw error;
    }
  }
  
  // This should never be reached, but just in case
  throw lastError || new Error('Maximum retry attempts exceeded');
}

/**
 * Specialized CRUD operation wrapper for rounds with slug generation (backward compatibility)
 */
async function executeRoundCrudOperation(operation, query, params, entityType, queryType, res, slugData = null) {
  return executeSlugCrudOperation(operation, query, params, entityType, 'rounds', queryType, res, slugData);
}

/**
 * Helper function to safely stringify JSON data with fallback to empty array/object
 */
function safeJsonStringify(data, fallback = []) {
  if (data === null || data === undefined) {
    return JSON.stringify(fallback);
  }
  return JSON.stringify(data);
}

/**
 * Helper function to safely parse integer with fallback
 */
function safeParseInt(value, fallback = 0) {
  const parsed = parseInt(value);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Helper function to extract and validate query parameters
 */
function extractQueryParams(req, defaults = {}) {
  return {
    limit: safeParseInt(req.query.limit, defaults.limit || 50),
    offset: safeParseInt(req.query.offset, defaults.offset || 0),
    page: safeParseInt(req.query.page, defaults.page || 1),
    search: req.query.search || defaults.search || null,
    sort: req.query.sort || defaults.sort || null,
    order: req.query.order || defaults.order || 'asc'
  };
}

/**
 * Helper function to create admin middleware chain
 */
function adminMiddleware(roles = ['admin', 'organizer']) {
  return [authenticateCookie, authorizeCookie(roles)];
}

/**
 * Helper function to normalize common data patterns
 */
function normalizeData(data, schema = {}) {
  const normalized = {};
  
  for (const [key, config] of Object.entries(schema)) {
    const value = data[key];
    
    if (config.type === 'json') {
      normalized[key] = safeJsonStringify(value, config.fallback || []);
    } else if (config.type === 'int') {
      normalized[key] = safeParseInt(value, config.fallback || 0);
    } else if (config.type === 'string') {
      normalized[key] = value || config.fallback || '';
    } else if (config.type === 'boolean') {
      normalized[key] = Boolean(value);
    } else {
      normalized[key] = value;
    }
  }
  
  return normalized;
}

// Helper to normalize instagram input to a canonical profile URL
function normalizeInstagram(input) {
  if (!input) return null;
  let value = String(input).trim();
  value = value.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
  value = value.replace(/^@/, '');
  value = value.replace(/\/$/, '');
  if (!value) return null;
  return `https://instagram.com/${value}`;
}

export {
  startTiming,
  endTiming,
  notifyDataUpdate,
  getQueryKeysForEntity,
  sendSuccessResponse,
  sendErrorResponse,
  sendNotFoundResponse,
  executeCrudOperation,
  executeSlugCrudOperation,
  executeRoundCrudOperation,
  safeJsonStringify,
  safeParseInt,
  extractQueryParams,
  adminMiddleware,
  normalizeData,
  normalizeInstagram
};
