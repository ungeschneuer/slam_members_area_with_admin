// Route helpers
import { executeQuery } from '../config/database.js';
import logger from '../config/logger.js';

// Export executeQuery for use in routes
export { executeQuery };

// Performance timing helpers
export const startTiming = () => process.hrtime.bigint();

export const endTiming = (startTime) => {
  const endTime = process.hrtime.bigint();
  return Number(endTime - startTime) / 1000000; // Convert to milliseconds
};

// Safe timing wrapper to prevent scoping issues
export const withTiming = (fn) => {
  return async (req, res, next) => {
    const startTime = startTiming();
    
    try {
      await fn(req, res, next, startTime);
    } catch (error) {
      const duration = endTiming(startTime);
      logger.error('Route handler error', {
        error: error.message,
        duration: `${Math.round(duration)}ms`,
        url: req.url,
        method: req.method
      });
      throw error;
    }
  };
};

// Response helpers
export const sendSuccessResponse = (res, data, queryType, duration, statusCode = 200) => {
  if (res.headersSent) return;
  
  res.status(statusCode).json({
    success: true,
    data,
    meta: {
      queryType,
      duration: `${Math.round(duration)}ms`
    }
  });
};

export const sendErrorResponse = (res, error, message, statusCode = 500) => {
  if (res.headersSent) return;
  
  // Enhanced error logging with context
  const errorContext = {
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    code: error?.code,
    statusCode,
    timestamp: new Date().toISOString(),
    url: res.req?.url,
    method: res.req?.method,
    userAgent: res.req?.get('User-Agent'),
    ip: res.req?.ip
  };
  
  logger.error('API Error:', errorContext);
  
  // Map database errors to meaningful HTTP statuses
  let finalStatusCode = statusCode;
  let finalMessage = message || 'An error occurred';
  
  if (error?.code === '23505') {
    finalStatusCode = 409;
    const constraintMatch = error?.detail?.match(/Key \((.*?)\)/);
    const field = constraintMatch ? constraintMatch[1] : 'field';
    finalMessage = `A record with this ${field} already exists. Please use a different value.`;
  } else if (error?.code === '23503') {
    finalStatusCode = 409;
    finalMessage = 'Related resource not found (foreign key violation)';
  } else if (error?.code === '23502') {
    finalStatusCode = 400;
    finalMessage = 'Required field is missing (not null violation)';
  } else if (error?.code === '42P01') {
    finalStatusCode = 500;
    finalMessage = 'Database table not found';
  } else if (error?.code === '42703') {
    finalStatusCode = 500;
    finalMessage = 'Database column not found';
  } else if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout')) {
    finalStatusCode = 503;
    finalMessage = 'Database connection timeout - service temporarily unavailable';
  } else if (error?.code === 'ECONNREFUSED') {
    finalStatusCode = 503;
    finalMessage = 'Database connection refused - service temporarily unavailable';
  }
  
  res.status(finalStatusCode).json({
    success: false,
    error: finalMessage,
    code: error?.code || 'UNKNOWN_ERROR',
    timestamp: errorContext.timestamp
  });
};

export const sendNotFoundResponse = (res, entityName) => {
  if (res.headersSent) return;
  
  res.status(404).json({
    success: false,
    error: `${entityName} not found`
  });
};

// Data normalization helpers
export const normalizeData = (data, schema) => {
  const normalized = {};
  
  for (const [key, config] of Object.entries(schema)) {
    const value = data[key];
    
    switch (config.type) {
      case 'string':
        normalized[key] = value || config.fallback || '';
        break;
      case 'int':
        normalized[key] = parseInt(value) || config.fallback || 0;
        break;
      case 'number': {
        const n = Number(value);
        normalized[key] = (value !== undefined && value !== null && value !== '' && !isNaN(n))
          ? n
          : (config.fallback ?? 0);
        break;
      }
      case 'boolean':
        normalized[key] = Boolean(value);
        break;
      case 'json':
        // Accept already-parsed objects/arrays, parse strings, or fallback
        if (value === undefined || value === null) {
          normalized[key] = config.fallback || [];
        } else if (typeof value === 'string') {
          try {
            normalized[key] = value ? JSON.parse(value) : config.fallback || [];
          } catch {
            normalized[key] = config.fallback || [];
          }
        } else {
          normalized[key] = value;
        }
        break;
      default:
        normalized[key] = value || config.fallback;
    }
  }
  
  return normalized;
};

// Safe JSON stringify
export const safeJsonStringify = (data, fallback = '[]') => {
  try {
    return JSON.stringify(data || fallback);
  } catch {
    return fallback;
  }
};

// Safe integer parsing
export const safeParseInt = (value, fallback = 0) => {
  const parsed = parseInt(value);
  return isNaN(parsed) ? fallback : parsed;
};

// Enhanced CRUD operation helper with comprehensive validation
export const executeCrudOperation = async (operation, query, params, entityType, queryType, res) => {
  try {
    const startTime = startTiming();
    
    // Validate input parameters
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid query: query must be a non-empty string');
    }
    
    if (!Array.isArray(params)) {
      throw new Error('Invalid parameters: params must be an array');
    }
    
    // Execute query with timeout
    const result = await executeQuery(query, params);
    const duration = endTiming(startTime);
    
    // Validate result structure
    if (!result || typeof result !== 'object') {
      throw new Error('Database query returned invalid result structure');
    }
    
    if (!Array.isArray(result.rows)) {
      throw new Error('Database query result.rows is not an array');
    }
    
    // Handle different operation types
    if (operation === 'delete') {
      if (result.rows.length === 0) {
        return sendNotFoundResponse(res, entityType);
      }
      sendSuccessResponse(res, result.rows[0], queryType, duration, 200);
    } else if (operation === 'create') {
      if (result.rows.length === 0) {
        throw new Error('Create operation returned no data');
      }
      sendSuccessResponse(res, result.rows[0], queryType, duration, 201);
    } else if (operation === 'update') {
      if (result.rows.length === 0) {
        return sendNotFoundResponse(res, entityType);
      }
      sendSuccessResponse(res, result.rows[0], queryType, duration, 200);
    } else {
      // For read operations or unknown operations
      sendSuccessResponse(res, result.rows, queryType, duration, 200);
    }
    
  } catch (error) {
    // Enhanced error handling with specific database error mapping
    const errorContext = {
      operation,
      entityType,
      query: query.substring(0, 100) + '...', // Truncate for logging
      params: params.length,
      error: error.message,
      code: error.code
    };
    
    logger.error('CRUD Operation Failed:', errorContext);
    
    // Map specific database errors to meaningful HTTP statuses
    if (error.code === '23505') {
      return sendErrorResponse(res, error, `${entityType} already exists (unique constraint violation)`, 409);
    }
    if (error.code === '23503') {
      return sendErrorResponse(res, error, `Related resource not found for ${entityType} (foreign key violation)`, 409);
    }
    if (error.code === '23502') {
      return sendErrorResponse(res, error, `Required field is missing for ${entityType} (not null violation)`, 400);
    }
    if (error.code === '42P01') {
      return sendErrorResponse(res, error, `Database table not found for ${entityType}`, 500);
    }
    if (error.code === '42703') {
      return sendErrorResponse(res, error, `Database column not found for ${entityType}`, 500);
    }
    if (error.code === '23514') {
      return sendErrorResponse(res, error, `Check constraint violation for ${entityType}`, 400);
    }
    
    // Generic error handling
    sendErrorResponse(res, error, `Failed to ${operation} ${entityType}`);
  }
};
