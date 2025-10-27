import express from 'express';
// Optimized query service removed - using simple database queries
import { 
  startTiming, 
  endTiming, 
  sendSuccessResponse, 
  sendErrorResponse, 
  sendNotFoundResponse,
  executeCrudOperation,
} from '../utils/simpleRouteHelpers.js';
import { adminMiddleware } from '../middleware/simpleAuth.js';
// Idempotency and optimistic locking removed - using simple error handling instead
// Query validation removed - using simple validation instead
import { executeQuery, pool } from '../config/database.js';
import logger from '../config/logger.js';
import { z } from 'zod';
import { sanitizeEntity } from '../utils/sanitization.js';
import { entityNormalizers } from '../utils/normalizers.js';
import { participantSchema, participantBulkSchema } from '../../shared/schemas/participantSchema.js';
import { ParticipantsService } from '../services/participantsService.js';
import { generateSlug, generateUniqueSlug, validateSlugInput } from '../utils/slugUtils.js';
import { generateUniqueSlugInTransaction, generateRequestIdFromReq } from '../services/slugGenerationService.js';
import { executeTransaction } from '../config/database.js';

const allowedRoles = ['Wettbewerb-Teilnehmer*in', 'Supporter*in', 'SLAM25-Team', 'SLAM-MC'];
const allowedRegions = [
  'Bayern',
  'Baden-Württemberg',
  'Berlin-Brandenburg',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen/Bremen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
  'Liechtenstein',
  'Luxemburg',
  'Österreich',
  'Ostbelgien',
  'Schweiz',
  'Südtirol',
  'Slam Alphas',
  'BiPOC/Migra',
  'i,Slam',
  'TINte',
  'U20',
  'Chemnitz'
];

// Initialize participants service
const participantsService = new ParticipantsService();

const router = express.Router();

// Search participants with server-side filtering
router.get('/search', async (req, res) => {
  try {
    const startTime = startTiming();
    
    // Parse search parameters
    const searchTerm = req.query.search || '';
    const role = req.query.role || '';
    const region = req.query.region || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;
    
    // Build dynamic WHERE clause
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;
    
    // Search term filtering (name, region, role, pronouns)
    if (searchTerm.trim()) {
      whereConditions.push(`(
        LOWER(name) LIKE LOWER($${paramIndex}) OR
        LOWER(region) LIKE LOWER($${paramIndex}) OR
        LOWER(role) LIKE LOWER($${paramIndex}) OR
        LOWER(pronouns) LIKE LOWER($${paramIndex})
      )`);
      queryParams.push(`%${searchTerm.trim()}%`);
      paramIndex++;
    }
    
    // Role filtering
    if (role && role !== 'all') {
      whereConditions.push(`role = $${paramIndex}`);
      queryParams.push(role);
      paramIndex++;
    }
    
    // Region filtering
    if (region && region !== 'all') {
      whereConditions.push(`region = $${paramIndex}`);
      queryParams.push(region);
      paramIndex++;
    }
    
    // Build the complete query
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get filtered participants with pagination
    const participantsQuery = `
      SELECT * FROM participants 
      ${whereClause}
      ORDER BY name 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    
    const participants = await executeQuery(participantsQuery, queryParams);
    
    // Get total count for pagination (without LIMIT/OFFSET)
    const countQuery = `SELECT COUNT(*) FROM participants ${whereClause}`;
    const countParams = queryParams.slice(0, -2); // Remove limit and offset
    const countResult = await executeQuery(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    const duration = endTiming(startTime);
    
    logger.info('Participants search completed', {
      duration: `${Math.round(duration)}ms`,
      searchTerm,
      role,
      region,
      participantCount: participants.rows.length,
      totalCount,
      page,
      limit,
      queryType: 'SEARCH_OPTIMIZED'
    });
    
    // Include pagination metadata in response
    const responseData = {
      data: participants.rows || participants,
      meta: {
        totalCount,
        limit,
        offset,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        searchTerm,
        filters: { role, region }
      }
    };
    
    sendSuccessResponse(res, responseData, 'SEARCH_OPTIMIZED', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to search participants');
  }
});

// Get individual participant by slug
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const startTime = startTiming();
  
  try {
    const participant = await executeQuery(
      'SELECT * FROM participants WHERE slug = $1',
      [slug]
    );
    const duration = endTiming(startTime);
    
    if (!participant) {
      logger.info('Participant not found', { slug, duration: `${Math.round(duration)}ms` });
      return sendNotFoundResponse(res, 'Participant');
    }
    
    logger.info('Optimized participant by slug query completed', {
      slug,
      duration: `${Math.round(duration)}ms`,
      queryType: 'JOIN_OPTIMIZED'
    });
    
    sendSuccessResponse(res, participant, 'GET_PARTICIPANT', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch participant by slug');
  }
});


// Get participants with statistics (optimized with JOINs and pagination)
// Query validation removed - using simple parameter parsing

router.get('/', async (req, res) => {
  try {
    // Simple query parameter parsing
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const startTime = startTiming();
    
    // Get paginated participants
    const participants = await executeQuery(
      'SELECT * FROM participants ORDER BY name LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    // Get total count for pagination metadata
    const countResult = await executeQuery('SELECT COUNT(*) FROM participants', []);
    const totalCount = countResult.rows[0].count;
    
    const duration = endTiming(startTime);
    
    logger.info('Optimized participants query completed', {
      duration: `${Math.round(duration)}ms`,
      participantCount: participants.length,
      totalCount,
      limit,
      offset,
      queryType: 'JOIN_OPTIMIZED_PAGINATED'
    });
    
    // Include pagination metadata in response
    const responseData = {
      data: participants.rows || participants,
      meta: {
        totalCount: parseInt(totalCount),
        limit,
        offset,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(parseInt(totalCount) / limit)
      }
    };
    
    sendSuccessResponse(res, responseData, 'JOIN_OPTIMIZED_PAGINATED', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch participants with statistics');
  }
});

// Create participant (admin endpoint)
router.post('/', ...adminMiddleware(), async (req, res) => {
  try {
    // Sanitize input data to prevent XSS
    const sanitizedData = sanitizeEntity.participant(req.body);
    const { name, role, region, pronouns, instagram, slug } = sanitizedData;
    
    // Strict type guards
    if (typeof name !== 'string' || typeof role !== 'string' || (region !== null && region !== undefined && typeof region !== 'string')) {
      return sendErrorResponse(res, new Error('Validation failed'), 'Validation failed', 400);
    }
    
    const startTime = startTiming();
    
        // Move slug generation inside transaction for atomicity
        const participant = await executeTransaction(async (client) => {
          // Generate unique slug using centralized service
          const requestId = generateRequestIdFromReq(req);
          const uniqueSlug = await generateUniqueSlugInTransaction(
            client, 
            name, 
            'participants', 
            requestId
          );

          // Create participant with unique slug
          const result = await client.query(
            'INSERT INTO participants (name, role, region, pronouns, instagram, slug) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, role, region, pronouns, entityNormalizers.participant({ instagram }).instagram, uniqueSlug]
          );

          return result.rows[0];
        });
    
    const duration = endTiming(startTime);
    
    res.status(201).json({
      success: true,
      data: participant,
      meta: { queryType: 'CREATE_PARTICIPANT', duration }
    });
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to create participant');
  }
});

// Update participant (admin endpoint)
router.put('/:id', ...adminMiddleware(), async (req, res) => { // Optimistic locking removed
  const { id } = req.params;
  if (!id || Number.isNaN(parseInt(id))) {
    return sendErrorResponse(res, new Error('Invalid ID'), 'Invalid ID format', 400);
  }

  // Sanitize input data to prevent XSS
  const sanitizedData = sanitizeEntity.participant(req.body);

  // Merge current fields when inputs omitted
  try {
    const existing = await executeQuery(
      'SELECT * FROM participants WHERE id = $1',
      [parseInt(id)]
    );
    if (!existing) {
      return sendNotFoundResponse(res, 'Participant');
    }
    const name = typeof sanitizedData.name === 'string' ? sanitizedData.name : existing.name;
    const role = typeof sanitizedData.role === 'string' ? sanitizedData.role : existing.role;
    const region = sanitizedData.region !== undefined ? sanitizedData.region : existing.region;
    const pronouns = typeof sanitizedData.pronouns === 'string' ? sanitizedData.pronouns : existing.pronouns;
    const instagram = sanitizedData.instagram !== undefined ? entityNormalizers.participant({ instagram: sanitizedData.instagram }).instagram : existing.instagram;
    const slug = typeof sanitizedData.slug === 'string' ? sanitizedData.slug : existing.slug;

    await executeCrudOperation(
      'update',
      'UPDATE participants SET name = $1, role = $2, region = $3, pronouns = $4, instagram = $5, slug = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
      [name, role, region, pronouns, instagram, slug, parseInt(id)],
      'participants',
      'UPDATE_PARTICIPANT',
      res
    );
    
    // Clear cache and notify clients
('participants', null, {
      operation: 'update',
      resourceId: parseInt(id),
      correlationId: req.headers['x-correlation-id']
    });
  } catch (error) {
    return sendErrorResponse(res, error, 'Failed to update participant');
  }
});

// Delete participant (admin endpoint)
router.delete('/:id', ...adminMiddleware(), async (req, res) => {
  const { id } = req.params;
  const participantId = parseInt(id);
  const startTime = startTiming();
  
  try {
    const participant = await participantsService.deleteParticipant(participantId);
    const duration = endTiming(startTime);
    
    logger.info('Participant deleted', {
      participantId,
      participantName: participant.name,
      duration: `${Math.round(duration)}ms`
    });
    
    sendSuccessResponse(res, participant, 'DELETE_PARTICIPANT', duration);
  } catch (error) {
    const duration = endTiming(startTime);
    
    if (error.code === 'ACTIVE_ROUNDS_CONSTRAINT') {
      logger.warn('Attempted to delete participant with active round assignments', {
        participantId,
        activeRounds: error.details.activeRounds,
        duration: `${Math.round(duration)}ms`
      });
      
      return res.status(409).json({
        success: false,
        error: error.message,
        details: error.details
      });
    }
    
    logger.error('Failed to delete participant', { 
      participantId, 
      error: error.message,
      duration: `${Math.round(duration)}ms`
    });
    
    sendErrorResponse(res, error, 'Failed to delete participant');
  }
});

// Bulk import participants (admin endpoint)
router.post('/bulk-import', ...adminMiddleware(), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { participants } = req.body;
    
    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Participants array is required and must not be empty' 
      });
    }
    
    // Start transaction
    await client.query('BEGIN');
    
    // Fetch existing slugs from database
    const existingResult = await client.query('SELECT slug FROM participants');
    const existingSlugs = new Set(existingResult.rows.map(r => r.slug));
    
    const results = {
      imported: [],
      duplicates: [],
      errors: []
    };
    
    // Process in batches of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < participants.length; i += BATCH_SIZE) {
      const batch = participants.slice(i, i + BATCH_SIZE);
      
      for (let j = 0; j < batch.length; j++) {
        const rowNumber = i + j + 1;
        const participant = batch[j];
        
        try {
          // Validate with Zod
          const validationResult = participantSchema.safeParse(participant);
          
          if (!validationResult.success) {
            results.errors.push({
              row: rowNumber,
              name: participant.name,
              errors: validationResult.error.errors.map(e => e.message)
            });
            continue;
          }
          
          const validated = validationResult.data;
          
          // Validate role and region
          if (!allowedRoles.includes(validated.role)) {
            results.errors.push({
              row: rowNumber,
              name: validated.name,
              errors: [`Ungültige Rolle: ${validated.role}`]
            });
            continue;
          }
          
          if (validated.region && !allowedRegions.includes(validated.region)) {
            results.errors.push({
              row: rowNumber,
              name: validated.name,
              errors: [`Ungültige Region: ${validated.region}`]
            });
            continue;
          }
          
          // Ensure unique slug server-side (additional safety)
          let slug = validated.slug;
          let counter = 1;
          while (existingSlugs.has(slug)) {
            counter++;
            const baseSlug = validated.slug.replace(/-\d+$/, ''); // Remove existing number suffix
            slug = `${baseSlug}-${counter}`;
          }
          
          // Add to set for subsequent iterations
          existingSlugs.add(slug);
          
          // Normalize Instagram handle
          const instagram = entityNormalizers.participant({ instagram: validated.instagram }).instagram;
          
          // Insert with guaranteed unique slug
          const insertQuery = `
            INSERT INTO participants (name, slug, role, region, pronouns, instagram)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `;
          
          const result = await client.query(insertQuery, [
            validated.name,
            slug,
            validated.role,
            validated.region,
            validated.pronouns || '',
            instagram
          ]);
          
          results.imported.push(result.rows[0]);
          
        } catch (error) {
          results.errors.push({
            row: rowNumber,
            name: participant.name || 'Unknown',
            errors: [error.message]
          });
        }
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    logger.info('Bulk import completed', {
      imported: results.imported.length,
      duplicates: results.duplicates.length,
      errors: results.errors.length
    });
    
    res.json({
      success: true,
      data: {
        importedCount: results.imported.length,
        duplicateCount: results.duplicates.length,
        errorCount: results.errors.length,
        duplicates: results.duplicates,
        errors: results.errors,
        imported: results.imported
      }
    });
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    logger.error('Bulk import error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during import' 
    });
  } finally {
    client.release();
  }
});

export default router;
