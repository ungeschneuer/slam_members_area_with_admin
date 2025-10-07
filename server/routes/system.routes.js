import express from 'express';
import optimizedQueryService from '../services/optimizedQueryService.js';
import { executeQuery } from '../config/database.js';
import { 
  startTiming, 
  endTiming, 
  sendSuccessResponse, 
  sendErrorResponse, 
  adminMiddleware,
  normalizeData
} from '../utils/routeHelpers.js';
import logger from '../config/logger.js';

const router = express.Router();

// Admin settings endpoint
router.get('/admin/settings', ...adminMiddleware(), async (req, res) => {
  try {
    const startTime = startTiming();
    
    // Get timezone from environment variable
    const timezone = process.env.APP_TIMEZONE || 'Europe/Berlin';
    
    // Get other settings from database
    const settingsQuery = 'SELECT key, value FROM settings WHERE key IN ($1, $2, $3)';
    const settingsResult = await executeQuery(settingsQuery, ['timezone', 'app_name', 'app_version']);
    
    const settings = {
      timezone: timezone,
      app_name: 'SLAM25 Members Area',
      app_version: process.env.npm_package_version || '1.0.0'
    };
    
    // Add database settings
    settingsResult.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    const duration = endTiming(startTime);
    
    logger.info('Admin settings fetched', {
      timezone,
      duration: `${Math.round(duration)}ms`
    });
    
    sendSuccessResponse(res, settings, 'GET_ADMIN_SETTINGS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch admin settings');
  }
});

// Simple health check endpoint
router.get('/health', async (req, res) => {
  try {
    const startTime = startTiming();
    
    // Test database connection
    let databaseStatus = 'healthy';
    let databaseResponseTime = null;
    
    try {
      const dbStartTime = performance.now();
      await executeQuery('SELECT 1');
      databaseResponseTime = Math.round(performance.now() - dbStartTime);
    } catch (dbError) {
      databaseStatus = 'unhealthy';
    }
    
    const healthData = {
      status: databaseStatus,
      database: {
        status: databaseStatus,
        responseTime: databaseResponseTime
      },
      uptime: Math.round(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString()
    };
    
    const duration = endTiming(startTime);
    const statusCode = databaseStatus === 'healthy' ? 200 : 503;
    
    sendSuccessResponse(res, healthData, 'HEALTH_CHECK', duration, statusCode);
  } catch (error) {
    sendErrorResponse(res, error, 'Health check failed', 503);
  }
});

// Get countdown configuration
router.get('/countdown-config', async (req, res) => {
  try {
    const startTime = startTiming();
    
    const query = 'SELECT * FROM countdown_config ORDER BY id DESC LIMIT 1';
    const result = await executeQuery(query);
    
    const duration = endTiming(startTime);
    
    if (result.rows.length === 0) {
      return sendSuccessResponse(res, null, 'GET_COUNTDOWN_CONFIG', duration);
    }
    
    // Transform database fields to frontend-expected format
    const countdownData = result.rows[0];
    const transformedData = {
      title: countdownData.title,
      subtitle: countdownData.subtitle,
      target_date: countdownData.target_date,
      buttonText: countdownData.button_text,
      buttonEmoji: countdownData.button_emoji,
      buttonLink: countdownData.button_link,
      isActive: countdownData.is_active
    };
    
    sendSuccessResponse(res, transformedData, 'GET_COUNTDOWN_CONFIG', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch countdown configuration');
  }
});

// Update countdown configuration (admin endpoint)
router.put('/countdown-config', ...adminMiddleware(), async (req, res) => {
  const { 
    targetDate, targetTime, title, description, isActive, 
    showDays, showHours, showMinutes, showSeconds 
  } = req.body;
  
  // Normalize data using schema
  const normalizedData = normalizeData(req.body, {
    isActive: { type: 'boolean', fallback: true },
    showDays: { type: 'boolean', fallback: true },
    showHours: { type: 'boolean', fallback: true },
    showMinutes: { type: 'boolean', fallback: true },
    showSeconds: { type: 'boolean', fallback: true }
  });
  
  try {
    const startTime = startTiming();
    
    // Check if countdown config exists
    const existingQuery = 'SELECT id FROM countdown_config ORDER BY id DESC LIMIT 1';
    const existingResult = await executeQuery(existingQuery);
    
    let result;
    if (existingResult.rows.length > 0) {
      // Update existing config
      result = await executeQuery(`
        UPDATE countdown_config 
        SET target_date = $1, target_time = $2, title = $3, description = $4, 
            is_active = $5, show_days = $6, show_hours = $7, show_minutes = $8, 
            show_seconds = $9, updated_at = NOW()
        WHERE id = $10
        RETURNING *
      `, [targetDate, targetTime, title, description, normalizedData.isActive, 
          normalizedData.showDays, normalizedData.showHours, normalizedData.showMinutes, 
          normalizedData.showSeconds, existingResult.rows[0].id]);
    } else {
      // Create new config
      result = await executeQuery(`
        INSERT INTO countdown_config (target_date, target_time, title, description, 
         is_active, show_days, show_hours, show_minutes, show_seconds)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [targetDate, targetTime, title, description, normalizedData.isActive, 
          normalizedData.showDays, normalizedData.showHours, normalizedData.showMinutes, 
          normalizedData.showSeconds]);
    }
    
    const duration = endTiming(startTime);
    
    logger.info('Countdown configuration updated successfully', {
      duration: `${Math.round(duration)}ms`,
      configId: result.rows[0].id
    });
    
    sendSuccessResponse(res, result.rows[0], 'UPDATE_COUNTDOWN_CONFIG', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to update countdown configuration');
  }
});

// Clear cache (admin endpoint)
router.post('/cache/clear', ...adminMiddleware(), async (req, res) => {
  try {
    const startTime = startTiming();
    
    // Clear optimized query service cache
    optimizedQueryService.clearCache();
    
    const duration = endTiming(startTime);
    
    logger.info('Cache cleared successfully', {
      duration: `${Math.round(duration)}ms`
    });
    
    sendSuccessResponse(res, { 
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    }, 'CLEAR_CACHE', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to clear cache');
  }
});

// Get cache statistics (admin endpoint)
router.get('/cache/stats', ...adminMiddleware(), async (req, res) => {
  try {
    const startTime = startTiming();
    
    const stats = optimizedQueryService.getCacheStats();
    
    const duration = endTiming(startTime);
    
    sendSuccessResponse(res, stats, 'GET_CACHE_STATS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch cache statistics');
  }
});

// Get current breaking news (direct route for frontend compatibility)
router.get('/breaking-news', async (req, res) => {
  try {
    const startTime = startTiming();
    const breakingNews = await optimizedQueryService.getBreakingNewsWithDetails();
    const duration = endTiming(startTime);
    
    if (!breakingNews) {
      // No breaking news currently active
      return sendSuccessResponse(res, null, 'GET_BREAKING_NEWS', duration);
    }
    
    logger.info('Optimized breaking news query completed', {
      duration: `${Math.round(duration)}ms`,
      articleId: breakingNews.id,
      queryType: 'BASIC'
    });
    
    sendSuccessResponse(res, breakingNews, 'GET_BREAKING_NEWS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch breaking news');
  }
});

export default router;
