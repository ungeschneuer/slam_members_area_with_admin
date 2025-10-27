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
import { generateSlug, generateUniqueSlug, validateSlugInput } from '../utils/slugUtils.js';
import { generateUniqueSlugInTransaction, generateRequestIdFromReq } from '../services/slugGenerationService.js';
import { executeTransaction } from '../config/database.js';

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
router.post('/', ...adminMiddleware(), ...validateTimetableEvent, async (req, res) => {
  try {
    // Sanitize input data to prevent XSS
    const sanitizedData = sanitizeEntity.timetable(req.body);
    const normalizedData = normalizeData(sanitizedData, {
      title: { type: 'string', fallback: '' },
      description: { type: 'string', fallback: '' },
      detailedDescription: { type: 'string', fallback: '' },
      location: { type: 'string', fallback: '' },
      date: { type: 'string', fallback: '' },
      time: { type: 'string', fallback: '' },
      end_time: { type: 'string', fallback: '' },
      type: { type: 'string', fallback: 'general' },
      status: { type: 'string', fallback: 'confirmed' },
      additional_links: { type: 'json', fallback: [] },
      participants: { type: 'json', fallback: [] },
      slug: { type: 'string', fallback: '' }
    });
    
    const startTime = startTiming();
    
        // Move slug generation inside transaction for atomicity
        const entry = await executeTransaction(async (client) => {
          // Generate unique slug using centralized service
          const requestId = generateRequestIdFromReq(req);
          const uniqueSlug = await generateUniqueSlugInTransaction(
            client, 
            normalizedData.title, 
            'timetable_entries', 
            requestId
          );

          // Create timetable entry with unique slug
          return await simplifiedTimetableService.createTimetableWithAssignments(
            {
              title: normalizedData.title,
              description: normalizedData.description,
              detailed_description: normalizedData.detailedDescription,
              location: normalizedData.location,
              date: normalizedData.date,
              time: normalizedData.time,
              end_time: normalizedData.end_time,
              type: normalizedData.type,
              status: normalizedData.status,
              additional_links: normalizedData.additional_links,
              slug: uniqueSlug
            },
            normalizedData.participants,
            client // Pass client for transaction
          );
        });
    
    const duration = endTiming(startTime);
    
    res.status(201).json({
      success: true,
      data: entry,
      meta: { queryType: 'CREATE_TIMETABLE', duration }
    });
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to create timetable entry');
  }
});

// Update timetable entry (admin endpoint)
router.put('/:id', ...adminMiddleware(), ...validateTimetableEventId, ...validateTimetableEvent, async (req, res) => {
  try {
    const entryId = parseInt(req.params.id);
    if (isNaN(entryId)) {
      return sendErrorResponse(res, new Error('Invalid entry ID'), 'Invalid entry ID', 400);
    }
    
    // Sanitize input data to prevent XSS
    const sanitizedData = sanitizeEntity.timetable(req.body);
    const normalizedData = normalizeData(sanitizedData, {
      title: { type: 'string', fallback: '' },
      description: { type: 'string', fallback: '' },
      detailedDescription: { type: 'string', fallback: '' },
      location: { type: 'string', fallback: '' },
      date: { type: 'string', fallback: '' },
      time: { type: 'string', fallback: '' },
      end_time: { type: 'string', fallback: '' },
      type: { type: 'string', fallback: 'general' },
      status: { type: 'string', fallback: 'confirmed' },
      additional_links: { type: 'json', fallback: [] },
      participants: { type: 'json', fallback: [] },
      slug: { type: 'string', fallback: '' }
    });
    
    const startTime = startTiming();
    
    // Use service to update entry with participants in a transaction
    const entry = await simplifiedTimetableService.updateTimetableWithAssignments(
      entryId,
      {
        title: normalizedData.title,
        description: normalizedData.description,
        detailed_description: normalizedData.detailedDescription,
        location: normalizedData.location,
        date: normalizedData.date,
        time: normalizedData.time,
        end_time: normalizedData.end_time,
        type: normalizedData.type,
        status: normalizedData.status,
        additional_links: normalizedData.additional_links,
        slug: normalizedData.slug
      },
      normalizedData.participants
    );
    
    const duration = endTiming(startTime);
    
    res.json({
      success: true,
      data: entry,
      meta: { queryType: 'UPDATE_TIMETABLE', duration }
    });
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to update timetable entry');
  }
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
  const { participantId, role = 'Teilnehmer*in' } = req.body;
  
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
