import express from 'express';
import { executeQuery } from '../config/database.js';
import {
  startTiming,
  endTiming,
  sendSuccessResponse,
  sendErrorResponse
} from '../utils/routeHelpers.js';
import { adminMiddleware } from '../middleware/authMiddleware.js';
import logger from '../config/logger.js';
import { sanitizeEntity } from '../utils/sanitization.js';
import { setBreakingNews } from '../services/breakingNewsService.js';

const router = express.Router();

// Get current breaking news
router.get('/', async (req, res) => {
  try {
    const startTime = startTiming();
    const breakingNews = await executeQuery(
      'SELECT * FROM news WHERE is_breaking_news = true AND (breaking_news_until IS NULL OR breaking_news_until > NOW()) ORDER BY published_at DESC',
      []
    );
    
    const duration = endTiming(startTime);
    
    const breakingNewsData = breakingNews.rows || [];
    
    logger.info('Breaking news fetched successfully', {
      count: breakingNewsData.length,
      duration: `${duration}ms`,
      queryType: 'GET_BREAKING_NEWS'
    });
    
    sendSuccessResponse(res, breakingNewsData, 'GET_BREAKING_NEWS', duration);
  } catch (error) {
    logger.error('API Error:', error);
    sendErrorResponse(res, error, 'Failed to fetch breaking news');
  }
});

// Set breaking news (admin endpoint)
router.post('/:id', ...adminMiddleware(), async (req, res) => {
  try {
    const articleId = parseInt(req.params.id, 10);
    if (isNaN(articleId) || articleId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid article ID' });
    }

    const sanitizedData = sanitizeEntity.breakingNews(req.body);
    const breaking_news_until = sanitizedData.breaking_news_until ?? null;

    const startTime = startTiming();

    // Delegates to the transactional service: clears existing breaking news,
    // validates the article is PUBLISHED, and sets the new one atomically.
    const result = await setBreakingNews(articleId, breaking_news_until);

    const duration = endTiming(startTime);

    logger.info('Breaking news set successfully', {
      newsId: articleId,
      breaking_news_until,
      duration: `${duration}ms`,
      queryType: 'SET_BREAKING_NEWS'
    });

    sendSuccessResponse(res, result, 'SET_BREAKING_NEWS', duration);
  } catch (error) {
    logger.error('API Error:', error);
    sendErrorResponse(res, error, 'Failed to set breaking news');
  }
});

// Clear breaking news (admin endpoint)
router.delete('/', ...adminMiddleware(), async (req, res) => {
  try {
    const startTime = startTiming();
    
    await executeQuery('UPDATE news SET is_breaking_news = false, breaking_news_until = NULL WHERE is_breaking_news = true');
    
    const duration = endTiming(startTime);
    
    logger.info('Breaking news cleared successfully', {
      duration: `${duration}ms`,
      queryType: 'CLEAR_BREAKING_NEWS'
    });
    
    sendSuccessResponse(res, { message: 'Breaking news cleared' }, 'CLEAR_BREAKING_NEWS', duration);
  } catch (error) {
    logger.error('API Error:', error);
    sendErrorResponse(res, error, 'Failed to clear breaking news');
  }
});

export default router;
