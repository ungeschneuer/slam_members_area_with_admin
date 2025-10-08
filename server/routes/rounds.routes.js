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
import { mapRoundToTimetableEntry } from '../utils/timetableUtils.js';
import logger from '../config/logger.js';

const router = express.Router();

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

// Get round by slug (moved before /:id route to avoid conflicts)
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

// Get individual round by ID (moved after /slug/:slug route to avoid conflicts)
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

// Create round (admin endpoint)
router.post('/', ...adminMiddleware(), validateRound, handleValidationErrors, async (req, res) => {
  const startTime = startTiming();
  
  try {
    const { 
      title, slug, date, startTime: roundStartTime, endTime, location, address, description, 
      afterPlayReport, competitionType, totalJuryMembers 
    } = req.body;
    
    // Calculate status automatically based on date and time
    const calculatedStatus = calculateRoundStatus(date, roundStartTime, endTime);
    
    // Normalize data using schema
    const normalizedData = normalizeData(req.body, {
      totalJuryMembers: { type: 'int', fallback: 5 }
    });
    
    // Create the round
    const roundQuery = `
      INSERT INTO rounds (title, slug, date, "startTime", "endTime", location, address, description, 
       "afterPlayReport", "competitionType", "totalJuryMembers", status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *
    `;
    const roundParams = [
      title, slug, date, roundStartTime, endTime, location, address, description, afterPlayReport, 
      competitionType, normalizedData.totalJuryMembers, calculatedStatus
    ];
    
    const roundResult = await executeQuery(roundQuery, roundParams);
    const createdRound = roundResult.rows[0];
    
    // Create corresponding timetable entry
    const timetableData = mapRoundToTimetableEntry(createdRound);
    const timetableQuery = `
      INSERT INTO timetable_entries (title, description, location, date, time, end_time, type, status, internal_link, round_id, slug)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
    `;
    const timetableParams = [
      timetableData.title,
      timetableData.description,
      timetableData.location,
      timetableData.date,
      timetableData.time,
      timetableData.end_time,
      timetableData.type,
      timetableData.status,
      timetableData.internal_link,
      timetableData.round_id,
      createdRound.slug // Use the same slug as the round
    ];
    
    const timetableResult = await executeQuery(timetableQuery, timetableParams);
    const duration = endTiming(startTime);
    
    logger.info('Round and timetable entry created', {
      roundId: createdRound.id,
      timetableId: timetableResult.rows[0].id,
      duration: `${Math.round(duration)}ms`,
      queryType: 'CREATE_ROUND_WITH_TIMETABLE'
    });
    
    sendSuccessResponse(res, createdRound, 'CREATE_ROUND', duration, 201);
  } catch (error) {
    const duration = endTiming(startTime);
    sendErrorResponse(res, error, 'Failed to create round and timetable entry');
  }
});

// Update round (admin endpoint)
router.put('/:id', ...adminMiddleware(), validateRound, handleValidationErrors, async (req, res) => {
  const startTime = startTiming();
  
  try {
    const { id } = req.params;
    const { 
      title, slug, date, startTime: roundStartTime, endTime, location, address, description, 
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
    const calculatedStatus = calculateRoundStatus(date, roundStartTime, endTime, currentStatus);
    
    // Normalize data using schema
    const normalizedData = normalizeData(req.body, {
      totalJuryMembers: { type: 'int', fallback: 5 }
    });
    
    // Update the round
    const roundQuery = `
      UPDATE rounds SET title = $1, slug = $2, date = $3, "startTime" = $4, "endTime" = $5, location = $6, 
       address = $7, description = $8, "afterPlayReport" = $9, "competitionType" = $10, 
       "totalJuryMembers" = $11, status = $12, updated_at = NOW() 
       WHERE id = $13 RETURNING *
    `;
    const roundParams = [
      title, slug, date, roundStartTime, endTime, location, address, description, afterPlayReport, 
      competitionType, normalizedData.totalJuryMembers, calculatedStatus, parseInt(id)
    ];
    
    const roundResult = await executeQuery(roundQuery, roundParams);
    const updatedRound = roundResult.rows[0];
    
    if (!updatedRound) {
      const duration = endTiming(startTime);
      return sendNotFoundResponse(res, 'Round');
    }
    
    // Check if timetable entry exists for this round
    const existingTimetableQuery = 'SELECT * FROM timetable_entries WHERE round_id = $1';
    const existingTimetableResult = await executeQuery(existingTimetableQuery, [parseInt(id)]);
    
    const timetableData = mapRoundToTimetableEntry(updatedRound);
    
    if (existingTimetableResult.rows.length > 0) {
      // Update existing timetable entry
      const updateTimetableQuery = `
        UPDATE timetable_entries 
        SET title = $1, description = $2, location = $3, date = $4, time = $5, end_time = $6, 
            type = $7, status = $8, internal_link = $9, slug = $10, updated_at = NOW()
        WHERE round_id = $11 RETURNING *
      `;
      const updateTimetableParams = [
        timetableData.title,
        timetableData.description,
        timetableData.location,
        timetableData.date,
        timetableData.time,
        timetableData.end_time,
        timetableData.type,
        timetableData.status,
        timetableData.internal_link,
        updatedRound.slug, // Use the updated round slug
        parseInt(id)
      ];
      
      await executeQuery(updateTimetableQuery, updateTimetableParams);
    } else {
      // Create new timetable entry for backwards compatibility
      const createTimetableQuery = `
        INSERT INTO timetable_entries (title, description, location, date, time, end_time, type, status, internal_link, round_id, slug)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
      `;
      const createTimetableParams = [
        timetableData.title,
        timetableData.description,
        timetableData.location,
        timetableData.date,
        timetableData.time,
        timetableData.end_time,
        timetableData.type,
        timetableData.status,
        timetableData.internal_link,
        timetableData.round_id,
        updatedRound.slug // Use the updated round slug
      ];
      
      await executeQuery(createTimetableQuery, createTimetableParams);
    }
    
    const duration = endTiming(startTime);
    
    logger.info('Round and timetable entry updated', {
      roundId: updatedRound.id,
      duration: `${Math.round(duration)}ms`,
      queryType: 'UPDATE_ROUND_WITH_TIMETABLE'
    });
    
    sendSuccessResponse(res, updatedRound, 'UPDATE_ROUND', duration);
  } catch (error) {
    const duration = endTiming(startTime);
    sendErrorResponse(res, error, 'Failed to update round and timetable entry');
  }
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
    
    // Check if participant is already in the round
    const existingQuery = 'SELECT id FROM round_participants WHERE round_id = $1 AND participant_id = $2';
    const existingResult = await executeQuery(existingQuery, [parseInt(roundId), parseInt(participantId)]);
    
    if (existingResult.rows.length > 0) {
      const duration = endTiming(startTime);
      return res.status(409).json({
        success: false,
        error: 'Participant is already associated with this round',
        meta: {
          queryType: 'ADD_ROUND_PARTICIPANT',
          duration: `${Math.round(duration)}ms`
        }
      });
    }
    
    const result = await executeQuery(
      'INSERT INTO round_participants (round_id, participant_id, role) VALUES ($1, $2, $3) RETURNING *',
      [parseInt(roundId), parseInt(participantId), role]
    );
    const duration = endTiming(startTime);
    
    sendSuccessResponse(res, result.rows[0], 'ADD_ROUND_PARTICIPANT', duration, 201);
  } catch (error) {
    const duration = endTiming(startTime);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: 'Participant is already associated with this round',
        meta: {
          queryType: 'ADD_ROUND_PARTICIPANT',
          duration: `${Math.round(duration)}ms`
        }
      });
    }
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
    
    // Check if this specific role already exists for this person
    const existingQuery = 'SELECT id FROM round_crew WHERE round_id = $1 AND participant_id = $2 AND role = $3';
    const existingResult = await executeQuery(existingQuery, [parseInt(roundId), parseInt(participantId), role]);
    
    if (existingResult.rows.length > 0) {
      const duration = endTiming(startTime);
      return res.status(409).json({
        success: false,
        error: 'This person already has this specific role in this round',
        meta: {
          queryType: 'ADD_ROUND_CREW',
          duration: `${Math.round(duration)}ms`
        }
      });
    }
    
    const result = await executeQuery(
      'INSERT INTO round_crew (round_id, participant_id, role) VALUES ($1, $2, $3) RETURNING *',
      [parseInt(roundId), parseInt(participantId), role]
    );
    const duration = endTiming(startTime);
    
    sendSuccessResponse(res, result.rows[0], 'ADD_ROUND_CREW', duration, 201);
  } catch (error) {
    const duration = endTiming(startTime);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: 'This person already has this specific role in this round',
        meta: {
          queryType: 'ADD_ROUND_CREW',
          duration: `${Math.round(duration)}ms`
        }
      });
    }
    sendErrorResponse(res, error, 'Failed to add crew member to round');
  }
});

// Remove crew member from round (all roles)
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
    
    sendSuccessResponse(res, result.rows, 'REMOVE_ROUND_CREW', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to remove crew member from round');
  }
});

// Remove specific crew role from round
router.delete('/:roundId/crew/:participantId/:role', ...adminMiddleware(), async (req, res) => {
  const { roundId, participantId, role } = req.params;
  
  try {
    const startTime = startTiming();
    const result = await executeQuery(
      'DELETE FROM round_crew WHERE round_id = $1 AND participant_id = $2 AND role = $3 RETURNING *',
      [parseInt(roundId), parseInt(participantId), role]
    );
    const duration = endTiming(startTime);
    
    if (result.rows.length === 0) {
      sendNotFoundResponse(res, 'Round crew role relationship');
      return;
    }
    
    sendSuccessResponse(res, result.rows[0], 'REMOVE_ROUND_CREW_ROLE', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to remove crew role from round');
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

// ROUND MODERATION MANAGEMENT
// Add moderator to round
router.post('/:roundId/moderation', ...adminMiddleware(), async (req, res) => {
  const { roundId } = req.params;
  const { participantId, name, displayOrder = 1, description = '' } = req.body;
  
  try {
    const startTime = startTiming();
    const result = await executeQuery(
      'INSERT INTO round_moderation (round_id, participant_id, name, display_order, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [parseInt(roundId), parseInt(participantId), name, displayOrder, description]
    );
    const duration = endTiming(startTime);
    
    sendSuccessResponse(res, result.rows[0], 'ADD_ROUND_MODERATION', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to add moderator to round');
  }
});

// Remove moderator from round
router.delete('/:roundId/moderation/:participantId', ...adminMiddleware(), async (req, res) => {
  const { roundId, participantId } = req.params;
  
  try {
    const startTime = startTiming();
    const result = await executeQuery(
      'DELETE FROM round_moderation WHERE round_id = $1 AND participant_id = $2 RETURNING *',
      [parseInt(roundId), parseInt(participantId)]
    );
    const duration = endTiming(startTime);
    
    if (result.rows.length === 0) {
      sendNotFoundResponse(res, 'Round moderation relationship');
      return;
    }
    
    sendSuccessResponse(res, result.rows[0], 'REMOVE_ROUND_MODERATION', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to remove moderator from round');
  }
});

export default router;
