import express from 'express';
import { executeQuery } from '../config/database.js';
import { 
  startTiming, 
  endTiming, 
  sendSuccessResponse, 
  sendErrorResponse 
} from '../utils/simpleRouteHelpers.js';
import { adminMiddleware } from '../middleware/simpleAuth.js';
import logger from '../config/logger.js';
import { sanitizeEntity } from '../utils/sanitization.js';

const router = express.Router();

// Get countdown configuration
router.get('/', async (req, res) => {
  try {
    const startTime = startTiming();
    
    const result = await executeQuery(
      'SELECT * FROM countdown_config WHERE is_active = true ORDER BY updated_at DESC LIMIT 1',
      []
    );
    
    const duration = endTiming(startTime);
    
    const countdownData = result.rows[0] || null;
    
    logger.info('Countdown config fetched successfully', {
      found: !!countdownData,
      duration: `${duration}ms`,
      queryType: 'GET_COUNTDOWN_CONFIG'
    });
    
    sendSuccessResponse(res, countdownData, 'GET_COUNTDOWN_CONFIG', duration);
  } catch (error) {
    logger.error('API Error:', error);
    sendErrorResponse(res, error, 'Failed to fetch countdown configuration');
  }
});

// Update countdown configuration (admin endpoint)
router.put('/', ...adminMiddleware(), async (req, res) => {
  try {
    // Sanitize input data to prevent XSS
    const sanitizedData = sanitizeEntity.countdown(req.body);
    
    const {
      title,
      subtitle,
      target_date,
      button_text,
      button_emoji,
      button_link,
      is_active
    } = sanitizedData;
    
    const startTime = startTiming();
    
    // Update existing active countdown (keep existing values when fields are undefined)
    let result = await executeQuery(`
      UPDATE countdown_config 
      SET 
        title = COALESCE($1, title),
        subtitle = COALESCE($2, subtitle),
        target_date = COALESCE($3, target_date),
        button_text = COALESCE($4, button_text),
        button_emoji = COALESCE($5, button_emoji),
        button_link = COALESCE($6, button_link),
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
      WHERE is_active = true
      RETURNING *
    `, [
      title ?? null,
      subtitle ?? null,
      target_date ?? null,
      button_text ?? null,
      button_emoji ?? null,
      button_link ?? null,
      typeof is_active === 'boolean' ? is_active : true
    ]);

    // If no active row existed, insert a new configuration
    if (!result.rows || result.rows.length === 0) {
      // Insert new configuration with sensible defaults when not provided
      const fallback = {
        title: title ?? 'Countdown zum SLAM25',
        subtitle: subtitle ?? '28. Oktober 2025 • 12:00 Uhr (Berlin Zeit)',
        target_date: target_date ?? '2025-10-28T10:00:00.000Z',
        button_text: button_text ?? 'Zum Zeitplan',
        button_emoji: button_emoji ?? '📅',
        button_link: button_link ?? '/timetable',
        is_active: typeof is_active === 'boolean' ? is_active : true,
      };

      result = await executeQuery(`
        INSERT INTO countdown_config (title, subtitle, target_date, button_text, button_emoji, button_link, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `, [
        fallback.title,
        fallback.subtitle,
        fallback.target_date,
        fallback.button_text,
        fallback.button_emoji,
        fallback.button_link,
        fallback.is_active
      ]);
    }
    
    const duration = endTiming(startTime);
    
    logger.info('Countdown config updated successfully', {
      title: title,
      is_active: is_active,
      duration: `${duration}ms`,
      queryType: 'UPDATE_COUNTDOWN_CONFIG'
    });
    
    sendSuccessResponse(res, result.rows[0], 'UPDATE_COUNTDOWN_CONFIG', duration);
  } catch (error) {
    logger.error('API Error:', error);
    sendErrorResponse(res, error, 'Failed to update countdown configuration');
  }
});

export default router;
