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

// Get individual city tip by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const startTime = startTiming();
  
  try {
    const cityTip = await optimizedQueryService.getCityTipById(parseInt(id));
    const duration = endTiming(startTime);
    
    if (!cityTip) {
      logger.info('City tip not found', { id, duration: `${Math.round(duration)}ms` });
      return sendNotFoundResponse(res, 'City tip');
    }
    
    logger.info('Optimized city tip by ID query completed', {
      id,
      duration: `${Math.round(duration)}ms`,
      queryType: 'BASIC'
    });
    
    sendSuccessResponse(res, cityTip, 'GET_CITY_TIP', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch city tip by ID');
  }
});

// Get city tips with filtering (merged duplicate endpoints)
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      featured, 
      sortBy = 'name', 
      searchTerm, 
      limit = 50, 
      offset = 0 
    } = req.query;
    
    const startTime = startTiming();
    
    const options = {
      category: category || null,
      featured: featured !== undefined ? featured === 'true' : null,
      sortBy,
      searchTerm: searchTerm || null,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    
    const data = await optimizedQueryService.getCityTips(options);
    
    const duration = endTiming(startTime);
    
    logger.info('City tips fetched successfully', {
      count: data.length,
      options,
      duration: `${Math.round(duration)}ms`
    });
    
    sendSuccessResponse(res, data, 'GET_CITY_TIPS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch city tips');
  }
});

// Get city tip by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const startTime = startTiming();
    
    const data = await optimizedQueryService.getCityTipBySlug(slug);
    
    const duration = endTiming(startTime);
    
    if (!data) {
      return sendNotFoundResponse(res, 'City tip not found');
    }
    
    logger.info('City tip fetched by slug successfully', {
      slug,
      tipId: data.id,
      duration: `${Math.round(duration)}ms`
    });
    
    sendSuccessResponse(res, data, 'GET_CITY_TIP_BY_SLUG', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch city tip by slug');
  }
});

// Create city tip (admin endpoint)
router.post('/', ...adminMiddleware(), async (req, res) => {
  const { 
    name, category, description, address, latitude, longitude,
    price_range, opening_hours, contact_info, website, images, slug,
    tips, is_featured, status = 'ACTIVE'
  } = req.body;
  
  // Normalize data using schema
  const normalizedData = normalizeData(req.body, {
    opening_hours: { type: 'json', fallback: {} },
    contact_info: { type: 'json', fallback: {} },
    images: { type: 'json', fallback: [] },
    status: { type: 'string', fallback: 'ACTIVE' }
  });
  
  await executeCrudOperation(
    'create',
    `INSERT INTO city_tips (name, category, description, address, latitude, longitude, 
     price_range, opening_hours, contact_info, website, images, slug, tips, is_featured, status) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
    [name, category, description, address, latitude, longitude, 
     price_range, normalizedData.opening_hours, normalizedData.contact_info, 
     website, normalizedData.images, slug, tips, is_featured, normalizedData.status],
    'city tip',
    'CREATE_CITY_TIP',
    res
  );
});

// Update city tip (admin endpoint)
router.put('/:id', ...adminMiddleware(), async (req, res) => {
  const { id } = req.params;
  const { 
    name, category, description, address, latitude, longitude,
    price_range, opening_hours, contact_info, website, images 
  } = req.body;
  
  // Normalize data using schema
  const normalizedData = normalizeData(req.body, {
    opening_hours: { type: 'json', fallback: {} },
    contact_info: { type: 'json', fallback: {} },
    images: { type: 'json', fallback: [] }
  });
  
  await executeCrudOperation(
    'update',
    `UPDATE city_tips SET name = $1, category = $2, description = $3, 
     address = $4, latitude = $5, longitude = $6, price_range = $7, 
     opening_hours = $8, contact_info = $9, website = $10, images = $11, 
     updated_at = NOW() WHERE id = $12 RETURNING *`,
    [name, category, description, address, latitude, longitude, 
     price_range, normalizedData.opening_hours, normalizedData.contact_info, 
     website, normalizedData.images, parseInt(id)],
    'city tip',
    'UPDATE_CITY_TIP',
    res
  );
});

// Delete city tip (admin endpoint)
router.delete('/:id', ...adminMiddleware(), async (req, res) => {
  const { id } = req.params;
  
  await executeCrudOperation(
    'delete',
    'DELETE FROM city_tips WHERE id = $1 RETURNING *',
    [parseInt(id)],
    'city tip',
    'DELETE_CITY_TIP',
    res
  );
});

export default router;
