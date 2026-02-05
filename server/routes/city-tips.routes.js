import express from 'express';
// Optimized query service removed - using simple database queries
import { 
  startTiming, 
  endTiming, 
  sendSuccessResponse, 
  sendErrorResponse, 
  sendNotFoundResponse,
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
import { generateSlug, generateUniqueSlug, validateSlugInput } from '../utils/slugUtils.js';
import { generateUniqueSlugInTransaction, generateRequestIdFromReq } from '../services/slugGenerationService.js';
import { executeTransaction } from '../config/database.js';

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
      'SELECT * FROM city_tips ORDER BY name',
      []
    );

    const duration = endTiming(startTime);

    // Ensure we always return an array
    let cityTips = [];
    if (data && Array.isArray(data.rows)) {
      cityTips = data.rows;
    } else if (Array.isArray(data)) {
      cityTips = data;
    } else {
      logger.warn('City tips query returned unexpected data structure', {
        dataType: typeof data,
        hasRows: data?.hasOwnProperty('rows'),
        duration: `${Math.round(duration)}ms`
      });
      cityTips = [];
    }

    logger.info('City tips fetched successfully', {
      count: cityTips.length,
      options,
      duration: `${Math.round(duration)}ms`
    });

    sendSuccessResponse(res, cityTips, 'GET_CITY_TIPS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch city tips');
  }
});

// Get individual city tip by slug
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const startTime = startTiming();
  
  try {
    const result = await executeQuery(
      'SELECT * FROM city_tips WHERE slug = $1',
      [slug]
    );
    const duration = endTiming(startTime);

    // Extract city tip from result
    const cityTipRows = Array.isArray(result.rows) ? result.rows : (Array.isArray(result) ? result : []);

    if (cityTipRows.length === 0) {
      logger.info('City tip not found', { slug, duration: `${Math.round(duration)}ms` });
      return sendNotFoundResponse(res, 'City tip');
    }

    logger.info('City tip by slug query completed', {
      slug,
      duration: `${Math.round(duration)}ms`,
      queryType: 'BASIC'
    });

    sendSuccessResponse(res, cityTipRows[0], 'GET_CITY_TIP', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch city tip by slug');
  }
});

// Create city tip (admin endpoint)
router.post('/', ...adminMiddleware(), ...validateCityTip, async (req, res) => {
  if (!req.body?.name || !req.body?.category) {
    return sendErrorResponse(res, new Error('Missing required fields'), 'Missing required fields', 400);
  }
  
  try {
    // Sanitize input data to prevent XSS
    const sanitizedData = sanitizeEntity.cityTip(req.body);
    const { 
      name, category, description, address, latitude, longitude,
      price_range, opening_hours, website, images, slug,
      tips, status = 'ACTIVE'
    } = sanitizedData;
    
    // Normalize data using schema
    const normalizedData = normalizeData(sanitizedData, {
      status: { type: 'string', fallback: 'ACTIVE' }
    });
    const normalizedCityTip = entityNormalizers.cityTip(sanitizedData);
    
    const startTime = startTiming();
    
        // Move slug generation inside transaction for atomicity
        const cityTip = await executeTransaction(async (client) => {
          // Generate unique slug using centralized service
          const requestId = generateRequestIdFromReq(req);
          const uniqueSlug = await generateUniqueSlugInTransaction(
            client, 
            name, 
            'city_tips', 
            requestId
          );

          // Create city tip with unique slug
          const result = await client.query(
            `INSERT INTO city_tips (name, category, description, address, latitude, longitude,
             price_range, opening_hours, website, images, slug, tips, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [name, category, description, address, latitude, longitude,
             price_range, normalizedCityTip.opening_hours,
             normalizedCityTip.website, normalizedCityTip.images, uniqueSlug, tips, normalizedData.status]
          );

          return result.rows[0];
        });
    
    const duration = endTiming(startTime);
    
    res.status(201).json({
      success: true,
      data: cityTip,
      meta: { queryType: 'CREATE_CITY_TIP', duration }
    });
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to create city tip');
  }
});

// Update city tip (admin endpoint)
router.put('/:id', ...adminMiddleware(), ...validateCityTipId, ...validateCityTip, async (req, res) => { // Optimistic locking removed
  const { id } = req.params;
  try {
    const existing = await executeQuery(
      'SELECT * FROM city_tips WHERE id = $1',
      [parseInt(id)]
    );
    if (!existing.rows || existing.rows.length === 0) {
      return sendNotFoundResponse(res, 'City tip');
    }

    // Merge existing with provided to avoid NOT NULL errors
    const name = typeof req.body.name === 'string' ? req.body.name : existing.rows[0].name;
    const category = typeof req.body.category === 'string' ? req.body.category : existing.rows[0].category;
    const description = req.body.description !== undefined ? req.body.description : existing.rows[0].description;
    const address = req.body.address !== undefined ? req.body.address : existing.rows[0].address;
    const latitude = req.body.latitude !== undefined ? req.body.latitude : existing.rows[0].latitude;
    const longitude = req.body.longitude !== undefined ? req.body.longitude : existing.rows[0].longitude;
    const price_range = req.body.price_range !== undefined ? req.body.price_range : existing.rows[0].price_range;

    const normalizedData = normalizeData(req.body, {
      opening_hours: { type: 'string', fallback: '' },
      images: { type: 'json', fallback: [] }
    });

    // Normalize status field (same as CREATE route)
    const normalizedStatus = normalizeData(req.body, {
      status: { type: 'string', fallback: 'ACTIVE' }
    });
    const status = req.body.status !== undefined ? normalizedStatus.status : existing.rows[0].status;
    
    const startTime = startTiming();
    
    const result = await executeTransaction(async (client) => {
      const updateResult = await client.query(
        `UPDATE city_tips SET name = $1, category = $2, description = $3, 
         address = $4, latitude = $5, longitude = $6, price_range = $7, 
         opening_hours = $8, website = $9, images = $10, status = $11,
         updated_at = NOW() WHERE id = $12 RETURNING *`,
        [name, category, description, address, latitude, longitude, 
         price_range, normalizedData.opening_hours, 
         req.body.website !== undefined ? req.body.website : existing.website, normalizedData.images, status, parseInt(id)]
      );
      
      return updateResult.rows[0];
    });
    
    const duration = endTiming(startTime);
    
    res.json({
      success: true,
      data: result,
      meta: { queryType: 'UPDATE_CITY_TIP', duration }
    });
  } catch (error) {
    return sendErrorResponse(res, error, 'Failed to update city tip');
  }
});

// Delete city tip (admin endpoint)
router.delete('/:id', ...adminMiddleware(), ...validateCityTipId, async (req, res) => {
  const { id } = req.params;
  
  try {
    const startTime = startTiming();
    
    const result = await executeTransaction(async (client) => {
      const deleteResult = await client.query(
        'DELETE FROM city_tips WHERE id = $1 RETURNING *',
        [parseInt(id)]
      );
      
      return deleteResult.rows[0];
    });
    
    const duration = endTiming(startTime);
    
    res.json({
      success: true,
      data: result,
      meta: { queryType: 'DELETE_CITY_TIP', duration }
    });
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to delete city tip');
  }
});

export default router;
