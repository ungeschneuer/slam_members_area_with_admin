import express from 'express';
import optimizedQueryService from '../services/optimizedQueryService.js';
import { executeQuery } from '../config/database.js';
import { 
  startTiming, 
  endTiming, 
  sendSuccessResponse, 
  sendErrorResponse, 
  sendNotFoundResponse,
  executeCrudOperation,
  executeRoundCrudOperation,
  adminMiddleware,
  normalizeData
} from '../utils/routeHelpers.js';
import { validateRound, handleValidationErrors } from '../middleware/validation.js';
import { calculateRoundStatus } from '../utils/roundStatusUtils.js';
import logger from '../config/logger.js';

const router = express.Router();

// Get individual round by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const startTime = startTiming();
  
  try {
    const round = await optimizedQueryService.getRoundById(parseInt(id));
    const duration = endTiming(startTime);
    
    if (!round) {
      logger.info('Round not found', { id, duration: `${Math.round(duration)}ms` });
      return sendNotFoundResponse(res, 'Round');
    }
    
    logger.info('Optimized round by ID query completed', {
      id,
      duration: `${Math.round(duration)}ms`,
      queryType: 'JOIN_OPTIMIZED'
    });
    
    sendSuccessResponse(res, round, 'GET_ROUND', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch round by ID');
  }
});

// Get rounds with detailed information (optimized with JOINs)
router.get('/', async (req, res) => {
  try {
    const startTime = startTiming();
    const rounds = await optimizedQueryService.getRoundsWithDetails();
    const duration = endTiming(startTime);
    
    logger.info('Optimized rounds query completed', {
      duration: `${Math.round(duration)}ms`,
      roundCount: rounds.length,
      queryType: 'JOIN_OPTIMIZED'
    });
    
    sendSuccessResponse(res, rounds, 'GET_ROUNDS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch rounds with details');
  }
});

// Get round by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const startTime = startTiming();
    const round = await optimizedQueryService.getRoundBySlug(req.params.slug);
    const duration = endTiming(startTime);
    
    if (!round) {
      sendNotFoundResponse(res, 'Round');
      return;
    }
    
    sendSuccessResponse(res, round, 'GET_ROUND_BY_SLUG', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch round by slug');
  }
});

// Create round (admin endpoint)
router.post('/', ...adminMiddleware(), validateRound, handleValidationErrors, async (req, res) => {
  const { 
    title, slug, date, startTime, endTime, location, address, description, 
    afterPlayReport, competitionType, totalJuryMembers 
  } = req.body;
  
  // Calculate status automatically based on date and time
  const calculatedStatus = calculateRoundStatus(date, startTime, endTime);
  
  // Normalize data using schema
  const normalizedData = normalizeData(req.body, {
    totalJuryMembers: { type: 'int', fallback: 5 }
  });
  
  await executeRoundCrudOperation(
    'create',
    `INSERT INTO rounds (title, slug, date, "startTime", "endTime", location, address, description, 
     "afterPlayReport", "competitionType", "totalJuryMembers", status) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [title, slug, date, startTime, endTime, location, address, description, afterPlayReport, 
     competitionType, normalizedData.totalJuryMembers, calculatedStatus],
    'round',
    'CREATE_ROUND',
    res,
    { title, slug }
  );
});

// Update round (admin endpoint)
router.put('/:id', ...adminMiddleware(), validateRound, handleValidationErrors, async (req, res) => {
  const { id } = req.params;
  const { 
    title, slug, date, startTime, endTime, location, address, description, 
    afterPlayReport, competitionType, totalJuryMembers 
  } = req.body;
  
  // Get current round to check if it was cancelled
  let currentStatus = null;
  try {
    const currentRound = await optimizedQueryService.getRoundById(parseInt(id));
    currentStatus = currentRound?.status;
  } catch (error) {
    logger.warn('Could not fetch current round status for update', { id, error: error.message });
  }
  
  // Calculate status automatically based on date and time
  const calculatedStatus = calculateRoundStatus(date, startTime, endTime, currentStatus);
  
  // Normalize data using schema
  const normalizedData = normalizeData(req.body, {
    totalJuryMembers: { type: 'int', fallback: 5 }
  });
  
  await executeRoundCrudOperation(
    'update',
    `UPDATE rounds SET title = $1, slug = $2, date = $3, "startTime" = $4, "endTime" = $5, location = $6, 
     address = $7, description = $8, "afterPlayReport" = $9, "competitionType" = $10, 
     "totalJuryMembers" = $11, status = $12, updated_at = NOW() 
     WHERE id = $13 RETURNING *`,
    [title, slug, date, startTime, endTime, location, address, description, afterPlayReport, 
     competitionType, normalizedData.totalJuryMembers, calculatedStatus, parseInt(id)],
    'round',
    'UPDATE_ROUND',
    res,
    { title, slug }
  );
});

// Delete round (admin endpoint)
router.delete('/:id', ...adminMiddleware(), async (req, res) => {
  const { id } = req.params;
  
  await executeCrudOperation(
    'delete',
    'DELETE FROM rounds WHERE id = $1 RETURNING *',
    [parseInt(id)],
    'round',
    'DELETE_ROUND',
    res
  );
});

// ROUND PARTICIPANTS MANAGEMENT
// Add participant to round
router.post('/:roundId/participants', ...adminMiddleware(), async (req, res) => {
  const { roundId } = req.params;
  const { participantId, role = 'Teilnehmer' } = req.body;
  
  try {
    const startTime = startTiming();
    const result = await executeQuery(
      'INSERT INTO round_participants (round_id, participant_id, role) VALUES ($1, $2, $3) RETURNING *',
      [parseInt(roundId), parseInt(participantId), role]
    );
    const duration = endTiming(startTime);
    
    sendSuccessResponse(res, result.rows[0], 'ADD_ROUND_PARTICIPANT', duration, 201);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to add participant to round');
  }
});

// Remove participant from round
router.delete('/:roundId/participants/:participantId', ...adminMiddleware(), async (req, res) => {
  const { roundId, participantId } = req.params;
  
  try {
    const startTime = startTiming();
    const result = await executeQuery(
      'DELETE FROM round_participants WHERE round_id = $1 AND participant_id = $2 RETURNING *',
      [parseInt(roundId), parseInt(participantId)]
    );
    const duration = endTiming(startTime);
    
    if (result.rows.length === 0) {
      sendNotFoundResponse(res, 'Round participant relationship');
      return;
    }
    
    sendSuccessResponse(res, result.rows[0], 'REMOVE_ROUND_PARTICIPANT', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to remove participant from round');
  }
});

// ROUND CREW MANAGEMENT
// Add crew member to round
router.post('/:roundId/crew', ...adminMiddleware(), async (req, res) => {
  const { roundId } = req.params;
  const { participantId, role } = req.body;
  
  try {
    const startTime = startTiming();
    const result = await executeQuery(
      'INSERT INTO round_crew (round_id, participant_id, role) VALUES ($1, $2, $3) RETURNING *',
      [parseInt(roundId), parseInt(participantId), role]
    );
    const duration = endTiming(startTime);
    
    sendSuccessResponse(res, result.rows[0], 'ADD_ROUND_CREW', duration, 201);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to add crew member to round');
  }
});

// Remove crew member from round
router.delete('/:roundId/crew/:participantId', ...adminMiddleware(), async (req, res) => {
  const { roundId, participantId } = req.params;
  
  try {
    const startTime = startTiming();
    const result = await executeQuery(
      'DELETE FROM round_crew WHERE round_id = $1 AND participant_id = $2 RETURNING *',
      [parseInt(roundId), parseInt(participantId)]
    );
    const duration = endTiming(startTime);
    
    if (result.rows.length === 0) {
      sendNotFoundResponse(res, 'Round crew relationship');
      return;
    }
    
    sendSuccessResponse(res, result.rows[0], 'REMOVE_ROUND_CREW', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to remove crew member from round');
  }
});

// ROUND FEATURE ARTISTS MANAGEMENT
// Add feature artist to round
router.post('/:roundId/feature-artists', ...adminMiddleware(), async (req, res) => {
  const { roundId } = req.params;
  const { participantId, name, displayOrder = 1, description = '' } = req.body;
  
  try {
    const startTime = startTiming();
    const result = await executeQuery(
      'INSERT INTO round_feature_artists (round_id, participant_id, name, display_order, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [parseInt(roundId), parseInt(participantId), name, displayOrder, description]
    );
    const duration = endTiming(startTime);
    
    sendSuccessResponse(res, result.rows[0], 'ADD_ROUND_FEATURE_ARTIST', duration, 201);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to add feature artist to round');
  }
});

// Remove feature artist from round
router.delete('/:roundId/feature-artists/:participantId', ...adminMiddleware(), async (req, res) => {
  const { roundId, participantId } = req.params;
  
  try {
    const startTime = startTiming();
    const result = await executeQuery(
      'DELETE FROM round_feature_artists WHERE round_id = $1 AND participant_id = $2 RETURNING *',
      [parseInt(roundId), parseInt(participantId)]
    );
    const duration = endTiming(startTime);
    
    if (result.rows.length === 0) {
      sendNotFoundResponse(res, 'Round feature artist relationship');
      return;
    }
    
    sendSuccessResponse(res, result.rows[0], 'REMOVE_ROUND_FEATURE_ARTIST', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to remove feature artist from round');
  }
});

export default router;
