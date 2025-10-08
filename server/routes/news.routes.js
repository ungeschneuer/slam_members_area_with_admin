import express from 'express';
import optimizedQueryService from '../services/optimizedQueryService.js';
import { executeQuery } from '../config/database.js';
import { 
  startTiming, 
  endTiming, 
  sendSuccessResponse, 
  sendErrorResponse, 
  sendNotFoundResponse,
  executeCrudOperation,
  executeSlugCrudOperation,
  adminMiddleware,
  normalizeData
} from '../utils/routeHelpers.js';
import logger from '../config/logger.js';

const router = express.Router();

// Get news with basic information (optimized)
router.get('/', async (req, res) => {
  try {
    const startTime = startTiming();
    const news = await optimizedQueryService.getNewsWithDetails();
    const duration = endTiming(startTime);
    
    logger.info('Optimized news query completed', {
      duration: `${Math.round(duration)}ms`,
      newsCount: news.length,
      queryType: 'BASIC'
    });
    
    sendSuccessResponse(res, news, 'GET_NEWS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch news');
  }
});

// Get individual news article by ID with details (alias for consistency)
router.get('/detail/:id', async (req, res) => {
  const { id } = req.params;
  const startTime = startTiming();
  
  try {
    const newsArticle = await optimizedQueryService.getNewsByIdWithDetails(parseInt(id));
    const duration = endTiming(startTime);
    
    if (!newsArticle) {
      logger.info('News article not found', { id, duration: `${Math.round(duration)}ms` });
      return sendNotFoundResponse(res, 'News article');
    }
    
    logger.info('Optimized news article by ID query completed', {
      id,
      duration: `${Math.round(duration)}ms`,
      queryType: 'BASIC'
    });
    
    sendSuccessResponse(res, newsArticle, 'GET_NEWS_ARTICLE_DETAIL', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch news article by ID');
  }
});

// Get current breaking news
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

// Get individual news article by slug (moved after specific routes to avoid conflicts)
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const startTime = startTiming();
  
  try {
    const newsArticle = await optimizedQueryService.getNewsBySlugWithDetails(slug);
    const duration = endTiming(startTime);
    
    if (!newsArticle) {
      logger.info('News article not found', { slug, duration: `${Math.round(duration)}ms` });
      return sendNotFoundResponse(res, 'News article');
    }
    
    logger.info('Optimized news article by slug query completed', {
      slug,
      duration: `${Math.round(duration)}ms`,
      queryType: 'BASIC'
    });
    
    sendSuccessResponse(res, newsArticle, 'GET_NEWS_ARTICLE', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch news article by slug');
  }
});

// Create news (admin endpoint)
router.post('/', ...adminMiddleware(), async (req, res) => {
  const { 
    title, content, excerpt, category, priority, featuredImageUrl, 
    tags, status, publishedAt, slug 
  } = req.body;
  
  // Normalize data using schema
  const normalizedData = normalizeData(req.body, {
    tags: { type: 'json', fallback: [] },
    status: { type: 'string', fallback: 'DRAFT' }
  });
  
  await executeSlugCrudOperation(
    'create',
    `INSERT INTO news (title, content, excerpt, category, priority, 
     "featuredImageUrl", tags, status, "publishedAt", slug) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [title, content, excerpt, category, priority, featuredImageUrl, 
     normalizedData.tags, normalizedData.status, publishedAt, slug],
    'news article',
    'news',
    'CREATE_NEWS',
    res,
    { title, slug }
  );
});

// Update news (admin endpoint)
router.put('/:id', ...adminMiddleware(), async (req, res) => {
  const { id } = req.params;
  const { 
    title, content, excerpt, category, priority, featuredImageUrl, 
    tags, status, publishedAt, slug 
  } = req.body;
  
  // Normalize data using schema
  const normalizedData = normalizeData(req.body, {
    tags: { type: 'json', fallback: [] }
  });
  
  await executeSlugCrudOperation(
    'update',
    `UPDATE news SET title = $1, content = $2, excerpt = $3, category = $4, 
     priority = $5, "featuredImageUrl" = $6, tags = $7, status = $8, "publishedAt" = $9, 
     slug = $10, updated_at = NOW() WHERE id = $11 RETURNING *`,
    [title, content, excerpt, category, priority, featuredImageUrl, 
     normalizedData.tags, status, publishedAt, slug, parseInt(id)],
    'news article',
    'news',
    'UPDATE_NEWS',
    res,
    { title, slug }
  );
});

// Delete news (admin endpoint)
router.delete('/:id', ...adminMiddleware(), async (req, res) => {
  const { id } = req.params;
  
  await executeCrudOperation(
    'delete',
    'DELETE FROM news WHERE id = $1 RETURNING *',
    [parseInt(id)],
    'news article',
    'DELETE_NEWS',
    res
  );
});

// Set breaking news (admin endpoint)
router.post('/breaking-news/:id', ...adminMiddleware(), async (req, res) => {
  try {
    const { id } = req.params;
    const { duration } = req.body; // Duration in hours
    
    const startTime = startTiming();
    
    // Clear any existing breaking news
    await executeQuery('UPDATE news SET "isBreakingNews" = false, "breakingNewsUntil" = NULL WHERE "isBreakingNews" = true');
    
    // Calculate breaking news expiration time
    const breakingNewsUntil = duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : null;
    
    // Set the new breaking news
    const result = await executeQuery(`
      UPDATE news 
      SET "isBreakingNews" = true, 
          "breakingNewsUntil" = $2, 
          "updated_at" = NOW()
      WHERE id = $1 AND status = 'PUBLISHED'
      RETURNING *
    `, [parseInt(id), breakingNewsUntil]);
    
    const endTime = startTiming();
    const duration_ms = endTiming(startTime);
    
    if (result.rows.length === 0) {
      return sendNotFoundResponse(res, 'News article not found or not published');
    }
    
    logger.info('Breaking news set successfully', {
      articleId: id,
      duration: `${Math.round(duration_ms)}ms`,
      expiresAt: breakingNewsUntil
    });
    
    sendSuccessResponse(res, result.rows[0], 'SET_BREAKING_NEWS', duration_ms);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to set breaking news');
  }
});

// Clear breaking news (admin endpoint)
router.delete('/breaking-news', ...adminMiddleware(), async (req, res) => {
  try {
    const startTime = startTiming();
    
    // Clear all breaking news flags
    await executeQuery('UPDATE news SET "isBreakingNews" = false, "breakingNewsUntil" = NULL WHERE "isBreakingNews" = true');
    
    const duration = endTiming(startTime);
    
    logger.info('Breaking news cleared', {
      duration: `${Math.round(duration)}ms`
    });
    
    sendSuccessResponse(res, { message: 'Breaking news cleared successfully' }, 'CLEAR_BREAKING_NEWS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to clear breaking news');
  }
});

export default router;
