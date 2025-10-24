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
import { 
  validateSchnellzugriff, 
  validateSchnellzugriffId 
} from '../middleware/validation.js';

const router = express.Router();

// Get individual schnellzugriff link by ID
router.get('/:id', async (req, res) => {
  const startTime = startTiming();
  
  try {
    const result = await executeQuery(
      'SELECT id, title, description, url, icon, color, sort_order, is_active, is_external, created_at, updated_at FROM schnellzugriff_links WHERE id = $1',
      [safeParseInt(req.params.id)]
    );
    const duration = endTiming(startTime);
    
    if (result.rows.length === 0) {
      logger.info('Schnellzugriff link not found', { id: req.params.id, duration: `${Math.round(duration)}ms` });
      return sendNotFoundResponse(res, 'Schnellzugriff link');
    }
    
    logger.info('Schnellzugriff by ID query completed', {
      id: req.params.id,
      duration: `${Math.round(duration)}ms`,
      queryType: 'DIRECT'
    });
    
    sendSuccessResponse(res, result.rows[0], 'GET_SCHNELLZUGRIFF', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch schnellzugriff by ID');
  }
});

// Public endpoint to get Schnellzugriff links
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT id, title, description, url, icon, color, sort_order, is_active, is_external, created_at, updated_at
      FROM schnellzugriff_links 
      WHERE is_active = true 
      ORDER BY sort_order ASC, created_at ASC
    `;
    
    const result = await executeQuery(query);
    sendSuccessResponse(res, result.rows, 'GET_SCHNELLZUGRIFF_LIST', 0);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch Schnellzugriff links');
  }
});

// Admin endpoint to get all Schnellzugriff links (including inactive ones)
router.get('/admin/all', ...adminMiddleware(), async (req, res) => {
  try {
    const query = `
      SELECT id, title, description, url, icon, color, sort_order, is_active, is_external, created_at, updated_at
      FROM schnellzugriff_links 
      ORDER BY sort_order ASC, created_at ASC
    `;
    
    const result = await executeQuery(query);
    sendSuccessResponse(res, result.rows, 'GET_ADMIN_SCHNELLZUGRIFF', 0);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch admin Schnellzugriff links');
  }
});

// Create schnellzugriff link (admin endpoint)
router.post('/', ...adminMiddleware(), ...validateSchnellzugriff, async (req, res) => { // Idempotency removed
  // Sanitize input data to prevent XSS
  const sanitizedData = sanitizeEntity.schnellzugriff(req.body);
  const { title, description, url, icon, color, sortOrder, isActive, isExternal } = sanitizedData;
  
  await executeCrudOperation(
    'create',
    `INSERT INTO schnellzugriff_links (title, description, url, icon, color, sort_order, is_active, is_external)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [title, description, url, icon || '🔗', color || 'blue', 
     sortOrder || 0, isActive !== false, isExternal !== false],
    'schnellzugriff',
    'CREATE_SCHNELLZUGRIFF',
    res
  );
  
  // Cache clearing removed - using simple polling instead
});

// Update schnellzugriff link (admin endpoint)
router.put('/:id', ...adminMiddleware(), ...validateSchnellzugriffId, ...validateSchnellzugriff, async (req, res) => { // Optimistic locking removed
  const { id } = req.params;
  // Sanitize input data to prevent XSS
  const sanitizedData = sanitizeEntity.schnellzugriff(req.body);
  const { title, description, url, icon, color, sortOrder, isActive, isExternal } = sanitizedData;
  
  await executeCrudOperation(
    'update',
    `UPDATE schnellzugriff_links 
     SET title = $1, description = $2, url = $3, icon = $4, color = $5, 
         sort_order = $6, is_active = $7, is_external = $8, updated_at = CURRENT_TIMESTAMP
     WHERE id = $9
     RETURNING *`,
    [title, description, url, icon, color, sortOrder, isActive, isExternal, parseInt(id)],
    'schnellzugriff',
    'UPDATE_SCHNELLZUGRIFF',
    res
  );
  
  // Cache clearing removed - using simple polling instead
});

// Delete schnellzugriff link (admin endpoint)
router.delete('/:id', ...adminMiddleware(), ...validateSchnellzugriffId, async (req, res) => {
  const { id } = req.params;
  
  await executeCrudOperation(
    'delete',
    'DELETE FROM schnellzugriff_links WHERE id = $1 RETURNING *',
    [parseInt(id)],
    'schnellzugriff',
    'DELETE_SCHNELLZUGRIFF',
    res
  );
  
  // Cache clearing removed - using simple polling instead
});

export default router;
