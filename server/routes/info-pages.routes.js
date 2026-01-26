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
import { rateLimitConfig } from '../config/security.js';
import { UPLOAD_ERRORS, UPLOAD_SUCCESS_MESSAGES } from '../utils/uploadConstants.js';
import { generateSlug, generateUniqueSlug, validateSlugInput } from '../utils/slugUtils.js';
import { generateUniqueSlugInTransaction, generateRequestIdFromReq } from '../services/slugGenerationService.js';
import { executeTransaction } from '../config/database.js';
import { safeDeleteFile } from '../utils/fileUtils.js';

const router = express.Router();


// Get info pages with basic information (simplified) - ADMIN ONLY (all entries)
router.get('/', async (req, res) => {
  try {
    const startTime = startTiming();
    const result = await executeQuery(
      'SELECT * FROM info_pages ORDER BY display_order, title',
      []
    );
    const duration = endTiming(startTime);
    
    const infoPages = result.rows || result;
    
    logger.info('Optimized info pages query completed', {
      duration: `${Math.round(duration)}ms`,
      pageCount: infoPages.length,
      queryType: 'BASIC'
    });
    
    sendSuccessResponse(res, infoPages, 'GET_INFO_PAGES', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch info pages');
  }
});

// Get published info pages for user view
router.get('/published', async (req, res) => {
  try {
    const startTime = startTiming();
    const result = await executeQuery(
      'SELECT * FROM info_pages WHERE status = $1 ORDER BY display_order, title',
      ['PUBLISHED']
    );
    const duration = endTiming(startTime);
    
    const infoPages = result.rows || result;
    
    logger.info('Published info pages query completed', {
      duration: `${Math.round(duration)}ms`,
      pageCount: infoPages.length,
      queryType: 'PUBLISHED'
    });
    
    sendSuccessResponse(res, infoPages, 'GET_PUBLISHED_INFO_PAGES', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch published info pages');
  }
});

// Get individual info page by slug
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const startTime = startTiming();
  
  try {
    const result = await executeQuery(
      'SELECT * FROM info_pages WHERE slug = $1 AND status = $2',
      [slug, 'PUBLISHED']
    );
    const duration = endTiming(startTime);
    
    if (!result || result.rows.length === 0) {
      logger.info('Info page not found', { slug, duration: `${Math.round(duration)}ms` });
      return sendNotFoundResponse(res, 'Info page');
    }
    
    const infoPage = result.rows[0];
    
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
router.post('/', ...adminMiddleware(), async (req, res) => {
  try {
    // Sanitize input data to prevent XSS
    const sanitizedData = sanitizeEntity.infoPage(req.body);
    const { 
      title, slug, content, excerpt, category, display_order, status, 
      file_url, file_type, file_description, additional_links, tags, published_at 
    } = sanitizedData;
    
    // Normalize and coerce types
    const normalizedData = normalizeData(sanitizedData, {
      display_order: { type: 'int', fallback: 0 },
      status: { type: 'string', fallback: 'DRAFT' }
    });
    const tagsArray = Array.isArray(tags) ? tags : (typeof tags === 'string' ? [tags] : []);
    const additionalLinksArray = Array.isArray(additional_links) ? additional_links : [];
    
    const startTime = startTiming();
    
        // Move slug generation inside transaction for atomicity
        const infoPage = await executeTransaction(async (client) => {
          // Generate unique slug using centralized service
          const requestId = generateRequestIdFromReq(req);
          const uniqueSlug = await generateUniqueSlugInTransaction(
            client, 
            title, 
            'info_pages', 
            requestId
          );

          // Create info page with unique slug
          const result = await client.query(
            `INSERT INTO info_pages (title, slug, content, excerpt, category, display_order, status,
             file_url, file_type, file_description, additional_links, tags, published_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [title, uniqueSlug, content, excerpt, category, normalizedData.display_order, normalizedData.status,
             file_url, file_type, file_description, JSON.stringify(additionalLinksArray), tagsArray, published_at]
          );

          return result.rows[0];
        });
    
    const duration = endTiming(startTime);
    
    res.status(201).json({
      success: true,
      data: infoPage,
      meta: { queryType: 'CREATE_INFO_PAGE', duration }
    });
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to create info page');
  }
});

// Update info page (admin endpoint)
router.put('/:id', ...adminMiddleware(), async (req, res) => { // Optimistic locking removed
  const { id } = req.params;
  // Sanitize input data to prevent XSS
  const sanitizedData = sanitizeEntity.infoPage(req.body);
  
  // Normalize and coerce types (same as CREATE route)
  const normalizedData = normalizeData(sanitizedData, {
    display_order: { type: 'int', fallback: 0 },
    status: { type: 'string', fallback: 'DRAFT' }
  });
  
  const { 
    title, slug, content, excerpt, category, 
    file_url, file_type, file_description, additional_links, tags, published_at 
  } = sanitizedData;
  
  // Coerce tags to text[] and additional_links to JSONB
  const tagsArray = Array.isArray(tags) ? tags : (typeof tags === 'string' ? [tags] : []);
  const additionalLinksArray = Array.isArray(additional_links) ? additional_links : [];
  
  await executeCrudOperation(
    'update',
    `UPDATE info_pages SET title = $1, slug = $2, content = $3, excerpt = $4, 
     category = $5, display_order = $6, status = $7, file_url = $8, 
     file_type = $9, file_description = $10, additional_links = $11, tags = $12, published_at = $13, 
     updated_at = NOW() WHERE id = $14 RETURNING *`,
    [title, slug, content, excerpt, category, normalizedData.display_order, normalizedData.status, 
     file_url, file_type, file_description, JSON.stringify(additionalLinksArray), tagsArray, published_at, parseInt(id)],
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

// Universal file upload for info page (admin endpoint)
router.post('/:id/upload-file', ...adminMiddleware(), uploadInfoPageFile.single('file'), handleUploadError, async (req, res) => {
  const warnings = [];

  try {
    const { id } = req.params;
    const { description } = req.body; // Custom description from form
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: UPLOAD_ERRORS.NO_FILE
      });
    }

    // Detect file type based on mimetype
    const fileType = file.mimetype.startsWith('image/') ? 'image' : 'pdf';

    // Validate file type
    if (!['image/', 'application/pdf'].some(t => file.mimetype.includes(t))) {
      // Use async file deletion
      const deleteResult = await safeDeleteFile(`/../../${file.path}`);
      if (!deleteResult.success && deleteResult.error?.serious) {
        logger.error('Failed to delete invalid file type upload - serious error', {
          path: file.path,
          error: deleteResult.error
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Only images and PDFs are allowed'
      });
    }

    // Check if info page exists
    const pageResult = await executeQuery(
      'SELECT * FROM info_pages WHERE id = $1',
      [parseInt(id)]
    );

    if (pageResult.rows.length === 0) {
      // Delete uploaded file if page doesn't exist
      const deleteResult = await safeDeleteFile(`/../../${file.path}`);
      if (!deleteResult.success && deleteResult.error?.serious) {
        logger.error('Failed to delete uploaded file after info page not found - serious error', {
          path: file.path,
          error: deleteResult.error
        });
      }
      return sendNotFoundResponse(res, 'Info page');
    }

    const page = pageResult.rows[0];

    // Delete old file if it exists
    if (page.file_url) {
      const deleteResult = await safeDeleteFile(page.file_url);

      if (deleteResult.deleted) {
        logger.info('Old info page file deleted successfully', {
          path: page.file_url
        });
      } else if (!deleteResult.success && deleteResult.error?.serious) {
        // Track serious cleanup failures
        warnings.push({
          type: 'OLD_FILE_CLEANUP',
          message: `Failed to delete old file: ${deleteResult.error.message}`,
          path: page.file_url,
          serious: true
        });
        logger.error('Serious error deleting old info page file', {
          path: page.file_url,
          error: deleteResult.error
        });
      } else if (!deleteResult.success) {
        // Non-serious error (file not found, etc.)
        warnings.push({
          type: 'OLD_FILE_CLEANUP',
          message: `Old file cleanup issue: ${deleteResult.error?.message || 'Unknown'}`,
          path: page.file_url,
          serious: false
        });
      }
    }

    // Update database with new file path, type, and description
    const filePath = `/uploads/info-pages/${file.filename}`;
    await executeQuery(
      'UPDATE info_pages SET file_url = $1, file_type = $2, file_description = $3, updated_at = NOW() WHERE id = $4',
      [filePath, fileType, description || '', parseInt(id)]
    );

    logger.info('Info page file uploaded successfully', {
      pageId: id,
      filename: file.filename,
      filePath,
      fileType,
      description,
      warnings: warnings.length > 0 ? warnings : undefined
    });

    const response = {
      success: true,
      message: `File uploaded successfully`,
      file: {
        filePath: filePath,
        fileType: fileType
      }
    };

    // Include warnings in response if any occurred
    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    res.json(response);
  } catch (error) {
    logger.error('Error uploading info page file:', error);
    sendErrorResponse(res, error, 'Failed to upload file');
  }
});

export default router;
