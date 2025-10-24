import express from 'express';
import fs from 'fs';
import path from 'path';
// Optimized query service removed - using simple database queries
import { 
  startTiming, 
  endTiming, 
  sendSuccessResponse, 
  sendErrorResponse, 
  sendNotFoundResponse,
  executeCrudOperation,
  normalizeData,
  executeQuery
} from '../utils/simpleRouteHelpers.js';
import { adminMiddleware } from '../middleware/simpleAuth.js';
// Idempotency and optimistic locking removed - using simple error handling instead
import logger from '../config/logger.js';
import { sanitizeEntity } from '../utils/sanitization.js';
import { uploadInfoPageFile, handleUploadError } from '../middleware/upload.js';

const router = express.Router();


// Get info pages with basic information (simplified)
router.get('/', async (req, res) => {
  try {
    const startTime = startTiming();
    const infoPages = await executeQuery(
      'SELECT * FROM info_pages ORDER BY title',
      []
    );
    const duration = endTiming(startTime);
    
    logger.info('Optimized info pages query completed', {
      duration: `${Math.round(duration)}ms`,
      pageCount: infoPages.length,
      queryType: 'BASIC'
    });
    
    sendSuccessResponse(res, infoPages.rows || infoPages, 'GET_INFO_PAGES', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch info pages');
  }
});

// Get individual info page by slug
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const startTime = startTiming();
  
  try {
    const infoPage = await executeQuery(
      'SELECT * FROM info_pages WHERE slug = $1',
      [slug]
    );
    const duration = endTiming(startTime);
    
    if (!infoPage) {
      logger.info('Info page not found', { slug, duration: `${Math.round(duration)}ms` });
      return sendNotFoundResponse(res, 'Info page');
    }
    
    logger.info('Optimized info page by slug query completed', {
      slug,
      duration: `${Math.round(duration)}ms`,
      queryType: 'BASIC'
    });
    
    sendSuccessResponse(res, infoPage, 'GET_INFO_PAGE', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch info page by slug');
  }
});

// Create info page (admin endpoint)
router.post('/', ...adminMiddleware(), async (req, res) => { // Idempotency removed
  // Sanitize input data to prevent XSS
  const sanitizedData = sanitizeEntity.infoPage(req.body);
  const { 
    title, slug, content, excerpt, category, order, status, 
    featured_image_url, meta_description, tags, is_published, published_at 
  } = sanitizedData;
  
  // Normalize and coerce types
  const normalizedData = normalizeData(sanitizedData, {
    order: { type: 'int', fallback: 0 },
    status: { type: 'string', fallback: 'DRAFT' }
  });
  const tagsArray = Array.isArray(tags) ? tags : (typeof tags === 'string' ? [tags] : []);
  
  await executeCrudOperation(
    'create',
    `INSERT INTO info_pages (title, slug, content, excerpt, category, display_order, status, 
     featured_image_url, meta_description, tags, is_published, published_at) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [title, slug, content, excerpt, category, normalizedData.order, normalizedData.status, 
     featured_image_url, meta_description, tagsArray, is_published, published_at],
    'info-pages',
    'CREATE_INFO_PAGE',
    res
  );
});

// Update info page (admin endpoint)
router.put('/:id', ...adminMiddleware(), async (req, res) => { // Optimistic locking removed
  const { id } = req.params;
  // Sanitize input data to prevent XSS
  const sanitizedData = sanitizeEntity.infoPage(req.body);
  const { 
    title, slug, content, excerpt, category, order, status, 
    featured_image_url, meta_description, tags, is_published, published_at 
  } = sanitizedData;
  
  // Coerce tags to text[]
  const tagsArray = Array.isArray(tags) ? tags : (typeof tags === 'string' ? [tags] : []);
  
  await executeCrudOperation(
    'update',
    `UPDATE info_pages SET title = $1, slug = $2, content = $3, excerpt = $4, 
     category = $5, display_order = $6, status = $7, featured_image_url = $8, 
     meta_description = $9, tags = $10, is_published = $11, published_at = $12, 
     updated_at = NOW() WHERE id = $13 RETURNING *`,
    [title, slug, content, excerpt, category, order, status, 
     featured_image_url, meta_description, tagsArray, is_published, published_at, parseInt(id)],
    'info-pages',
    'UPDATE_INFO_PAGE',
    res
  );
});

// Delete info page (admin endpoint)
router.delete('/:id', ...adminMiddleware(), async (req, res) => {
  const { id } = req.params;
  
  await executeCrudOperation(
    'delete',
    'DELETE FROM info_pages WHERE id = $1 RETURNING *',
    [parseInt(id)],
    'info-pages',
    'DELETE_INFO_PAGE',
    res
  );
});

// Upload image/PDF for info page (admin endpoint)
router.post('/:id/upload-image', ...adminMiddleware(), uploadInfoPageFile.single('image'), handleUploadError, async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    // Check if info page exists
    const pageResult = await executeQuery(
      'SELECT * FROM info_pages WHERE id = $1',
      [parseInt(id)]
    );
    
    if (pageResult.rows.length === 0) {
      // Delete uploaded file if page doesn't exist
      fs.unlinkSync(file.path);
      return sendNotFoundResponse(res, 'Info page');
    }
    
    const page = pageResult.rows[0];
    
    // Delete old file if it exists
    if (page.featured_image_url) {
      const oldFilePath = path.join(process.cwd(), 'public', page.featured_image_url);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }
    
    // Update database with new file path
    const filePath = `/uploads/info-pages/${file.filename}`;
    await executeQuery(
      'UPDATE info_pages SET featured_image_url = $1, updated_at = NOW() WHERE id = $2',
      [filePath, parseInt(id)]
    );
    
    logger.info('Info page file uploaded successfully', {
      pageId: id,
      filename: file.filename,
      filePath
    });
    
    res.json({
      success: true,
      image: {
        filePath: filePath
      }
    });
  } catch (error) {
    logger.error('Error uploading info page file:', error);
    sendErrorResponse(res, error, 'Failed to upload file');
  }
});

export default router;
