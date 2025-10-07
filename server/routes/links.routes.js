import express from 'express';
import optimizedQueryService from '../services/optimizedQueryService.js';
import { 
  startTiming, 
  endTiming, 
  sendSuccessResponse, 
  sendErrorResponse, 
  sendNotFoundResponse,
  executeCrudOperation,
  adminMiddleware
} from '../utils/routeHelpers.js';
import logger from '../config/logger.js';

const router = express.Router();

// Get individual link by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const startTime = startTiming();
  
  try {
    const link = await optimizedQueryService.getLinkById(parseInt(id));
    const duration = endTiming(startTime);
    
    if (!link) {
      logger.info('Link not found', { id, duration: `${Math.round(duration)}ms` });
      return sendNotFoundResponse(res, 'Link');
    }
    
    logger.info('Optimized link by ID query completed', {
      id,
      duration: `${Math.round(duration)}ms`,
      queryType: 'BASIC'
    });
    
    sendSuccessResponse(res, link, 'GET_LINK', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch link by ID');
  }
});

// Get links with basic information (simplified)
router.get('/', async (req, res) => {
  try {
    const startTime = startTiming();
    const links = await optimizedQueryService.getLinksWithDetails();
    const duration = endTiming(startTime);
    
    logger.info('Optimized links query completed', {
      duration: `${Math.round(duration)}ms`,
      linkCount: links.length,
      queryType: 'BASIC'
    });
    
    sendSuccessResponse(res, links, 'GET_LINKS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch links');
  }
});

// Create link (admin endpoint)
router.post('/', ...adminMiddleware(), async (req, res) => {
  const { title, description, url, icon, category, isExternal, color, sortOrder, isActive } = req.body;
  
  await executeCrudOperation(
    'create',
    `INSERT INTO links (title, description, url, icon, category, is_external, color, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [title, description, url, icon || '🔗', category || 'Sonstiges', 
     isExternal || false, color || 'blue', sortOrder || 0, isActive !== false],
    'link',
    'CREATE_LINK',
    res
  );
});

// Update link (admin endpoint)
router.put('/:id', ...adminMiddleware(), async (req, res) => {
  const { id } = req.params;
  const { title, description, url, icon, category, isExternal, color, sortOrder, isActive } = req.body;
  
  await executeCrudOperation(
    'update',
    `UPDATE links 
     SET title = $1, description = $2, url = $3, icon = $4, category = $5, 
         is_external = $6, color = $7, sort_order = $8, is_active = $9, updated_at = CURRENT_TIMESTAMP
     WHERE id = $10
     RETURNING *`,
    [title, description, url, icon, category, isExternal, color, sortOrder, isActive, parseInt(id)],
    'link',
    'UPDATE_LINK',
    res
  );
});

// Delete link (admin endpoint)
router.delete('/:id', ...adminMiddleware(), async (req, res) => {
  const { id } = req.params;
  
  await executeCrudOperation(
    'delete',
    'DELETE FROM links WHERE id = $1 RETURNING *',
    [parseInt(id)],
    'link',
    'DELETE_LINK',
    res
  );
});

export default router;
