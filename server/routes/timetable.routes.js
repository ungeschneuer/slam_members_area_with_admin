import express from 'express';
// Using simplified timetable service following project patterns
import { executeQuery } from '../config/database.js';
import simplifiedTimetableService from '../services/simplifiedTimetableService.js';
import { 
  startTiming, 
  endTiming, 
  sendSuccessResponse, 
  sendErrorResponse, 
  sendNotFoundResponse,
  executeCrudOperation,
  normalizeData
} from '../utils/simpleRouteHelpers.js';
import { adminMiddleware } from '../middleware/simpleAuth.js';
// Idempotency and optimistic locking removed - using simple error handling instead
import logger from '../config/logger.js';
import { 
  validateTimetableEvent, 
  validateTimetableEventId 
} from '../middleware/validation.js';
import { sanitizeEntity } from '../utils/sanitization.js';

const router = express.Router();

// Get individual timetable event by slug
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const startTime = startTiming();
  
  try {
    const timetableEvent = await simplifiedTimetableService.getTimetableEntryBySlugWithAssignments(slug);
    const duration = endTiming(startTime);
    
    if (!timetableEvent) {
      logger.info('Timetable event not found', { slug, duration: `${Math.round(duration)}ms` });
      return sendNotFoundResponse(res, 'Timetable event');
    }
    
    // Normalize date/time formatting using env TZ: YYYY-MM-DD / HH:mm
    const toDate = (d) => {
      if (!d) return d;
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return d;
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const toTime = (t) => {
      if (!t) return t;
      if (typeof t === 'string' && /^\d{2}:\d{2}$/.test(t)) return t;
      const dt = new Date(`1970-01-01T${t}Z`);
      if (Number.isNaN(dt.getTime())) return t;
      const hh = String(dt.getUTCHours()).padStart(2, '0');
      const mm = String(dt.getUTCMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    };
    const normalized = {
      ...timetableEvent,
      date: toDate(timetableEvent.date),
      time: toTime(timetableEvent.time)
    };

    logger.info('Optimized timetable event by slug query completed', {
      slug,
      duration: `${Math.round(duration)}ms`,
      queryType: 'JOIN_OPTIMIZED'
    });
    
    sendSuccessResponse(res, normalized, 'GET_TIMETABLE_EVENT', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch timetable event by slug');
  }
});


// Get timetable with participant information (optimized with JOINs)
router.get('/', async (req, res) => {
  try {
    const startTime = startTiming();
    const timetable = await simplifiedTimetableService.getTimetableWithAssignments();
    
    // Normalize date/time formatting using env TZ: YYYY-MM-DD / HH:mm
    const tz = process.env.TZ;
    const toDate = (d) => {
      if (!d) return d;
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return d;
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const toTime = (t) => {
      if (!t) return null; // Handle null/undefined/empty
      try {
        // If already HH:mm, keep it
        if (typeof t === 'string' && /^\d{2}:\d{2}$/.test(t)) return t;
        const dt = new Date(`1970-01-01T${t}Z`);
        if (isNaN(dt.getTime())) return null; // Handle invalid dates
        const hh = String(dt.getUTCHours()).padStart(2, '0');
        const mm = String(dt.getUTCMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
      } catch (error) {
        logger.error('toTime error:', error, 'value:', t);
        return null;
      }
    };
    // Debug logging to identify the issue
    logger.debug('Timetable entries:', { count: timetable?.length || 0 });
    if (Array.isArray(timetable) && timetable.length > 0) {
      logger.debug('Sample entry:', { id: timetable[0]?.id, title: timetable[0]?.title });
    }
    
    const normalized = Array.isArray(timetable) ? timetable.map(e => {
      const normalizedEvent = {
        ...e,
        date: toDate(e.date),
        time: toTime(e.time),
        end_time: toTime(e.end_time)
      };
      
      // Debug logging for end_time normalization
      if (e.end_time && !normalizedEvent.end_time) {
        logger.warn('end_time normalization issue:', {
          original: e.end_time,
          normalized: normalizedEvent.end_time,
          eventTitle: e.title
        });
      }
      
      return normalizedEvent;
    }) : timetable;
    const duration = endTiming(startTime);
    
    logger.info('Optimized timetable query completed', {
      duration: `${Math.round(duration)}ms`,
      entryCount: Array.isArray(normalized) ? normalized.length : 0,
      queryType: 'JOIN_OPTIMIZED'
    });
    
    sendSuccessResponse(res, normalized, 'GET_TIMETABLE', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch timetable with participants');
  }
});

// Create timetable entry (admin endpoint)
router.post('/', ...adminMiddleware(), ...validateTimetableEvent, async (req, res) => { // Idempotency removed
  // Sanitize input data to prevent XSS
  const sanitizedData = sanitizeEntity.timetable(req.body);
  const { 
    title, description, detailed_description, location, date, time, 
    end_time, internal_link,
    type, status, additional_links, slug 
  } = sanitizedData;
  
  // Normalize data using schema
  const normalizedData = normalizeData(sanitizedData, {
    additionalLinks: { type: 'json', fallback: [] },
    type: { type: 'string', fallback: 'general' },
    status: { type: 'string', fallback: 'confirmed' }
  });
  
  await executeCrudOperation(
    'create',
    `     INSERT INTO timetable_entries (title, description, detailed_description, location, 
     date, time, end_time, type, status, internal_link, additional_links, slug)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [title, description, detailed_description, location, date, time, 
     end_time || null,
     normalizedData.type, normalizedData.status, 
     internal_link || null,
     normalizedData.additional_links, slug],
    'timetable',
    'CREATE_TIMETABLE',
    res
  );
  // Note: executeCrudOperation already sends the response
});

// Update timetable entry (admin endpoint)
router.put('/:id', ...adminMiddleware(), ...validateTimetableEventId, ...validateTimetableEvent, async (req, res) => { // Optimistic locking removed
  const { id } = req.params;
  // Sanitize input data to prevent XSS
  const sanitizedData = sanitizeEntity.timetable(req.body);
  const { 
    title, description, detailed_description, location, date, time, 
    end_time, internal_link,
    type, status, additional_links, slug 
  } = sanitizedData;
  
  // Normalize data using schema
  const normalizedData = normalizeData(sanitizedData, {
    additionalLinks: { type: 'json', fallback: [] }
  });
  
  await executeCrudOperation(
    'update',
    `     UPDATE timetable_entries SET title = $1, description = $2, detailed_description = $3, 
     location = $4, date = $5, time = $6, end_time = $7, type = $8, status = $9, 
     internal_link = $10, additional_links = $11, slug = $12, updated_at = NOW() 
     WHERE id = $13 RETURNING *`,
    [title, description, detailed_description, location, date, time, 
     end_time || null,
     type, status, 
     internal_link || null,
     normalizedData.additionalLinks, slug, parseInt(id)],
    'timetable',
    'UPDATE_TIMETABLE',
    res
  );
});

// Delete timetable entry (admin endpoint)
router.delete('/:id', ...adminMiddleware(), ...validateTimetableEventId, async (req, res) => {
  const { id } = req.params;
  
  await executeCrudOperation(
    'delete',
    'DELETE FROM timetable_entries WHERE id = $1 RETURNING *',
    [parseInt(id)],
    'timetable',
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
    
    // Check if participant is already in the timetable entry
    const existingQuery = 'SELECT id FROM timetable_participants WHERE timetable_entry_id = $1 AND participant_id = $2';
    const existingResult = await executeQuery(existingQuery, [parseInt(entryId), parseInt(participantId)]);
    
    if (existingResult.rows.length > 0) {
      const duration = endTiming(startTime);
      return res.status(409).json({
        success: false,
        error: 'Participant is already associated with this timetable entry',
        meta: {
          queryType: 'ADD_TIMETABLE_PARTICIPANT',
          duration: `${Math.round(duration)}ms`
        }
      });
    }
    
    const result = await executeQuery(
      'INSERT INTO timetable_participants (timetable_entry_id, participant_id, role) VALUES ($1, $2, $3) RETURNING *',
      [parseInt(entryId), parseInt(participantId), role]
    );
    const duration = endTiming(startTime);
    
    sendSuccessResponse(res, result.rows[0], 'ADD_TIMETABLE_PARTICIPANT', duration, 201);
  } catch (error) {
    const duration = endTiming(startTime);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: 'Participant is already associated with this timetable entry',
        meta: {
          queryType: 'ADD_TIMETABLE_PARTICIPANT',
          duration: `${Math.round(duration)}ms`
        }
      });
    }
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

// Update participant role in timetable entry
router.put('/:entryId/participants/:participantId', ...adminMiddleware(), async (req, res) => {
  const { entryId, participantId } = req.params;
  const { role } = req.body;
  
  try {
    const startTime = startTiming();
    const result = await executeQuery(
      'UPDATE timetable_participants SET role = $1, updated_at = NOW() WHERE timetable_entry_id = $2 AND participant_id = $3 RETURNING *',
      [role, parseInt(entryId), parseInt(participantId)]
    );
    const duration = endTiming(startTime);
    
    if (result.rows.length === 0) {
      return sendNotFoundResponse(res, 'Timetable participant relationship');
    }
    
    sendSuccessResponse(res, result.rows[0], 'UPDATE_TIMETABLE_PARTICIPANT_ROLE', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to update participant role');
  }
});

export default router;
