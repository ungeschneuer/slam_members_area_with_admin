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

// Get current breaking news
router.get('/', async (req, res) => {
  try {
    const startTime = startTiming();
    const breakingNews = await executeQuery(
      'SELECT id, title, content, excerpt, category, published_at, featured_image_url, slug, breaking_news_until FROM news WHERE is_breaking_news = true AND (breaking_news_until IS NULL OR breaking_news_until > NOW()) ORDER BY published_at DESC',
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
    const { id } = req.params;
    // Sanitize input data to prevent XSS
    const sanitizedData = sanitizeEntity.breakingNews(req.body);
    const { breaking_news_until } = sanitizedData;
    
    const startTime = startTiming();
    
    // Clear existing breaking news
    await executeQuery('UPDATE news SET is_breaking_news = false, breaking_news_until = NULL WHERE is_breaking_news = true');
    
    // Set new breaking news
    const result = await executeQuery(`
      UPDATE news 
      SET is_breaking_news = true, breaking_news_until = $1 
      WHERE id = $2 
      RETURNING *
    `, [breaking_news_until, id]);
    
    const duration = endTiming(startTime);
    
    logger.info('Breaking news set successfully', {
      newsId: id,
      breaking_news_until,
      duration: `${duration}ms`,
      queryType: 'SET_BREAKING_NEWS'
    });
    
    sendSuccessResponse(res, result.rows[0], 'SET_BREAKING_NEWS', duration);
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

export { router as breakingNewsRouter };
