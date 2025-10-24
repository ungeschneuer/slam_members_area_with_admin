import express from 'express';
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
// Query validation removed - using simple validation instead
import logger from '../config/logger.js';
import { 
  validateCityTip, 
  validateCityTipId 
} from '../middleware/validation.js';
import { sanitizeEntity } from '../utils/sanitization.js';
import { entityNormalizers } from '../utils/normalizers.js';
import { cityTipSchema } from '../../shared/schemas/cityTipSchema.js';

const router = express.Router();

// Query validation removed - using simple parameter parsing

// Get city tips with filtering (merged duplicate endpoints)
router.get('/', async (req, res) => {
  try {
    // Simple query parameter parsing
    const { 
      category, 
      sortBy = 'name', 
      searchTerm
    } = req.query;
    
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const startTime = startTiming();
    
    const options = {
      category: category || null,
      sortBy,
      searchTerm: searchTerm || null,
      limit,
      offset
    };
    
    const data = await executeQuery(
      'SELECT id, name, category, description, address, latitude, longitude, price_range, opening_hours, contact_info, website, images, tips, status, slug, created_at, updated_at FROM city_tips ORDER BY name',
      []
    );
    
    const duration = endTiming(startTime);
    
    logger.info('City tips fetched successfully', {
      count: data.length,
      options,
      duration: `${Math.round(duration)}ms`
    });
    
    sendSuccessResponse(res, data.rows || data, 'GET_CITY_TIPS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch city tips');
  }
});

// Get individual city tip by slug
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const startTime = startTiming();
  
  try {
    const cityTip = await executeQuery(
      'SELECT id, name, category, description, address, latitude, longitude, price_range, opening_hours, contact_info, website, images, tips, status, slug, created_at, updated_at FROM city_tips WHERE slug = $1',
      [slug]
    );
    const duration = endTiming(startTime);
    
    if (!cityTip) {
      logger.info('City tip not found', { slug, duration: `${Math.round(duration)}ms` });
      return sendNotFoundResponse(res, 'City tip');
    }
    
    logger.info('Optimized city tip by slug query completed', {
      slug,
      duration: `${Math.round(duration)}ms`,
      queryType: 'BASIC'
    });
    
    sendSuccessResponse(res, cityTip, 'GET_CITY_TIP', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch city tip by slug');
  }
});

// Create city tip (admin endpoint)
router.post('/', ...adminMiddleware(), ...validateCityTip, async (req, res) => { // Idempotency removed
  if (!req.body?.name || !req.body?.category) {
    return sendErrorResponse(res, new Error('Missing required fields'), 'Missing required fields', 400);
  }
  // Sanitize input data to prevent XSS
  const sanitizedData = sanitizeEntity.cityTip(req.body);
  const { 
    name, category, description, address, latitude, longitude,
    price_range, opening_hours, contact_info, website, images, slug,
    tips, status = 'ACTIVE'
    // REMOVED: phone field - database table doesn't have this column
  } = sanitizedData;
  
  // Normalize data using schema
  const normalizedData = normalizeData(sanitizedData, {
    status: { type: 'string', fallback: 'ACTIVE' }
  });
  const normalizedCityTip = entityNormalizers.cityTip(sanitizedData);
  
  await executeCrudOperation(
    'create',
    `INSERT INTO city_tips (name, category, description, address, latitude, longitude, 
     price_range, opening_hours, contact_info, website, images, slug, tips, status) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
    [name, category, description, address, latitude, longitude, 
     price_range, normalizedCityTip.opening_hours, normalizedCityTip.contact_info, 
     normalizedCityTip.website, normalizedCityTip.images, normalizedCityTip.slug, tips, normalizedData.status],
    'city-tips',
    'CREATE_CITY_TIP',
    res
  );
});

// Update city tip (admin endpoint)
router.put('/:id', ...adminMiddleware(), ...validateCityTipId, ...validateCityTip, async (req, res) => { // Optimistic locking removed
  const { id } = req.params;
  try {
    const existing = await executeQuery(
      'SELECT * FROM city_tips WHERE id = $1',
      [parseInt(id)]
    );
    if (!existing) {
      return sendNotFoundResponse(res, 'City tip');
    }

    // Merge existing with provided to avoid NOT NULL errors
    const name = typeof req.body.name === 'string' ? req.body.name : existing.name;
    const category = typeof req.body.category === 'string' ? req.body.category : existing.category;
    const description = req.body.description !== undefined ? req.body.description : existing.description;
    const address = req.body.address !== undefined ? req.body.address : existing.address;
    const latitude = req.body.latitude !== undefined ? req.body.latitude : existing.latitude;
    const longitude = req.body.longitude !== undefined ? req.body.longitude : existing.longitude;
    const price_range = req.body.price_range !== undefined ? req.body.price_range : existing.price_range;

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
       req.body.website !== undefined ? req.body.website : existing.website, normalizedData.images, parseInt(id)],
      'city-tips',
      'UPDATE_CITY_TIP',
      res
    );
  } catch (error) {
    return sendErrorResponse(res, error, 'Failed to update city tip');
  }
});

// Delete city tip (admin endpoint)
router.delete('/:id', ...adminMiddleware(), ...validateCityTipId, async (req, res) => {
  const { id } = req.params;
  
  await executeCrudOperation(
    'delete',
    'DELETE FROM city_tips WHERE id = $1 RETURNING *',
    [parseInt(id)],
    'city-tips',
    'DELETE_CITY_TIP',
    res
  );
});

export default router;
