/**
 * Authentication Routes for SLAM25
 * Provides secure HTTP-only cookie authentication endpoints
 */

import express from 'express';
import bcryptjs from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';
import { generateToken, generateRefreshToken, verifyRefreshToken, revokeRefreshToken, setAuthCookie, clearAuthCookie, authenticate, adminMiddleware } from '../middleware/authMiddleware.js';
import { rateLimitConfig } from '../config/security.js';
import logger from '../config/logger.js';

const router = express.Router();

// Validation middleware
const validateLogin = [
  body('identifier')
    .trim()
    .notEmpty().withMessage('Username or email is required')
    .isLength({ min: 1, max: 255 }).withMessage('Invalid username or email length')
    .escape(), // Sanitize input
  body('password').isLength({ min: 6 })
];

// Login endpoint with cookie authentication
router.post('/login', rateLimitConfig.login, validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const { identifier, password, rememberMe = false } = req.body;

    // Find user by username or email (case-insensitive)
    const userResult = await executeQuery(
      'SELECT id, username, email, password_hash, role, is_active, first_name, last_name FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)',
      [identifier]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS' 
      });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ 
        error: 'Account deactivated',
        code: 'ACCOUNT_DEACTIVATED' 
      });
    }

    // Verify password
    const isValidPassword = await bcryptjs.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS' 
      });
    }

    // Generate token — include display name so /me never needs a DB round-trip
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.first_name || '',
      lastName: user.last_name || ''
    };

    const accessToken = generateToken(tokenPayload, rememberMe);
    const refreshToken = generateRefreshToken(user.id);

    // Set secure HTTP-only cookies
    setAuthCookie(res, accessToken, rememberMe);
    
    // Set refresh token cookie (longer expiration)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/'
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name || 'Admin',
        lastName: user.last_name || 'User',
        role: user.role
      },
      message: 'Login successful'
    });

  } catch (error) {
    logger.error('Login error:', error);
    logger.error('Login error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'LOGIN_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Token refresh endpoint
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }
    
    const refreshResult = verifyRefreshToken(refreshToken);
    
    if (!refreshResult.valid) {
      return res.status(401).json({
        success: false,
        error: refreshResult.error,
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    // Get user data
    const userResult = await executeQuery(
      'SELECT id, username, email, role, is_active FROM users WHERE id = $1',
      [refreshResult.userId]
    );
    
    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
        code: 'USER_INACTIVE'
      });
    }
    
    const user = userResult.rows[0];
    
    // Generate new access token
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    const newAccessToken = generateToken(tokenPayload, false); // Default expiration
    
    // Set new access token cookie
    setAuthCookie(res, newAccessToken, false);
    
    res.json({
      success: true,
      message: 'Token refreshed successfully'
    });
    
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'REFRESH_ERROR'
    });
  }
});

// Logout endpoint
router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.cookies?.authToken;
    const refreshToken = req.cookies?.refreshToken;
    
    // Clear authentication cookies and blacklist tokens
    clearAuthCookie(res, token);
    
    // Revoke refresh token
    if (refreshToken) {
      revokeRefreshToken(refreshToken);
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'LOGOUT_ERROR' 
    });
  }
});

// Get current user (simplified - use JWT payload directly)
router.get('/me', authenticate, async (req, res) => {
  try {
    // Use user data from JWT payload (already validated by middleware)
    res.json({
      success: true,
      user: {
        id: req.user.userId,
        username: req.user.username,
        email: req.user.email,
        firstName: req.user.firstName || '',
        lastName: req.user.lastName || '',
        role: req.user.role,
        pronouns: null,
        createdAt: null,
        lastLogin: null
      }
    });

  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'GET_USER_ERROR' 
    });
  }
});

export default router;
