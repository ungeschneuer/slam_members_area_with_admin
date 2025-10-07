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
  executeSlugCrudOperation,
  adminMiddleware,
  normalizeData
} from '../utils/routeHelpers.js';
import logger from '../config/logger.js';

const router = express.Router();

// Get individual timetable event by slug
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const startTime = startTiming();
  
  try {
    const timetableEvent = await optimizedQueryService.getTimetableBySlugWithParticipants(slug);
    const duration = endTiming(startTime);
    
    if (!timetableEvent) {
      logger.info('Timetable event not found', { slug, duration: `${Math.round(duration)}ms` });
      return sendNotFoundResponse(res, 'Timetable event');
    }
    
    logger.info('Optimized timetable event by slug query completed', {
      slug,
      duration: `${Math.round(duration)}ms`,
      queryType: 'JOIN_OPTIMIZED'
    });
    
    sendSuccessResponse(res, timetableEvent, 'GET_TIMETABLE_EVENT', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch timetable event by slug');
  }
});


// Get timetable with participant information (optimized with JOINs)
router.get('/', async (req, res) => {
  try {
    const startTime = startTiming();
    const timetable = await optimizedQueryService.getTimetableWithParticipants();
    const duration = endTiming(startTime);
    
    logger.info('Optimized timetable query completed', {
      duration: `${Math.round(duration)}ms`,
      entryCount: timetable.length,
      queryType: 'JOIN_OPTIMIZED'
    });
    
    sendSuccessResponse(res, timetable, 'GET_TIMETABLE', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch timetable with participants');
  }
});

// Create timetable entry (admin endpoint)
router.post('/', ...adminMiddleware(), async (req, res) => {
  const { 
    title, description, detailedDescription, location, date, time, 
    type, status, additionalLinks, slug 
  } = req.body;
  
  // Normalize data using schema
  const normalizedData = normalizeData(req.body, {
    additionalLinks: { type: 'json', fallback: [] },
    type: { type: 'string', fallback: 'general' },
    status: { type: 'string', fallback: 'confirmed' }
  });
  
  await executeSlugCrudOperation(
    'create',
    `INSERT INTO timetable_entries (title, description, "detailedDescription", location, 
     date, time, type, status, "additionalLinks", slug) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [title, description, detailedDescription, location, date, time, 
     normalizedData.type, normalizedData.status, normalizedData.additionalLinks, slug],
    'timetable entry',
    'timetable_entries',
    'CREATE_TIMETABLE',
    res,
    { title, slug }
  );
});

// Update timetable entry (admin endpoint)
router.put('/:id', ...adminMiddleware(), async (req, res) => {
  const { id } = req.params;
  const { 
    title, description, detailedDescription, location, date, time, 
    type, status, additionalLinks, slug 
  } = req.body;
  
  // Normalize data using schema
  const normalizedData = normalizeData(req.body, {
    additionalLinks: { type: 'json', fallback: [] }
  });
  
  await executeSlugCrudOperation(
    'update',
    `UPDATE timetable_entries SET title = $1, description = $2, "detailedDescription" = $3, 
     location = $4, date = $5, time = $6, type = $7, status = $8, 
     "additionalLinks" = $9, slug = $10, updated_at = NOW() 
     WHERE id = $11 RETURNING *`,
    [title, description, detailedDescription, location, date, time, 
     type, status, normalizedData.additionalLinks, slug, parseInt(id)],
    'timetable entry',
    'timetable_entries',
    'UPDATE_TIMETABLE',
    res,
    { title, slug }
  );
});

// Delete timetable entry (admin endpoint)
router.delete('/:id', ...adminMiddleware(), async (req, res) => {
  const { id } = req.params;
  
  await executeCrudOperation(
    'delete',
    'DELETE FROM timetable_entries WHERE id = $1 RETURNING *',
    [parseInt(id)],
    'timetable entry',
    'DELETE_TIMETABLE',
    res
  );
});

// TIMETABLE PARTICIPANTS MANAGEMENT
// Add participant to timetable entry
router.post('/:entryId/participants', ...adminMiddleware(), async (req, res) => {
  const { entryId } = req.params;
  const { participantId, role = 'Teilnehmer' } = req.body;
  
  try {
    const startTime = startTiming();
    const result = await executeQuery(
      'INSERT INTO timetable_participants (timetable_entry_id, participant_id, role) VALUES ($1, $2, $3) RETURNING *',
      [parseInt(entryId), parseInt(participantId), role]
    );
    const duration = endTiming(startTime);
    
    sendSuccessResponse(res, result.rows[0], 'ADD_TIMETABLE_PARTICIPANT', duration, 201);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to add participant to timetable entry');
  }
});

// Remove participant from timetable entry
router.delete('/:entryId/participants/:participantId', ...adminMiddleware(), async (req, res) => {
  const { entryId, participantId } = req.params;
  
  try {
    const startTime = startTiming();
    const result = await executeQuery(
      'DELETE FROM timetable_participants WHERE timetable_entry_id = $1 AND participant_id = $2 RETURNING *',
      [parseInt(entryId), parseInt(participantId)]
    );
    const duration = endTiming(startTime);
    
    if (result.rows.length === 0) {
      sendNotFoundResponse(res, 'Timetable participant relationship');
      return;
    }
    
    sendSuccessResponse(res, result.rows[0], 'REMOVE_TIMETABLE_PARTICIPANT', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to remove participant from timetable entry');
  }
});

export default router;
