import express from 'express';
import optimizedQueryService from '../services/optimizedQueryService.js';
import { 
  startTiming, 
  endTiming, 
  sendSuccessResponse, 
  sendErrorResponse, 
  sendNotFoundResponse,
  executeCrudOperation,
  adminMiddleware,
  normalizeData
} from '../utils/routeHelpers.js';
import logger from '../config/logger.js';

const router = express.Router();

// Get individual info page by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const startTime = startTiming();
  
  try {
    const infoPage = await optimizedQueryService.getInfoPageById(parseInt(id));
    const duration = endTiming(startTime);
    
    if (!infoPage) {
      logger.info('Info page not found', { id, duration: `${Math.round(duration)}ms` });
      return sendNotFoundResponse(res, 'Info page');
    }
    
    logger.info('Optimized info page by ID query completed', {
      id,
      duration: `${Math.round(duration)}ms`,
      queryType: 'BASIC'
    });
    
    sendSuccessResponse(res, infoPage, 'GET_INFO_PAGE', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch info page by ID');
  }
});

// Get info pages with basic information (simplified)
router.get('/', async (req, res) => {
  try {
    const startTime = startTiming();
    const infoPages = await optimizedQueryService.getInfoPagesWithDetails();
    const duration = endTiming(startTime);
    
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

// Get info page by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const startTime = startTiming();
    const infoPage = await optimizedQueryService.getInfoPageBySlugWithDetails(slug);
    const duration = endTiming(startTime);
    
    if (!infoPage) {
      return sendNotFoundResponse(res, 'Info page not found');
    }
    
    logger.info('Optimized info page by slug query completed', {
      slug,
      pageId: infoPage.id,
      duration: `${Math.round(duration)}ms`,
      queryType: 'BASIC'
    });
    
    sendSuccessResponse(res, infoPage, 'GET_INFO_PAGE_BY_SLUG', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch info page by slug');
  }
});

// Create info page (admin endpoint)
router.post('/', ...adminMiddleware(), async (req, res) => {
  const { 
    title, slug, content, excerpt, category, order, status, 
    featuredImageUrl, metaDescription, tags, isPublished, publishedAt 
  } = req.body;
  
  // Normalize data using schema
  const normalizedData = normalizeData(req.body, {
    tags: { type: 'json', fallback: [] },
    order: { type: 'int', fallback: 0 },
    status: { type: 'string', fallback: 'DRAFT' }
  });
  
  await executeCrudOperation(
    'create',
    `INSERT INTO info_pages (title, slug, content, excerpt, category, "order", status, 
     "featuredImageUrl", "metaDescription", tags, "isPublished", "publishedAt") 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [title, slug, content, excerpt, category, normalizedData.order, normalizedData.status, 
     featuredImageUrl, metaDescription, normalizedData.tags, isPublished, publishedAt],
    'info page',
    'CREATE_INFO_PAGE',
    res
  );
});

// Update info page (admin endpoint)
router.put('/:id', ...adminMiddleware(), async (req, res) => {
  const { id } = req.params;
  const { 
    title, slug, content, excerpt, category, order, status, 
    featuredImageUrl, metaDescription, tags, isPublished, publishedAt 
  } = req.body;
  
  // Normalize data using schema
  const normalizedData = normalizeData(req.body, {
    tags: { type: 'json', fallback: [] }
  });
  
  await executeCrudOperation(
    'update',
    `UPDATE info_pages SET title = $1, slug = $2, content = $3, excerpt = $4, 
     category = $5, "order" = $6, status = $7, "featuredImageUrl" = $8, 
     "metaDescription" = $9, tags = $10, "isPublished" = $11, "publishedAt" = $12, 
     updated_at = NOW() WHERE id = $13 RETURNING *`,
    [title, slug, content, excerpt, category, order, status, 
     featuredImageUrl, metaDescription, normalizedData.tags, isPublished, publishedAt, parseInt(id)],
    'info page',
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
    'info page',
    'DELETE_INFO_PAGE',
    res
  );
});

export default router;
