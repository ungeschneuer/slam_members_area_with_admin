import express from 'express';
import optimizedQueryService from '../services/optimizedQueryService.js';
import { 
  startTiming, 
  endTiming, 
  sendSuccessResponse, 
  sendErrorResponse, 
  sendNotFoundResponse,
  executeCrudOperation,
  executeSlugCrudOperation,
  adminMiddleware,
  normalizeInstagram
} from '../utils/routeHelpers.js';
import logger from '../config/logger.js';

const router = express.Router();

// Get individual participant by slug
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const startTime = startTiming();
  
  try {
    const participant = await optimizedQueryService.getParticipantBySlugWithStats(slug);
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


// Get participants with statistics (optimized with JOINs)
router.get('/', async (req, res) => {
  try {
    const startTime = startTiming();
    const participants = await optimizedQueryService.getParticipantsWithStats();
    const duration = endTiming(startTime);
    
    logger.info('Optimized participants query completed', {
      duration: `${Math.round(duration)}ms`,
      participantCount: participants.length,
      queryType: 'JOIN_OPTIMIZED'
    });
    
    sendSuccessResponse(res, participants, 'GET_PARTICIPANTS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch participants with statistics');
  }
});

// Create participant (admin endpoint)
router.post('/', ...adminMiddleware(), async (req, res) => {
  const { name, role, region, pronouns, instagram, slug } = req.body;
  
  await executeSlugCrudOperation(
    'create',
    'INSERT INTO participants (name, role, region, pronouns, instagram, slug) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [name, role, region, pronouns, normalizeInstagram(instagram), slug],
    'participant',
    'participants',
    'CREATE_PARTICIPANT',
    res,
    { name, slug }
  );
});

// Update participant (admin endpoint)
router.put('/:id', ...adminMiddleware(), async (req, res) => {
  const { id } = req.params;
  const { name, role, region, pronouns, instagram, slug } = req.body;
  
  await executeSlugCrudOperation(
    'update',
    'UPDATE participants SET name = $1, role = $2, region = $3, pronouns = $4, instagram = $5, slug = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
    [name, role, region, pronouns, normalizeInstagram(instagram), slug, parseInt(id)],
    'participant',
    'participants',
    'UPDATE_PARTICIPANT',
    res,
    { name, slug }
  );
});

// Delete participant (admin endpoint)
router.delete('/:id', ...adminMiddleware(), async (req, res) => {
  const { id } = req.params;
  
  await executeCrudOperation(
    'delete',
    'DELETE FROM participants WHERE id = $1 RETURNING *',
    [parseInt(id)],
    'participant',
    'DELETE_PARTICIPANT',
    res
  );
});

export default router;
