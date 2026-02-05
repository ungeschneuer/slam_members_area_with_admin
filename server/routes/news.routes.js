import express from 'express';
import fs from 'fs';
import path from 'path';
// Optimized query service removed - using simple database queries
import { executeQuery, executeTransaction } from '../config/database.js';
import {
  startTiming,
  endTiming,
  sendSuccessResponse,
  sendErrorResponse,
  sendNotFoundResponse,
  executeCrudOperation,
  normalizeData,
} from '../utils/simpleRouteHelpers.js';
import { adminMiddleware } from '../middleware/simpleAuth.js';
import { generateSlug, generateUniqueSlug } from '../utils/slugUtils.js';
// Idempotency and optimistic locking removed - using simple error handling instead
import logger from '../config/logger.js';
// Input validation service removed - using simple validation instead
import { sanitizeEntity } from '../utils/sanitization.js';
import { entityNormalizers } from '../utils/normalizers.js';
import { newsSchema, breakingNewsSchema } from '../../shared/schemas/newsSchema.js';
import { uploadNewsFile, handleUploadError } from '../middleware/upload.js';
import { safeDeleteFile } from '../utils/fileUtils.js';

// Simple sanitization middleware
const sanitizeBody = (req, _res, next) => {
  try {
    // Simple string trimming and basic sanitization
    if (req.body && typeof req.body === 'object') {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.body[key].trim();
        }
      });
    }
  } catch {}
  next();
};

const router = express.Router();

// Get news with basic information (optimized)
router.get('/', async (req, res) => {
  try {
    const startTime = startTiming();
    const news = await executeQuery(
      'SELECT * FROM news ORDER BY published_at DESC',
      []
    );
    const duration = endTiming(startTime);
    
    logger.info('Optimized news query completed', {
      duration: `${Math.round(duration)}ms`,
      newsCount: news.rows?.length || news.length,
      queryType: 'BASIC'
    });
    
    sendSuccessResponse(res, news.rows || news, 'GET_NEWS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch news');
  }
});


// Get current breaking news
router.get('/breaking-news', async (req, res) => {
  try {
    const startTime = startTiming();
    const breakingNews = await executeQuery(
      'SELECT * FROM news WHERE is_breaking_news = true AND (breaking_news_until IS NULL OR breaking_news_until > NOW()) ORDER BY published_at DESC',
      []
    );
    const duration = endTiming(startTime);
    
    if (!breakingNews || breakingNews.rows.length === 0) {
      // No breaking news currently active
      return sendSuccessResponse(res, null, 'GET_BREAKING_NEWS', duration);
    }
    
    logger.info('Optimized breaking news query completed', {
      duration: `${Math.round(duration)}ms`,
      articleId: breakingNews.rows[0].id,
      queryType: 'BASIC'
    });
    
    sendSuccessResponse(res, breakingNews.rows[0], 'GET_BREAKING_NEWS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch breaking news');
  }
});

// Get individual news article by slug
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const startTime = startTiming();
  
  try {
    const result = await executeQuery(
      'SELECT * FROM news WHERE slug = $1',
      [slug]
    );
    const duration = endTiming(startTime);
    
    if (result.rows.length === 0) {
      logger.info('News article not found', { slug, duration: `${Math.round(duration)}ms` });
      return sendNotFoundResponse(res, 'News article');
    }
    
    logger.info('News article by slug query completed', {
      slug,
      duration: `${Math.round(duration)}ms`,
      queryType: 'DIRECT'
    });
    
    sendSuccessResponse(res, result.rows[0], 'GET_NEWS_ARTICLE', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch news article by slug');
  }
});

// Create news (admin endpoint)
router.post('/', ...adminMiddleware(), sanitizeBody, async (req, res) => {
  try {
    // Sanitize input data to prevent XSS
    const sanitizedData = sanitizeEntity.news(req.body);
    const {
      title, content, excerpt, category, priority, featured_image_url,
      tags, status, published_at, slug
    } = sanitizedData;

    // Generate unique slug using centralized utility
    const baseSlug = slug || generateSlug(title);
    // Escape LIKE wildcards (%, _) in baseSlug to prevent incorrect matches
    const escapedBaseSlug = baseSlug.replace(/%/g, '\\%').replace(/_/g, '\\_');
    const existingSlugsResult = await executeQuery(
      "SELECT slug FROM news WHERE slug LIKE $1 ESCAPE '\\'",
      [`${escapedBaseSlug}%`]
    );
    const existingSlugs = existingSlugsResult.rows.map(r => r.slug);
    const generatedSlug = generateUniqueSlug(title, existingSlugs);

    // Normalize and coerce types
    const normalizedData = normalizeData(sanitizedData, {
      status: { type: 'string', fallback: 'DRAFT' }
    });
    const normalizedNews = entityNormalizers.news(sanitizedData);
    const tagsArray = normalizedNews.tags;

    await executeCrudOperation(
      'create',
      `INSERT INTO news (title, content, excerpt, category, priority,
       featured_image_url, tags, status, published_at, slug)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [title, content, excerpt, category, priority, featured_image_url,
       tagsArray, normalizedData.status, published_at, generatedSlug],
      'news',
      'CREATE_NEWS',
      res
    );
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to create news article');
  }
});

// Update news (admin endpoint)
router.put('/:id', ...adminMiddleware(), sanitizeBody, async (req, res) => { // Optimistic locking removed
  const { id } = req.params;
  // Sanitize input data to prevent XSS
  const sanitizedData = sanitizeEntity.news(req.body);
  
  // Normalize and coerce types (same as CREATE route)
  const normalizedData = normalizeData(sanitizedData, {
    status: { type: 'string', fallback: 'DRAFT' }
  });
  const normalizedNews = entityNormalizers.news(sanitizedData);
  const tagsArray = normalizedNews.tags;
  
  const { 
    title, content, excerpt, category, priority, featured_image_url,
    published_at, slug
  } = sanitizedData;
  
  await executeCrudOperation(
    'update',
    `UPDATE news SET title = $1, content = $2, excerpt = $3, category = $4, 
     priority = $5, featured_image_url = $6, tags = $7, status = $8, published_at = $9, 
     slug = $10, updated_at = NOW() WHERE id = $11 RETURNING *`,
    [title, content, excerpt, category, priority, featured_image_url, 
     tagsArray, normalizedData.status, published_at, slug, parseInt(id)],
    'news',
    'UPDATE_NEWS',
    res
  );
});

// Delete news (admin endpoint)
router.delete('/:id', ...adminMiddleware(), async (req, res) => {
  const { id } = req.params;
  
  await executeCrudOperation(
    'delete',
    'DELETE FROM news WHERE id = $1 RETURNING *',
    [parseInt(id)],
    'news',
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

    // Validate duration if provided (must be a positive number, max 168 hours = 1 week)
    if (duration !== undefined && duration !== null) {
      const numDuration = Number(duration);
      if (!Number.isFinite(numDuration) || numDuration <= 0 || numDuration > 168) {
        return res.status(400).json({
          success: false,
          error: 'Duration must be a positive number (max 168 hours / 1 week)'
        });
      }
    }

    // Calculate breaking news expiration time
    const breaking_news_until = duration ? new Date(Date.now() + Number(duration) * 60 * 60 * 1000) : null;

    // Pre-validate that article exists and is published before starting transaction
    const preCheckResult = await executeQuery(
      'SELECT id, title, status FROM news WHERE id = $1',
      [parseInt(id)]
    );

    if (preCheckResult.rows.length === 0) {
      logger.warn('Breaking news: article not found', { articleId: id });
      return sendNotFoundResponse(res, 'News article');
    }

    if (preCheckResult.rows[0].status !== 'PUBLISHED') {
      logger.warn('Breaking news: article not published', {
        articleId: id,
        status: preCheckResult.rows[0].status
      });
      return res.status(400).json({
        success: false,
        error: 'Only published articles can be set as breaking news'
      });
    }

    // Use transaction to ensure all 3 updates succeed or all fail
    const result = await executeTransaction(async (client) => {
      // 1. Clean up expired breaking news before setting new one
      const expiredCleanup = await client.query(
        'UPDATE news SET is_breaking_news = false, breaking_news_until = NULL WHERE is_breaking_news = true AND breaking_news_until < NOW() RETURNING id'
      );

      if (expiredCleanup.rows.length > 0) {
        logger.info('Cleaned up expired breaking news', {
          count: expiredCleanup.rows.length,
          articleIds: expiredCleanup.rows.map(r => r.id)
        });
      }

      // 2. Clear any existing breaking news
      const existingCleanup = await client.query(
        'UPDATE news SET is_breaking_news = false, breaking_news_until = NULL WHERE is_breaking_news = true RETURNING id, title'
      );

      if (existingCleanup.rows.length > 0) {
        logger.info('Cleared existing breaking news', {
          count: existingCleanup.rows.length,
          previousArticles: existingCleanup.rows.map(r => ({ id: r.id, title: r.title }))
        });
      }

      // 2a. Validate no breaking news remains (defensive check)
      const validationResult = await client.query(
        'SELECT COUNT(*) as count FROM news WHERE is_breaking_news = true'
      );

      if (parseInt(validationResult.rows[0].count) > 0) {
        logger.error('Breaking news transaction validation failed: breaking news still exists after cleanup', {
          remainingCount: validationResult.rows[0].count
        });
        throw new Error('Failed to clear existing breaking news - transaction state inconsistent');
      }

      // 3. Set the new breaking news
      const updateResult = await client.query(`
        UPDATE news
        SET is_breaking_news = true,
            breaking_news_until = $2,
            "updated_at" = NOW()
        WHERE id = $1 AND status = 'PUBLISHED'
        RETURNING *
      `, [parseInt(id), breaking_news_until]);

      if (updateResult.rows.length === 0) {
        logger.error('Breaking news transaction failed: article disappeared or unpublished during transaction', {
          articleId: id
        });
        throw new Error('News article not found or not published');
      }

      return updateResult.rows[0];
    });

    const duration_ms = endTiming(startTime);

    logger.info('Breaking news set successfully', {
      articleId: id,
      title: result.title,
      duration: `${Math.round(duration_ms)}ms`,
      expiresAt: breaking_news_until
    });

    sendSuccessResponse(res, result, 'SET_BREAKING_NEWS', duration_ms);
  } catch (error) {
    logger.error('Failed to set breaking news', {
      articleId: req.params.id,
      error: error.message,
      stack: error.stack
    });
    sendErrorResponse(res, error, 'Failed to set breaking news');
  }
});

// Clear breaking news (admin endpoint)
router.delete('/breaking-news', ...adminMiddleware(), async (req, res) => {
  try {
    const startTime = startTiming();
    
    // Clear all breaking news flags
    await executeQuery('UPDATE news SET is_breaking_news = false, breaking_news_until = NULL WHERE is_breaking_news = true');
    
    const duration = endTiming(startTime);
    
    logger.info('Breaking news cleared', {
      duration: `${Math.round(duration)}ms`
    });
    
    sendSuccessResponse(res, { message: 'Breaking news cleared successfully' }, 'CLEAR_BREAKING_NEWS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to clear breaking news');
  }
});

// Upload image/PDF for news article (admin endpoint)
router.post('/:id/upload-image', ...adminMiddleware(), uploadNewsFile.single('image'), handleUploadError, async (req, res) => {
  const warnings = [];

  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Check if news article exists
    const newsResult = await executeQuery(
      'SELECT * FROM news WHERE id = $1',
      [parseInt(id)]
    );

    if (newsResult.rows.length === 0) {
      // Delete uploaded file if article doesn't exist
      const deleteResult = await safeDeleteFile(`/uploads/news/${file.filename}`);
      if (!deleteResult.success && deleteResult.error?.serious) {
        logger.error('Failed to delete uploaded file after news not found - serious error', {
          path: file.path,
          error: deleteResult.error
        });
      }
      return sendNotFoundResponse(res, 'News article');
    }

    const news = newsResult.rows[0];

    // Delete old file if it exists
    if (news.featured_image_url) {
      const deleteResult = await safeDeleteFile(news.featured_image_url);

      if (deleteResult.deleted) {
        logger.info('Old news image file deleted successfully', {
          path: news.featured_image_url
        });
      } else if (!deleteResult.success && deleteResult.error?.serious) {
        // Track serious cleanup failures
        warnings.push({
          type: 'OLD_FILE_CLEANUP',
          message: `Failed to delete old file: ${deleteResult.error.message}`,
          path: news.featured_image_url,
          serious: true
        });
        logger.error('Serious error deleting old news image file', {
          path: news.featured_image_url,
          error: deleteResult.error
        });
      } else if (!deleteResult.success) {
        // Non-serious error (file not found, etc.)
        warnings.push({
          type: 'OLD_FILE_CLEANUP',
          message: `Old file cleanup issue: ${deleteResult.error?.message || 'Unknown'}`,
          path: news.featured_image_url,
          serious: false
        });
      }
    }

    // Update database with new file path
    const filePath = `/uploads/news/${file.filename}`;
    await executeQuery(
      'UPDATE news SET featured_image_url = $1, updated_at = NOW() WHERE id = $2',
      [filePath, parseInt(id)]
    );

    logger.info('News article file uploaded successfully', {
      articleId: id,
      filename: file.filename,
      filePath,
      warnings: warnings.length > 0 ? warnings : undefined
    });

    const response = {
      success: true,
      image: {
        filePath: filePath
      }
    };

    // Include warnings in response if any occurred
    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    res.json(response);
  } catch (error) {
    logger.error('Error uploading news article file:', error);
    sendErrorResponse(res, error, 'Failed to upload file');
  }
});

export default router;
