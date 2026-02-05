// Authentication middleware
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { USER_PASSWORD_CONSTANTS, USER_AUTH_COOKIE_CONFIG } from '../constants/userPasswordConstants.js';
import logger from '../config/logger.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Simple in-memory token blacklist (for production, use Redis)
// Stores { token, expiresAt } to allow periodic cleanup
const tokenBlacklist = new Map();

// Refresh token storage (for production, use Redis)
const refreshTokens = new Map();

// Max entries to prevent unbounded growth even if cleanup fails
const MAX_BLACKLIST_SIZE = 10000;
const MAX_REFRESH_TOKENS = 5000;

// Periodic cleanup of expired tokens to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
setInterval(() => {
  try {
    const now = Date.now();
    let blacklistCleaned = 0;
    let refreshCleaned = 0;
    // Clean expired blacklisted tokens
    for (const [token, expiresAt] of tokenBlacklist) {
      if (expiresAt <= now) {
        tokenBlacklist.delete(token);
        blacklistCleaned++;
      }
    }
    // Clean expired refresh tokens
    for (const [token, data] of refreshTokens) {
      if (new Date() > data.expiresAt) {
        refreshTokens.delete(token);
        refreshCleaned++;
      }
    }
    if (blacklistCleaned > 0 || refreshCleaned > 0) {
      logger.info('Token cleanup completed', {
        blacklistCleaned,
        refreshCleaned,
        blacklistRemaining: tokenBlacklist.size,
        refreshRemaining: refreshTokens.size
      });
    }
  } catch (error) {
    logger.error('Token cleanup failed', { error: error.message });
  }
}, CLEANUP_INTERVAL_MS).unref();

// Generate JWT token
export const generateToken = (payload, rememberMe = false) => {
  const expiresIn = rememberMe ? '7d' : JWT_EXPIRES_IN;
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

// Generate refresh token
export const generateRefreshToken = (userId) => {
  const refreshToken = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  // Guard against unbounded growth
  if (refreshTokens.size >= MAX_REFRESH_TOKENS) {
    // Evict oldest entries to make room
    const entriesToRemove = Math.ceil(MAX_REFRESH_TOKENS * 0.1);
    const iter = refreshTokens.keys();
    for (let i = 0; i < entriesToRemove; i++) {
      const key = iter.next().value;
      if (key) refreshTokens.delete(key);
    }
    logger.warn('Refresh tokens reached max size, evicted oldest entries', {
      evicted: entriesToRemove,
      remaining: refreshTokens.size
    });
  }
  refreshTokens.set(refreshToken, {
    userId,
    expiresAt,
    createdAt: new Date()
  });
  
  logger.info('Refresh token generated', {
    userId,
    timestamp: new Date().toISOString()
  });
  
  return refreshToken;
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
  const tokenData = refreshTokens.get(token);
  
  if (!tokenData) {
    return { valid: false, error: 'Invalid refresh token' };
  }
  
  if (new Date() > tokenData.expiresAt) {
    refreshTokens.delete(token);
    return { valid: false, error: 'Refresh token expired' };
  }
  
  return { valid: true, userId: tokenData.userId };
};

// Revoke refresh token
export const revokeRefreshToken = (token) => {
  refreshTokens.delete(token);
  logger.info('Refresh token revoked', {
    timestamp: new Date().toISOString()
  });
};

// Verify JWT token with proper error handling
export const verifyToken = (token) => {
  // Check if token is blacklisted (Map: token -> expiresAt)
  if (tokenBlacklist.has(token) && tokenBlacklist.get(token) > Date.now()) {
    logger.warn('Blacklisted token attempted use', {
      timestamp: new Date().toISOString()
    });
    return { 
      valid: false, 
      error: 'TokenBlacklisted',
      blacklisted: true
    };
  }
  
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    // Log the specific error for security monitoring
    logger.warn('JWT verification failed', {
      error: error.name,
      message: error.message,
      timestamp: new Date().toISOString()
    });
    
    // Return error details for proper handling
    return { 
      valid: false, 
      error: error.name,
      expired: error.name === 'TokenExpiredError',
      invalid: error.name === 'JsonWebTokenError'
    };
  }
};

// Simple authentication middleware
export const authenticate = (req, res, next) => {
  const token = req.cookies?.authToken;
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  const decoded = verifyToken(token);
  
  // Handle token verification errors
  if (decoded && decoded.valid === false) {
    if (decoded.blacklisted) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }
    if (decoded.expired) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    if (decoded.invalid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    return res.status(401).json({ 
      success: false, 
      error: 'Token verification failed',
      code: 'TOKEN_VERIFICATION_FAILED'
    });
  }
  
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
  
  req.user = decoded;
  next();
};

// Simple admin authorization middleware
export const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  
  next();
};

// Combined admin middleware
export const adminMiddleware = () => [authenticate, authorizeAdmin];

// Set authentication cookie
export const setAuthCookie = (res, token, rememberMe = false) => {
  const maxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 7 days or 24 hours
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path: '/'
  });
};

// Blacklist a token (for logout security)
// Store with expiration to allow cleanup and prevent memory leaks
export const blacklistToken = (token) => {
  // Decode token to get expiration, default to 24h if decode fails
  let expiresAt;
  try {
    const decoded = jwt.decode(token);
    expiresAt = decoded?.exp ? decoded.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000;
  } catch {
    expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  }
  // Guard against unbounded growth
  if (tokenBlacklist.size >= MAX_BLACKLIST_SIZE) {
    // Evict oldest entries (first inserted) to make room
    const entriesToRemove = Math.ceil(MAX_BLACKLIST_SIZE * 0.1);
    const iter = tokenBlacklist.keys();
    for (let i = 0; i < entriesToRemove; i++) {
      const key = iter.next().value;
      if (key) tokenBlacklist.delete(key);
    }
    logger.warn('Token blacklist reached max size, evicted oldest entries', {
      evicted: entriesToRemove,
      remaining: tokenBlacklist.size
    });
  }
  tokenBlacklist.set(token, expiresAt);
  logger.info('Token blacklisted', {
    timestamp: new Date().toISOString()
  });
};

// Clear authentication cookie and blacklist token
export const clearAuthCookie = (res, token = null) => {
  // Blacklist the token if provided
  if (token) {
    blacklistToken(token);
  }
  
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
};

// User area authentication helpers
// Set user authentication cookie (14 days)
export const setUserAuthCookie = (res) => {
  res.cookie(USER_PASSWORD_CONSTANTS.COOKIE_NAME, USER_PASSWORD_CONSTANTS.COOKIE_VALUE, USER_AUTH_COOKIE_CONFIG);
};

// Clear user authentication cookie
export const clearUserAuthCookie = (res) => {
  res.clearCookie(USER_PASSWORD_CONSTANTS.COOKIE_NAME, USER_AUTH_COOKIE_CONFIG);
};

// Check if user is authenticated (admin OR user auth)
export const checkUserAuth = (req) => {
  // Check admin authentication first
  const adminToken = req.cookies?.authToken;
  if (adminToken) {
    const decoded = verifyToken(adminToken);
    // verifyToken returns the decoded JWT payload on success (no .valid property),
    // or { valid: false, ... } on failure. Check that it's not an error response.
    if (decoded && decoded.valid !== false && decoded.role === 'admin') {
      return true;
    }
  }
  
  // Check user authentication
  const userAuth = req.cookies?.[USER_PASSWORD_CONSTANTS.COOKIE_NAME];
  return userAuth === USER_PASSWORD_CONSTANTS.COOKIE_VALUE;
};
