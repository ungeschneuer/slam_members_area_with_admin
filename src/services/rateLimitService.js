// Rate Limiting Service for SLAM25 Application
// Protects against abuse and ensures fair usage

class RateLimitService {
  constructor() {
    this.requests = new Map();
    this.limits = {
      // API endpoints
      'api/participants': { maxRequests: 100, windowMs: 60000 }, // 100 requests per minute
      'api/rounds': { maxRequests: 100, windowMs: 60000 },
      'api/news': { maxRequests: 50, windowMs: 60000 },
      'api/timetable': { maxRequests: 50, windowMs: 60000 },
      'api/city-tips': { maxRequests: 30, windowMs: 60000 },
      
      // Admin operations
      'admin/login': { maxRequests: 5, windowMs: 300000 }, // 5 attempts per 5 minutes
      'admin/create': { maxRequests: 20, windowMs: 60000 },
      'admin/update': { maxRequests: 50, windowMs: 60000 },
      'admin/delete': { maxRequests: 10, windowMs: 60000 },
      
      // General operations
      'search': { maxRequests: 30, windowMs: 60000 },
      'export': { maxRequests: 5, windowMs: 300000 },
      'upload': { maxRequests: 10, windowMs: 60000 }
    };
    
    this.blockedIPs = new Map();
    this.blockedUsers = new Map();
    
    // Cleanup old entries periodically
    this.startCleanupInterval();
  }

  // Check if request is allowed
  isAllowed(endpoint, identifier = null) {
    const limit = this.limits[endpoint];
    if (!limit) return true; // No limit set for this endpoint

    const key = identifier || 'anonymous';
    const now = Date.now();
    
    // Check if IP/user is blocked
    if (this.isBlocked(key)) {
      return false;
    }

    // Get or create request history
    if (!this.requests.has(key)) {
      this.requests.set(key, new Map());
    }
    
    const userRequests = this.requests.get(key);
    
    if (!userRequests.has(endpoint)) {
      userRequests.set(endpoint, []);
    }
    
    const requests = userRequests.get(endpoint);
    
    // Remove old requests outside the window
    const windowStart = now - limit.windowMs;
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit is exceeded
    if (validRequests.length >= limit.maxRequests) {
      // Block the user/IP temporarily
      this.blockUser(key, endpoint);
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    userRequests.set(endpoint, validRequests);
    
    return true;
  }

  // Record a request
  recordRequest(endpoint, identifier = null) {
    const key = identifier || 'anonymous';
    const now = Date.now();
    
    if (!this.requests.has(key)) {
      this.requests.set(key, new Map());
    }
    
    const userRequests = this.requests.get(key);
    
    if (!userRequests.has(endpoint)) {
      userRequests.set(endpoint, []);
    }
    
    const requests = userRequests.get(endpoint);
    requests.push(now);
  }

  // Block user/IP temporarily
  blockUser(identifier, endpoint) {
    const blockDuration = 300000; // 5 minutes
    const blockKey = `${identifier}_${endpoint}`;
    
    this.blockedIPs.set(blockKey, {
      timestamp: Date.now(),
      duration: blockDuration,
      reason: 'Rate limit exceeded'
    });
    
    console.warn(`Rate limit exceeded for ${identifier} on ${endpoint}`);
  }

  // Check if user/IP is blocked
  isBlocked(identifier) {
    for (const [key, block] of this.blockedIPs.entries()) {
      if (key.startsWith(identifier + '_')) {
        if (Date.now() - block.timestamp < block.duration) {
          return true;
        } else {
          // Remove expired block
          this.blockedIPs.delete(key);
        }
      }
    }
    return false;
  }

  // Get remaining requests for an endpoint
  getRemainingRequests(endpoint, identifier = null) {
    const limit = this.limits[endpoint];
    if (!limit) return { remaining: -1, resetTime: null };

    const key = identifier || 'anonymous';
    const now = Date.now();
    
    if (!this.requests.has(key)) {
      return { remaining: limit.maxRequests, resetTime: now + limit.windowMs };
    }
    
    const userRequests = this.requests.get(key);
    
    if (!userRequests.has(endpoint)) {
      return { remaining: limit.maxRequests, resetTime: now + limit.windowMs };
    }
    
    const requests = userRequests.get(endpoint);
    const windowStart = now - limit.windowMs;
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    return {
      remaining: Math.max(0, limit.maxRequests - validRequests.length),
      resetTime: windowStart + limit.windowMs
    };
  }

  // Get rate limit info for all endpoints
  getRateLimitInfo(identifier = null) {
    const info = {};
    
    for (const [endpoint, limit] of Object.entries(this.limits)) {
      const remaining = this.getRemainingRequests(endpoint, identifier);
      info[endpoint] = {
        limit: limit.maxRequests,
        window: limit.windowMs,
        remaining: remaining.remaining,
        resetTime: remaining.resetTime,
        blocked: this.isBlocked(identifier || 'anonymous')
      };
    }
    
    return info;
  }

  // Reset rate limits for a user/IP
  resetLimits(identifier) {
    this.requests.delete(identifier);
    
    // Remove blocks for this identifier
    for (const [key] of this.blockedIPs.entries()) {
      if (key.startsWith(identifier + '_')) {
        this.blockedIPs.delete(key);
      }
    }
  }

  // Add custom rate limit
  addRateLimit(endpoint, maxRequests, windowMs) {
    this.limits[endpoint] = { maxRequests, windowMs };
  }

  // Remove rate limit
  removeRateLimit(endpoint) {
    delete this.limits[endpoint];
  }

  // Get statistics
  getStats() {
    const stats = {
      totalRequests: 0,
      blockedRequests: 0,
      activeBlocks: 0,
      endpoints: {}
    };
    
    // Count total requests
    for (const userRequests of this.requests.values()) {
      for (const requests of userRequests.values()) {
        stats.totalRequests += requests.length;
      }
    }
    
    // Count active blocks
    stats.activeBlocks = this.blockedIPs.size;
    
    // Count requests per endpoint
    for (const [endpoint, limit] of Object.entries(this.limits)) {
      let endpointRequests = 0;
      for (const userRequests of this.requests.values()) {
        if (userRequests.has(endpoint)) {
          endpointRequests += userRequests.get(endpoint).length;
        }
      }
      
      stats.endpoints[endpoint] = {
        limit: limit.maxRequests,
        requests: endpointRequests
      };
    }
    
    return stats;
  }

  // Start cleanup interval
  startCleanupInterval() {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  // Cleanup old data
  cleanup() {
    const now = Date.now();
    
    // Cleanup old requests
    for (const [identifier, userRequests] of this.requests.entries()) {
      for (const [endpoint, requests] of userRequests.entries()) {
        const limit = this.limits[endpoint];
        if (limit) {
          const windowStart = now - limit.windowMs;
          const validRequests = requests.filter(timestamp => timestamp > windowStart);
          userRequests.set(endpoint, validRequests);
        }
      }
      
      // Remove empty user request maps
      if (userRequests.size === 0) {
        this.requests.delete(identifier);
      }
    }
    
    // Cleanup expired blocks
    for (const [key, block] of this.blockedIPs.entries()) {
      if (now - block.timestamp > block.duration) {
        this.blockedIPs.delete(key);
      }
    }
  }

  // Middleware for Express.js (if used in backend)
  middleware() {
    return (req, res, next) => {
      const endpoint = req.path;
      const identifier = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
      
      if (!this.isAllowed(endpoint, identifier)) {
        const remaining = this.getRemainingRequests(endpoint, identifier);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests, please try again later',
          remaining: remaining.remaining,
          resetTime: remaining.resetTime
        });
      }
      
      this.recordRequest(endpoint, identifier);
      
      // Add rate limit headers
      const remaining = this.getRemainingRequests(endpoint, identifier);
      res.set({
        'X-RateLimit-Limit': this.limits[endpoint]?.maxRequests || 'unlimited',
        'X-RateLimit-Remaining': remaining.remaining,
        'X-RateLimit-Reset': remaining.resetTime
      });
      
      next();
    };
  }
}

// Create singleton instance
const rateLimitService = new RateLimitService();

export default rateLimitService;
