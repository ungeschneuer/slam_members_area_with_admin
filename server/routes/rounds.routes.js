// Rounds routes using consolidated round_assignments table
import express from 'express';
import { executeQuery, executeTransaction } from '../config/database.js';
import roundsService from '../services/roundsService.js';
import roundStatusService from '../services/roundStatusService.js';
import { 
  startTiming, 
  endTiming, 
  sendSuccessResponse, 
  sendErrorResponse, 
  sendNotFoundResponse,
  normalizeData,
  executeCrudOperation
} from '../utils/routeHelpers.js';
import { adminMiddleware } from '../middleware/authMiddleware.js';
import { generateSlug, generateUniqueSlug } from '../utils/slugUtils.js';
import logger from '../config/logger.js';
import { sanitizeEntity } from '../utils/sanitization.js';
import { validateIdMiddleware } from '../utils/validators.js';

const router = express.Router();

// Get all rounds with assignments
router.get('/', async (req, res) => {
  try {
    const startTime = startTiming();
    const rounds = await roundsService.getRoundsWithAssignments();
    
    // Enhance rounds with calculated status based on current time and timezone
    const enhancedRounds = rounds.map(round => roundStatusService.enhanceRoundWithStatus(round));
    
    const duration = endTiming(startTime);
    
    sendSuccessResponse(res, enhancedRounds, 'GET_ROUNDS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch rounds');
  }
});

// Get single round with assignments by ID or slug
router.get('/:id', async (req, res) => {
  try {
    const param = req.params.id;
    let round;
    
    const startTime = startTiming();
    
    // Try to parse as numeric ID first
    const roundId = parseInt(param);
    if (!isNaN(roundId)) {
      round = await roundsService.getRoundWithAssignments(roundId);
    } else {
      // Try to find by slug
      const slugQuery = 'SELECT * FROM rounds WHERE slug = $1';
      const slugResult = await executeQuery(slugQuery, [param]);
      
      if (slugResult.rows.length > 0) {
        round = await roundsService.getRoundWithAssignments(slugResult.rows[0].id);
      }
    }
    
    const duration = endTiming(startTime);
    
    if (!round) {
      return sendNotFoundResponse(res, 'Round');
    }
    
    // Enhance round with calculated status based on current time and timezone
    const enhancedRound = roundStatusService.enhanceRoundWithStatus(round);
    
    sendSuccessResponse(res, enhancedRound, 'GET_ROUND', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch round');
  }
});

// Create new round
router.post('/', ...adminMiddleware(), async (req, res) => {
  try {
    // Sanitize input data to prevent XSS
    const sanitizedData = sanitizeEntity.round(req.body);
    const normalizedData = normalizeData(sanitizedData, {
      title: { type: 'string', fallback: '' },
      date: { type: 'string', fallback: '' },
      start_time: { type: 'string', fallback: '' },
      end_time: { type: 'string', fallback: '' },
      location: { type: 'string', fallback: '' },
      address: { type: 'string', fallback: '' },
      description: { type: 'string', fallback: '' },
      after_play_report: { type: 'string', fallback: '' },
      photos_cloud_url: { type: 'string', fallback: '' },
      assignments: { type: 'json', fallback: [] },
      groups: { type: 'json', fallback: [] },
      total_jury_members: { type: 'number', fallback: 5 },
      competition_type: { type: 'string', fallback: 'Einzelwettbewerb' }
    });
    
    const startTime = startTiming();
    
    // Move slug generation inside transaction for atomicity
    const round = await executeTransaction(async (client) => {
      // Generate base slug
      const baseSlug = generateSlug(normalizedData.title);
      
      // Query for existing slugs INSIDE transaction with FOR UPDATE lock
      const existingSlugsResult = await client.query(
        'SELECT slug FROM rounds WHERE slug LIKE $1 FOR UPDATE',
        [`${baseSlug}%`]
      );
      const existingSlugs = existingSlugsResult.rows.map(r => r.slug);
      const uniqueSlug = generateUniqueSlug(normalizedData.title, existingSlugs);
      
      // Create round with unique slug
      return await roundsService.createRoundWithAssignments(
        {
          ...normalizedData,
          slug: uniqueSlug
        },
        normalizedData.assignments,
        client // Pass client for transaction
      );
    });
    
    const duration = endTiming(startTime);
    
    sendSuccessResponse(res, round, 'CREATE_ROUND', duration, 201);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to create round');
  }
});

// Update round
router.put('/:id', ...adminMiddleware(), validateIdMiddleware('id', 'Round'), async (req, res) => {
  try {
    // Sanitize input data to prevent XSS
    const sanitizedData = sanitizeEntity.round(req.body);
    const normalizedData = normalizeData(sanitizedData, {
      title: { type: 'string', fallback: '' },
      date: { type: 'string', fallback: '' },
      start_time: { type: 'string', fallback: '' },
      end_time: { type: 'string', fallback: '' },
      location: { type: 'string', fallback: '' },
      address: { type: 'string', fallback: '' },
      description: { type: 'string', fallback: '' },
      after_play_report: { type: 'string', fallback: '' },
      photos_cloud_url: { type: 'string', fallback: '' },
      assignments: { type: 'json', fallback: [] },
      groups: { type: 'json', fallback: [] },
      total_jury_members: { type: 'number', fallback: 5 },
      competition_type: { type: 'string', fallback: 'Einzelwettbewerb' }
    });
    
    const startTime = startTiming();
    
    // Update round basic info (align with schema camelCase column names)
    const updateQuery = `
      UPDATE rounds 
      SET title = $1, date = $2, start_time = $3, end_time = $4, 
          location = $5, address = $6, description = $7, 
          after_play_report = $8, photos_cloud_url = $9,
          total_jury_members = $10, competition_type = $11,
          groups = $12, updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `;
    
    const result = await executeQuery(updateQuery, [
      normalizedData.title,
      normalizedData.date,
      normalizedData.start_time,
      normalizedData.end_time,
      normalizedData.location,
      normalizedData.address,
      normalizedData.description,
      normalizedData.after_play_report || '',
      normalizedData.photos_cloud_url || '',
      normalizedData.total_jury_members || 5,
      normalizedData.competition_type || 'Einzelwettbewerb',
      JSON.stringify(normalizedData.groups || []),
      req.validatedId
    ]);

    if (result.rows.length === 0) {
      return sendNotFoundResponse(res, 'Round');
    }

    // Update assignments
    await roundsService.updateRoundAssignments(req.validatedId, normalizedData.assignments);
    
    const duration = endTiming(startTime);
    sendSuccessResponse(res, result.rows[0], 'UPDATE_ROUND', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to update round');
  }
});

// Delete round
router.delete('/:id', ...adminMiddleware(), validateIdMiddleware('id', 'Round'), async (req, res) => {
  try {
    const startTime = startTiming();
    const result = await executeQuery('DELETE FROM rounds WHERE id = $1 RETURNING *', [req.validatedId]);
    const duration = endTiming(startTime);
    
    if (result.rows.length === 0) {
      return sendNotFoundResponse(res, 'Round');
    }
    
    sendSuccessResponse(res, result.rows[0], 'DELETE_ROUND', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to delete round');
  }
});

// Get participants by role for a round
router.get('/:id/participants/:role', async (req, res) => {
  try {
    const roundId = parseInt(req.params.id);
    const role = req.params.role;
    
    if (isNaN(roundId)) {
      return sendErrorResponse(res, new Error('Invalid round ID'), 'Invalid round ID', 400);
    }
    
    const startTime = startTiming();
    const participants = await roundsService.getRoundParticipantsByRole(roundId, role);
    const duration = endTiming(startTime);
    
    sendSuccessResponse(res, participants, 'GET_ROUND_PARTICIPANTS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch round participants');
  }
});

export default router;
