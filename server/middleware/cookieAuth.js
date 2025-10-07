/**
 * Cookie-Based Authentication Middleware for SLAM25
 * Provides secure HTTP-only cookie authentication
 */

import jwt from 'jsonwebtoken';
import { executeQuery } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'slam25_super_secret_key_2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const COOKIE_NAME = 'slam25_auth';
const COOKIE_OPTIONS = {
  httpOnly: true,           // Prevent XSS attacks
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict',      // CSRF protection
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
  domain: process.env.NODE_ENV === 'production' ? '.slam25.de' : undefined
};

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Set authentication cookie (simplified - single JWT cookie only)
export const setAuthCookie = (res, token, user) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    ...COOKIE_OPTIONS,
    secure: isProduction,
    maxAge: user.rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 7 days or 24 hours
  };

  res.cookie(COOKIE_NAME, token, cookieOptions);
};

// Clear authentication cookie (simplified - single cookie only)
export const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, { 
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.slam25.de' : undefined
  });
};

// Cookie-based authentication middleware
export const authenticateCookie = async (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required',
        code: 'MISSING_AUTH_COOKIE' 
      });
    }


    const decoded = verifyToken(token);

    // Defensive payload validation
    if (!decoded || !decoded.role) {
      clearAuthCookie(res);
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    // If userId is malformed, treat as not found to avoid leaking internals
    if (typeof decoded.userId !== 'number') {
      clearAuthCookie(res);
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Simplified: Use JWT payload directly (no database lookup)
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (error) {
    console.error('Cookie authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      clearAuthCookie(res);
      return res.status(401).json({ 
        success: false,
        error: 'Session expired',
        code: 'TOKEN_EXPIRED' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      clearAuthCookie(res);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN' 
      });
    }

    clearAuthCookie(res);
    return res.status(401).json({ 
      success: false,
      error: 'Authentication error',
      code: 'AUTH_ERROR' 
    });
  }
};

// Role-based authorization middleware (works with cookies)
export const authorize = (...roles) => {
  return (req, res, next) => {
    const flatRoles = roles.flat();
    
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED' 
      });
    }

    if (!flatRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS' 
      });
    }

    next();
  };
};

export { generateToken, verifyToken };
