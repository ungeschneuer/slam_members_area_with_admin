import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

/**
 * Middleware to generate and attach correlation IDs to requests
 * This enables request tracing across the entire system
 */
const correlationIdMiddleware = (req, res, next) => {
  // Generate correlation ID if not provided
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  
  // Attach to request for use in route handlers
  req.correlationId = correlationId;
  
  // Add to response headers for client tracking
  res.set('X-Correlation-ID', correlationId);
  
  // Add to logger context for this request
  req.logger = {
    info: (message, meta) => logger.info(`[${correlationId}] ${message}`, meta),
    error: (message, meta) => logger.error(`[${correlationId}] ${message}`, meta),
    warn: (message, meta) => logger.warn(`[${correlationId}] ${message}`, meta),
    debug: (message, meta) => logger.debug(`[${correlationId}] ${message}`, meta)
  };
  
  // Log request start with correlation ID
  req.logger.info('Request started', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  next();
};

export default correlationIdMiddleware;
