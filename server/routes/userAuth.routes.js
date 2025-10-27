import express from 'express';
import bcryptjs from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import xss from 'xss';
import {
  startTiming,
  endTiming,
  sendSuccessResponse,
  sendErrorResponse,
  executeQuery
} from '../utils/simpleRouteHelpers.js';
import { setUserAuthCookie, clearUserAuthCookie, checkUserAuth } from '../middleware/simpleAuth.js';
import { USER_PASSWORD_CONSTANTS, PASSWORD_VALIDATION_RULES } from '../constants/userPasswordConstants.js';
import { rateLimitConfig } from '../config/security.js';
import logger from '../config/logger.js';

const router = express.Router();

// Verify user password and set cookie
router.post('/verify', [
  body('password')
    .notEmpty()
    .withMessage(USER_PASSWORD_CONSTANTS.ERROR_MESSAGES.PASSWORD_REQUIRED)
    .isLength({ min: PASSWORD_VALIDATION_RULES.minLength, max: PASSWORD_VALIDATION_RULES.maxLength })
    .withMessage(USER_PASSWORD_CONSTANTS.ERROR_MESSAGES.PASSWORD_TOO_LONG)
    .trim()
    .escape()
], async (req, res) => {
  try {
    const startTime = startTiming();
    
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
        code: USER_PASSWORD_CONSTANTS.ERROR_MESSAGES.VALIDATION_ERROR
      });
    }
    
    const { password } = req.body;
    
    // Sanitize password input
    const sanitizedPassword = xss(password, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
    
    // Get stored password hash
    const result = await executeQuery(
      'SELECT value FROM settings WHERE key = $1',
      [USER_PASSWORD_CONSTANTS.SETTINGS_KEY]
    );
    
    if (result.rows.length === 0 || !result.rows[0].value || result.rows[0].value.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: USER_PASSWORD_CONSTANTS.ERROR_MESSAGES.PROTECTION_NOT_ENABLED 
      });
    }
    
    const storedHash = result.rows[0].value;
    
    // Verify password with sanitized input
    const isValid = await bcryptjs.compare(sanitizedPassword, storedHash);
    
    if (!isValid) {
      const duration = endTiming(startTime);
      
      logger.warn('Invalid user password attempt', {
        duration: `${duration}ms`,
        queryType: 'VERIFY_USER_PASSWORD'
      });
      
      return res.status(401).json({ 
        success: false, 
        error: USER_PASSWORD_CONSTANTS.ERROR_MESSAGES.WRONG_PASSWORD 
      });
    }
    
    // Set user authentication cookie
    setUserAuthCookie(res);
    
    const duration = endTiming(startTime);
    
    logger.info('User password verified successfully', {
      duration: `${duration}ms`,
      queryType: 'VERIFY_USER_PASSWORD'
    });
    
    sendSuccessResponse(res, { message: USER_PASSWORD_CONSTANTS.SUCCESS_MESSAGES.AUTHENTICATION_SUCCESS }, 'VERIFY_USER_PASSWORD', duration);
  } catch (error) {
    logger.error('API Error:', error);
    sendErrorResponse(res, error, 'Failed to verify password');
  }
});

// Logout user (clear cookie)
router.post('/logout', async (req, res) => {
  try {
    const startTime = startTiming();
    
    // Clear user authentication cookie
    clearUserAuthCookie(res);
    
    const duration = endTiming(startTime);
    
    logger.info('User logged out successfully', {
      duration: `${duration}ms`,
      queryType: 'USER_LOGOUT'
    });
    
    sendSuccessResponse(res, { message: USER_PASSWORD_CONSTANTS.SUCCESS_MESSAGES.LOGOUT_SUCCESS }, 'USER_LOGOUT', duration);
  } catch (error) {
    logger.error('API Error:', error);
    sendErrorResponse(res, error, 'Failed to logout');
  }
});

// Check authentication status
router.get('/status', rateLimitConfig.general, async (req, res) => {
  try {
    const startTime = startTiming();
    
    const isAuthenticated = checkUserAuth(req);
    
    // Check if user is admin
    const adminToken = req.cookies?.authToken;
    let isAdmin = false;
    
    if (adminToken) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(adminToken, process.env.JWT_SECRET);
        isAdmin = decoded && decoded.role === 'admin';
      } catch (error) {
        // Invalid admin token, not admin
      }
    }
    
    const duration = endTiming(startTime);
    
    logger.info('User authentication status checked', {
      duration: `${duration}ms`,
      isAuthenticated,
      isAdmin,
      queryType: 'USER_AUTH_STATUS'
    });
    
    sendSuccessResponse(res, { 
      authenticated: isAuthenticated, 
      isAdmin 
    }, 'USER_AUTH_STATUS', duration);
  } catch (error) {
    logger.error('API Error:', error);
    sendErrorResponse(res, error, 'Failed to check authentication status');
  }
});

export default router;
