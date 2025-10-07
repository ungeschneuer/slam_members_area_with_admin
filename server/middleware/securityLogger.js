// Security Logger Middleware for SLAM25 Application
import crypto from 'crypto';
import logger, { securityLogger as loggerSecurityLogger } from '../config/logger.js';

// Sensitive data patterns to redact
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /jwt/i,
  /bearer/i,
  /credential/i
];

// Redact sensitive data from logs
const redactSensitiveData = (data) => {
  if (typeof data === 'string') {
    return data.replace(/("password":\s*"[^"]*")/gi, '"password": "[REDACTED]"')
               .replace(/("token":\s*"[^"]*")/gi, '"token": "[REDACTED]"')
               .replace(/("secret":\s*"[^"]*")/gi, '"secret": "[REDACTED]"')
               .replace(/("key":\s*"[^"]*")/gi, '"key": "[REDACTED]"')
               .replace(/("authorization":\s*"[^"]*")/gi, '"authorization": "[REDACTED]"')
               .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]');
  }
  
  if (typeof data === 'object' && data !== null) {
    const redacted = { ...data };
    for (const key in redacted) {
      if (SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof redacted[key] === 'object') {
        redacted[key] = redactSensitiveData(redacted[key]);
      }
    }
    return redacted;
  }
  
  return data;
};

// Security event logger
const logSecurityEvent = (event, details = {}) => {
  const securityLog = {
    timestamp: new Date().toISOString(),
    event,
    details: redactSensitiveData(details),
    severity: getSeverityLevel(event),
    id: crypto.randomUUID()
  };
  
  // Use professional logging
  loggerSecurityLogger.info('Security Event', securityLog);
  
  return securityLog;
};

// Get severity level for security events
const getSeverityLevel = (event) => {
  const criticalEvents = [
    'AUTHENTICATION_FAILURE',
    'AUTHORIZATION_FAILURE',
    'SUSPICIOUS_ACTIVITY',
    'BRUTE_FORCE_ATTEMPT',
    'SQL_INJECTION_ATTEMPT',
    'XSS_ATTEMPT'
  ];
  
  const highEvents = [
    'RATE_LIMIT_EXCEEDED',
    'INVALID_TOKEN',
    'SESSION_EXPIRED',
    'ACCOUNT_LOCKOUT'
  ];
  
  if (criticalEvents.includes(event)) return 'CRITICAL';
  if (highEvents.includes(event)) return 'HIGH';
  return 'MEDIUM';
};

// Security middleware
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  const requestLog = {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };
  
  // Check for suspicious patterns
  if (isSuspiciousRequest(req)) {
    logSecurityEvent('SUSPICIOUS_ACTIVITY', {
      ...requestLog,
      reason: 'Suspicious request pattern detected'
    });
  }
  
  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Log security-relevant responses
    if (res.statusCode >= 400) {
      logSecurityEvent('HTTP_ERROR', {
        ...requestLog,
        statusCode: res.statusCode,
        responseTime,
        response: redactSensitiveData(data)
      });
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Detect suspicious request patterns
const isSuspiciousRequest = (req) => {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /onload=/i,
    /onerror=/i,
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /update\s+set/i,
    /exec\s*\(/i,
    /eval\s*\(/i,
    /\.\.\//,
    /\.\.\\/,
    /%00/,
    /%0a/,
    /%0d/
  ];
  
  const url = req.url.toLowerCase();
  const userAgent = (req.get('User-Agent') || '').toLowerCase();
  const body = JSON.stringify(req.body || {}).toLowerCase();
  
  return suspiciousPatterns.some(pattern => 
    pattern.test(url) || pattern.test(userAgent) || pattern.test(body)
  );
};

// Authentication failure logger
const logAuthFailure = (req, reason, details = {}) => {
  logSecurityEvent('AUTHENTICATION_FAILURE', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    reason,
    details: redactSensitiveData(details),
    timestamp: new Date().toISOString()
  });
};

// Authorization failure logger
const logAuthzFailure = (req, user, resource, action) => {
  logSecurityEvent('AUTHORIZATION_FAILURE', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: user ? user.id : 'anonymous',
    resource,
    action,
    timestamp: new Date().toISOString()
  });
};

// Rate limit logger
const logRateLimit = (req, limit, window) => {
  logSecurityEvent('RATE_LIMIT_EXCEEDED', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    limit,
    window,
    endpoint: req.path,
    timestamp: new Date().toISOString()
  });
};

// Brute force detection
const bruteForceAttempts = new Map();

const detectBruteForce = (req, identifier) => {
  const key = `${req.ip}:${identifier}`;
  const now = Date.now();
  const window = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;
  
  if (!bruteForceAttempts.has(key)) {
    bruteForceAttempts.set(key, []);
  }
  
  const attempts = bruteForceAttempts.get(key);
  const recentAttempts = attempts.filter(time => now - time < window);
  
  if (recentAttempts.length >= maxAttempts) {
    logSecurityEvent('BRUTE_FORCE_ATTEMPT', {
      ip: req.ip,
      identifier,
      attempts: recentAttempts.length,
      timestamp: new Date().toISOString()
    });
    return true;
  }
  
  attempts.push(now);
  bruteForceAttempts.set(key, attempts);
  return false;
};

// Clean up old brute force records
setInterval(() => {
  const now = Date.now();
  const window = 15 * 60 * 1000;
  
  for (const [key, attempts] of bruteForceAttempts.entries()) {
    const recentAttempts = attempts.filter(time => now - time < window);
    if (recentAttempts.length === 0) {
      bruteForceAttempts.delete(key);
    } else {
      bruteForceAttempts.set(key, recentAttempts);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

export { 
  redactSensitiveData,
  logSecurityEvent, 
  securityLogger,
  logAuthFailure,
  logAuthzFailure,
  logRateLimit,
  detectBruteForce
};
