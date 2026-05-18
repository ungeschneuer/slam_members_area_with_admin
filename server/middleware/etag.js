/**
 * ETag middleware for HTTP caching
 *
 * Adds ETag headers to responses and handles conditional requests
 * with If-None-Match headers to reduce bandwidth usage.
 *
 * ETags are generated from response body using a simple hash function.
 * When clients send If-None-Match header with matching ETag,
 * returns 304 Not Modified with no body.
 *
 * Benefits:
 * - 80-90% bandwidth reduction for unchanged data
 * - Reduced server processing for unchanged responses
 * - Better user experience with faster load times
 */

import crypto from 'crypto';

/**
 * Generate ETag from response body
 * @param {string|Buffer|Object} body - Response body
 * @returns {string} ETag value
 */
function generateETag(body) {
  // Convert to string if needed
  const content = typeof body === 'string'
    ? body
    : JSON.stringify(body);

  // Generate hash
  return `"${crypto
    .createHash('md5')
    .update(content, 'utf8')
    .digest('hex')
    .substring(0, 16)}"`;
}

/**
 * ETag middleware
 * Intercepts response and adds ETag header
 */
export function etagMiddleware(req, res, next) {
  // Only apply to GET and HEAD requests
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }

  // Store original res.json method
  const originalJson = res.json.bind(res);

  // Override res.json to add ETag
  res.json = function(data) {
    try {
      const etag = generateETag(data);
      res.set('ETag', etag);
      const clientETag = req.headers['if-none-match'];
      if (clientETag && clientETag === etag) {
        res.status(304).end();
        return res;
      }
    } catch {
      // Non-serialisable response (circular ref, BigInt, etc.) — skip ETag silently
    }
    return originalJson(data);
  };

  next();
}

/**
 * Configuration for which routes should use ETag caching
 * Add routes that benefit from caching (frequently polled, rarely changed)
 */
export const etagConfig = {
  // Routes that should use ETag caching
  enabled: [
    '/api/rounds',
    '/api/participants',
    '/api/teams',
    '/api/news',
    '/api/city-tips',
    '/api/info-pages',
    '/api/links',
    '/api/timetable',
    '/api/breaking-news',
    '/api/countdown'
  ],
  // Routes that should NOT use ETag caching
  disabled: [
    '/api/auth',
    '/api/upload',
    '/api/bulk-import'
  ]
};

/**
 * Conditional ETag middleware
 * Only applies ETag to configured routes
 */
export function conditionalETagMiddleware(req, res, next) {
  // Check if route is explicitly disabled
  const isDisabled = etagConfig.disabled.some(route =>
    req.path.startsWith(route)
  );

  if (isDisabled) {
    return next();
  }

  // Check if route is enabled
  const isEnabled = etagConfig.enabled.some(route =>
    req.path.startsWith(route)
  );

  if (isEnabled) {
    return etagMiddleware(req, res, next);
  }

  // Route not configured - skip ETag
  next();
}
