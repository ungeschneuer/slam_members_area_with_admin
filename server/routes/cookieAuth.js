/**
 * Cookie-Based Authentication Routes for SLAM25
 * Provides secure HTTP-only cookie authentication endpoints
 */

import express from 'express';
import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';
// Removed: No longer need crypto for token hashing
import { generateToken, setAuthCookie, clearAuthCookie, authenticateCookie, authorize } from '../middleware/cookieAuth.js';

const router = express.Router();

// Removed: No longer need token hashing for database storage

// Validation middleware
const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
];

// Login endpoint with cookie authentication
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const { email, password, rememberMe = false } = req.body;

    // Find user by email (case-insensitive)
    const userResult = await executeQuery(
      'SELECT id, username, email, password_hash, role, is_active FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
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
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS' 
      });
    }

    // Generate token
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    const accessToken = generateToken(tokenPayload);

    // Simplified: No database session storage needed
    // JWT is self-contained and stateless

    // Set secure HTTP-only cookie
    setAuthCookie(res, accessToken, {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      rememberMe
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
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'LOGIN_ERROR' 
    });
  }
});

// Logout endpoint (simplified - no database session cleanup needed)
router.post('/logout', authenticateCookie, async (req, res) => {
  try {
    // Clear authentication cookie
    clearAuthCookie(res);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'LOGOUT_ERROR' 
    });
  }
});

// Get current user (simplified - use JWT payload directly)
router.get('/me', authenticateCookie, async (req, res) => {
  try {
    // Use user data from JWT payload (already validated by middleware)
    res.json({
      success: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        firstName: 'Admin', // Default values since not in JWT
        lastName: 'User',
        role: req.user.role,
        pronouns: null,
        createdAt: null,
        lastLogin: null
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'GET_USER_ERROR' 
    });
  }
});

// Removed: No refresh endpoint needed with simple JWT approach

export default router;
