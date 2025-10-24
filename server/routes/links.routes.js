import express from 'express';
// Optimized query service removed - using simple database queries
import { executeQuery } from '../config/database.js';
import { 
  startTiming, 
  endTiming, 
  sendSuccessResponse, 
  sendErrorResponse, 
  sendNotFoundResponse,
  executeCrudOperation,
  safeParseInt
} from '../utils/simpleRouteHelpers.js';
import { adminMiddleware } from '../middleware/simpleAuth.js';
// Idempotency and optimistic locking removed - using simple error handling instead
import logger from '../config/logger.js';
import { sanitizeEntity } from '../utils/sanitization.js';

const router = express.Router();

// Get individual link by ID
router.get('/:id', async (req, res) => {
  const startTime = startTiming();
  
  try {
    const result = await executeQuery(
      'SELECT * FROM links WHERE id = $1',
      [safeParseInt(req.params.id)]
    );
    const duration = endTiming(startTime);
    
    if (result.rows.length === 0) {
      logger.info('Link not found', { id: req.params.id, duration: `${Math.round(duration)}ms` });
      return sendNotFoundResponse(res, 'Link');
    }
    
    logger.info('Link by ID query completed', {
      id: req.params.id,
      duration: `${Math.round(duration)}ms`,
      queryType: 'DIRECT'
    });
    
    sendSuccessResponse(res, result.rows[0], 'GET_LINK', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch link by ID');
  }
});

// Get links with basic information (simplified)
router.get('/', async (req, res) => {
  try {
    const startTime = startTiming();
    const result = await executeQuery(
      'SELECT * FROM links WHERE is_active = true ORDER BY category, sort_order, title'
    );
    const duration = endTiming(startTime);
    
    logger.info('Links query completed', {
      duration: `${Math.round(duration)}ms`,
      linkCount: result.rows.length,
      queryType: 'DIRECT'
    });
    
    sendSuccessResponse(res, result.rows, 'GET_LINKS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch links');
  }
});

// Create link (admin endpoint)
router.post('/', ...adminMiddleware(), async (req, res) => { // Idempotency removed
  // Sanitize input data to prevent XSS
  const sanitizedData = sanitizeEntity.link(req.body);
  
  // Proper boolean and number normalization
  const normalizedData = {
    title: sanitizedData.title,
    description: sanitizedData.description || '',
    url: sanitizedData.url,
    icon: sanitizedData.icon || '🔗',
    category: sanitizedData.category || 'Sonstiges',
    // Correct boolean handling: treat false/'false' as false, everything else as true if not explicitly false
    isExternal: sanitizedData.isExternal !== false && sanitizedData.isExternal !== 'false',
    color: sanitizedData.color || 'blue',
    sortOrder: parseInt(sanitizedData.sortOrder) || 0,
    isActive: sanitizedData.isActive !== false && sanitizedData.isActive !== 'false'
  };
  
  await executeCrudOperation(
    'create',
    `INSERT INTO links (title, description, url, icon, category, is_external, color, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [normalizedData.title, normalizedData.description, normalizedData.url, 
     normalizedData.icon, normalizedData.category, normalizedData.isExternal, 
     normalizedData.color, normalizedData.sortOrder, normalizedData.isActive],
    'links',
    'CREATE_LINK',
    res
  );
  
  // Cache clearing removed - using simple polling instead
});

// Update link (admin endpoint)
router.put('/:id', ...adminMiddleware(), async (req, res) => { // Optimistic locking removed
  const { id } = req.params;
  // Sanitize input data to prevent XSS
  const sanitizedData = sanitizeEntity.link(req.body);
  
  // Log incoming data for debugging
  logger.info('Links UPDATE attempt', {
    id,
    sanitizedData,
    rawBody: req.body
  });
  
  // Proper boolean and number normalization
  const normalizedData = {
    title: sanitizedData.title,
    description: sanitizedData.description || '',
    url: sanitizedData.url,
    icon: sanitizedData.icon || '🔗',
    category: sanitizedData.category || 'Sonstiges',
    isExternal: sanitizedData.isExternal !== false && sanitizedData.isExternal !== 'false',
    color: sanitizedData.color || 'blue',
    sortOrder: parseInt(sanitizedData.sortOrder) || 0,
    isActive: sanitizedData.isActive !== false && sanitizedData.isActive !== 'false'
  };
  
  // Log normalized data
  logger.info('Links UPDATE normalized data', {
    normalizedData,
    params: [normalizedData.title, normalizedData.description, normalizedData.url, 
             normalizedData.icon, normalizedData.category, normalizedData.isExternal, 
             normalizedData.color, normalizedData.sortOrder, normalizedData.isActive, parseInt(id)]
  });
  
  await executeCrudOperation(
    'update',
    `UPDATE links 
     SET title = $1, description = $2, url = $3, icon = $4, category = $5, 
         is_external = $6, color = $7, sort_order = $8, is_active = $9, updated_at = CURRENT_TIMESTAMP
     WHERE id = $10
     RETURNING *`,
    [normalizedData.title, normalizedData.description, normalizedData.url, 
     normalizedData.icon, normalizedData.category, normalizedData.isExternal, 
     normalizedData.color, normalizedData.sortOrder, normalizedData.isActive, parseInt(id)],
    'links',
    'UPDATE_LINK',
    res
  );
  
  // Cache clearing removed - using simple polling instead
});

// Delete link (admin endpoint)
router.delete('/:id', ...adminMiddleware(), async (req, res) => {
  const { id } = req.params;
  
  await executeCrudOperation(
    'delete',
    'DELETE FROM links WHERE id = $1 RETURNING *',
    [parseInt(id)],
    'links',
    'DELETE_LINK',
    res
  );
  
  // Cache clearing removed - using simple polling instead
});

export default router;
