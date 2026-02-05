import express from 'express';
import bcryptjs from 'bcryptjs';
import xss from 'xss';
import {
  startTiming,
  endTiming,
  sendSuccessResponse,
  sendErrorResponse,
  executeQuery
} from '../utils/routeHelpers.js';
import { adminMiddleware } from '../middleware/authMiddleware.js';
import { USER_PASSWORD_CONSTANTS } from '../constants/userPasswordConstants.js';
import logger from '../config/logger.js';

const router = express.Router();

// Get application settings
router.get('/', async (req, res) => {
  try {
    const startTime = startTiming();
    
    // Read timezone and other settings from environment with sensible defaults
    const settings = {
      timezone: process.env.APP_TIMEZONE || process.env.TZ || 'Europe/Berlin',
      app_name: 'SLAM25',
      app_version: '1.0.0',
      language: 'de',
      date_format: 'DD.MM.YYYY',
      time_format: 'HH:mm'
    };
    
    const duration = endTiming(startTime);
    
    logger.info('Settings fetched successfully', {
      duration: `${duration}ms`,
      queryType: 'GET_SETTINGS'
    });
    
    sendSuccessResponse(res, settings, 'GET_SETTINGS', duration);
  } catch (error) {
    logger.error('API Error:', error);
    sendErrorResponse(res, error, 'Failed to fetch settings');
  }
});

// Set user area password (admin only)
router.post('/user-password', ...adminMiddleware(), async (req, res) => {
  try {
    const startTime = startTiming();
    const { password } = req.body;
    
    if (typeof password !== 'string' || !password || password.length < USER_PASSWORD_CONSTANTS.MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ 
        success: false, 
        error: `Password must be at least ${USER_PASSWORD_CONSTANTS.MIN_PASSWORD_LENGTH} characters long` 
      });
    }
    
    // Sanitize and normalize password (same as verification route)
    const sanitizedPassword = xss(password.trim(), {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
    
    // Hash password with bcrypt
    const saltRounds = 12;
    const hashedPassword = await bcryptjs.hash(sanitizedPassword, saltRounds);
    
    // Store in settings table
    await executeQuery(
      `INSERT INTO settings (key, value, description) 
       VALUES ($1, $2, 'Hashed password for user area access (NULL = no protection)')
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
      [USER_PASSWORD_CONSTANTS.SETTINGS_KEY, hashedPassword]
    );
    
    const duration = endTiming(startTime);
    
    logger.info('User area password set successfully', {
      duration: `${duration}ms`,
      queryType: 'SET_USER_PASSWORD'
    });
    
    sendSuccessResponse(res, { message: USER_PASSWORD_CONSTANTS.SUCCESS_MESSAGES.PASSWORD_SET_SUCCESS }, 'SET_USER_PASSWORD', duration);
  } catch (error) {
    logger.error('API Error:', error);
    sendErrorResponse(res, error, 'Failed to set password');
  }
});

// Get user area password status (public)
router.get('/user-password/status', async (req, res) => {
  try {
    const startTime = startTiming();
    
    const result = await executeQuery(
      'SELECT value FROM settings WHERE key = $1',
      [USER_PASSWORD_CONSTANTS.SETTINGS_KEY]
    );
    
    const isProtected = result.rows.length > 0 && result.rows[0].value && result.rows[0].value.trim() !== '';
    
    const duration = endTiming(startTime);
    
    logger.info('User area password status checked', {
      duration: `${duration}ms`,
      isProtected,
      queryType: 'GET_USER_PASSWORD_STATUS'
    });
    
    sendSuccessResponse(res, { isProtected: Boolean(isProtected) }, 'GET_USER_PASSWORD_STATUS', duration);
  } catch (error) {
    logger.error('API Error:', error);
    sendErrorResponse(res, error, 'Failed to check password status');
  }
});

// Get dashboard text settings (public)
router.get('/dashboard-text', async (req, res) => {
  try {
    const startTime = startTiming();
    
    const result = await executeQuery(
      `SELECT key, value FROM settings 
       WHERE key IN ('dashboard_hero_heading', 'dashboard_hero_subtitle', 'dashboard_hero_description')`,
      []
    );
    
    // Convert array of {key, value} to object
    const settings = {};
    result.rows.forEach(row => {
      const key = row.key.replace('dashboard_hero_', '');
      settings[key] = row.value;
    });
    
    // Provide defaults if settings don't exist
    const dashboardText = {
      heading: settings.heading || 'Willkommen bei SLAM25',
      subtitle: settings.subtitle || 'Dein Poetry Slam Community Hub',
      description: settings.description || 'Entdecke Teilnehmer*innen, verfolge Runden, lies Tipps und bleibe mit der Poetry Slam Community verbunden.'
    };
    
    const duration = endTiming(startTime);
    
    logger.info('Dashboard text settings fetched successfully', {
      duration: `${duration}ms`,
      queryType: 'GET_DASHBOARD_TEXT'
    });
    
    sendSuccessResponse(res, dashboardText, 'GET_DASHBOARD_TEXT', duration);
  } catch (error) {
    logger.error('API Error:', error);
    sendErrorResponse(res, error, 'Failed to fetch dashboard text settings');
  }
});

// Update dashboard text settings (admin only)
router.put('/dashboard-text', ...adminMiddleware(), async (req, res) => {
  try {
    const startTime = startTiming();
    const { heading, subtitle, description } = req.body;
    
    // Validation
    if (!heading || heading.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Heading is required' 
      });
    }
    if (!subtitle || subtitle.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Subtitle is required' 
      });
    }
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Description is required' 
      });
    }
    
    // Character limits
    if (heading.length > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'Heading must be 100 characters or less' 
      });
    }
    if (subtitle.length > 150) {
      return res.status(400).json({ 
        success: false, 
        error: 'Subtitle must be 150 characters or less' 
      });
    }
    if (description.length > 500) {
      return res.status(400).json({ 
        success: false, 
        error: 'Description must be 500 characters or less' 
      });
    }
    
    // Sanitize input
    const sanitizedHeading = xss(heading.trim(), {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
    const sanitizedSubtitle = xss(subtitle.trim(), {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
    const sanitizedDescription = xss(description.trim(), {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
    
    // Update settings in database
    await executeQuery(
      `INSERT INTO settings (key, value, description) 
       VALUES 
         ('dashboard_hero_heading', $1, 'Main heading text for dashboard hero section'),
         ('dashboard_hero_subtitle', $2, 'Subtitle text for dashboard hero section'),
         ('dashboard_hero_description', $3, 'Description text for dashboard hero section')
       ON CONFLICT (key) DO UPDATE SET 
         value = EXCLUDED.value, 
         updated_at = CURRENT_TIMESTAMP`,
      [sanitizedHeading, sanitizedSubtitle, sanitizedDescription]
    );
    
    const duration = endTiming(startTime);
    
    logger.info('Dashboard text settings updated successfully', {
      duration: `${duration}ms`,
      queryType: 'UPDATE_DASHBOARD_TEXT'
    });
    
    sendSuccessResponse(res, { 
      message: 'Dashboard text settings updated successfully',
      data: {
        heading: sanitizedHeading,
        subtitle: sanitizedSubtitle,
        description: sanitizedDescription
      }
    }, 'UPDATE_DASHBOARD_TEXT', duration);
  } catch (error) {
    logger.error('API Error:', error);
    sendErrorResponse(res, error, 'Failed to update dashboard text settings');
  }
});

export default router;
