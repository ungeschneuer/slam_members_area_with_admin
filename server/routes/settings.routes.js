import express from 'express';
import {
  startTiming,
  endTiming,
  sendSuccessResponse,
  sendErrorResponse,
  executeQuery
} from '../utils/simpleRouteHelpers.js';
import logger from '../config/logger.js';

export const settingsRouter = express.Router();

// Get application settings
settingsRouter.get('/', async (req, res) => {
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

export default settingsRouter;
