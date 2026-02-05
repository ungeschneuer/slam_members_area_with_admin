import express from 'express';
import { executeQuery } from '../config/database.js';
import teamsService from '../services/teamsService.js';
import { 
  startTiming, 
  endTiming, 
  sendSuccessResponse, 
  sendErrorResponse, 
  sendNotFoundResponse,
  executeCrudOperation
} from '../utils/simpleRouteHelpers.js';
import { adminMiddleware } from '../middleware/simpleAuth.js';
import { sanitizeEntity } from '../utils/sanitization.js';
import { teamSchema, createTeamSchema, updateTeamSchema, addTeamMemberSchema, removeTeamMemberSchema } from '../../shared/schemas/teamSchema.js';
import logger from '../config/logger.js';
import { generateSlug, generateUniqueSlug } from '../utils/slugUtils.js';
import { executeTransaction } from '../config/database.js';
import { validateIdMiddleware } from '../utils/validators.js';

const router = express.Router();

// Get all teams with member details
router.get('/', async (req, res) => {
  try {
    const startTime = startTiming();
    const teams = await teamsService.getTeamsWithMembers();
    const duration = endTiming(startTime);
    
    logger.info('Teams query completed', {
      duration: `${Math.round(duration)}ms`,
      teamCount: teams.length,
      queryType: 'GET_TEAMS'
    });
    
    sendSuccessResponse(res, teams, 'GET_TEAMS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch teams');
  }
});

// Get single team by slug
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const startTime = startTiming();
  
  try {
    const team = await teamsService.getTeamBySlug(slug);
    const duration = endTiming(startTime);
    
    if (!team) {
      logger.info('Team not found', { slug, duration: `${Math.round(duration)}ms` });
      return sendNotFoundResponse(res, 'Team');
    }
    
    logger.info('Team by slug query completed', {
      slug,
      duration: `${Math.round(duration)}ms`,
      queryType: 'GET_TEAM'
    });
    
    sendSuccessResponse(res, team, 'GET_TEAM', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch team by slug');
  }
});

// Create team (admin only)
router.post('/', ...adminMiddleware(), async (req, res) => {
  const startTime = startTiming();
  
  try {
    // Sanitize input data
    const sanitizedData = sanitizeEntity.team ? sanitizeEntity.team(req.body) : req.body;
    
    // Validate with Zod
    const validationResult = createTeamSchema.safeParse(sanitizedData);
    if (!validationResult.success) {
      return sendErrorResponse(res, new Error('Validation failed'), 'Validation failed', 400);
    }
    
    const { memberIds = [] } = req.body;
    
    const team = await teamsService.createTeam(validationResult.data, memberIds);
    const duration = endTiming(startTime);
    
    logger.info('Team created', {
      teamId: team.id,
      teamName: team.name,
      memberCount: memberIds.length,
      duration: `${Math.round(duration)}ms`
    });
    
    sendSuccessResponse(res, team, 'CREATE_TEAM', duration, 201);
  } catch (error) {
    const duration = endTiming(startTime);
    logger.error('Failed to create team', {
      error: error.message,
      duration: `${Math.round(duration)}ms`
    });
    sendErrorResponse(res, error, 'Failed to create team');
  }
});

// Update team (admin only)
router.put('/:id', ...adminMiddleware(), validateIdMiddleware('id', 'Team'), async (req, res) => {
  try {
    // Sanitize input data
    const sanitizedData = sanitizeEntity.team ? sanitizeEntity.team(req.body) : req.body;

    // Validate with Zod
    const validationResult = updateTeamSchema.safeParse(sanitizedData);
    if (!validationResult.success) {
      return sendErrorResponse(res, new Error('Validation failed'), 'Validation failed', 400);
    }

    const startTime = startTiming();
    const team = await teamsService.updateTeam(req.validatedId, validationResult.data);
    const duration = endTiming(startTime);
    
    logger.info('Team updated', {
      teamId,
      duration: `${Math.round(duration)}ms`
    });
    
    sendSuccessResponse(res, team, 'UPDATE_TEAM', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to update team');
  }
});

// Delete team (admin only)
router.delete('/:id', ...adminMiddleware(), validateIdMiddleware('id', 'Team'), async (req, res) => {
  const startTime = startTiming();

  try {
    const team = await teamsService.deleteTeam(req.validatedId);
    const duration = endTiming(startTime);
    
    logger.info('Team deleted', {
      teamId: req.validatedId,
      teamName: team.name,
      duration: `${Math.round(duration)}ms`
    });
    
    sendSuccessResponse(res, team, 'DELETE_TEAM', duration);
  } catch (error) {
    const duration = endTiming(startTime);
    
    if (error.code === 'ACTIVE_ROUNDS_CONSTRAINT') {
      logger.warn('Attempted to delete team with active round assignments', {
        teamId: req.validatedId,
        activeRounds: error.details.activeRounds,
        duration: `${Math.round(duration)}ms`
      });
      
      return res.status(409).json({
        success: false,
        error: error.message,
        details: error.details
      });
    }
    
    sendErrorResponse(res, error, 'Failed to delete team');
  }
});

// Get team members
router.get('/:id/members', validateIdMiddleware('id', 'Team'), async (req, res) => {
  try {
    const startTime = startTiming();
    const members = await teamsService.getTeamMembers(req.validatedId);
    const duration = endTiming(startTime);
    
    sendSuccessResponse(res, members, 'GET_TEAM_MEMBERS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch team members');
  }
});

// Add member to team (admin only)
router.post('/:id/members', ...adminMiddleware(), validateIdMiddleware('id', 'Team'), async (req, res) => {
  const teamId = req.validatedId;

  try {
    // Validate request body
    const validationResult = addTeamMemberSchema.safeParse(req.body);
    if (!validationResult.success) {
      return sendErrorResponse(res, new Error('Validation failed'), 'Validation failed', 400);
    }
    
    const { participant_id } = validationResult.data;
    
    const startTime = startTiming();
    const teamMember = await teamsService.addTeamMember(teamId, participant_id);
    const duration = endTiming(startTime);
    
    logger.info('Team member added', {
      teamId,
      participantId: participant_id,
      duration: `${Math.round(duration)}ms`
    });
    
    sendSuccessResponse(res, teamMember, 'ADD_TEAM_MEMBER', duration, 201);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to add team member');
  }
});

// Remove member from team (admin only)
router.delete('/:id/members/:participantId', ...adminMiddleware(), async (req, res) => {
  const { id, participantId } = req.params;
  const teamId = parseInt(id);
  const participantIdInt = parseInt(participantId);

  if (isNaN(teamId) || isNaN(participantIdInt)) {
    return sendErrorResponse(res, new Error('Invalid IDs'), 'Invalid team or participant ID', 400);
  }

  try {
    const startTime = startTiming();
    const teamMember = await teamsService.removeTeamMember(teamId, participantIdInt);
    const duration = endTiming(startTime);
    
    logger.info('Team member removed', {
      teamId,
      participantId: participantIdInt,
      duration: `${Math.round(duration)}ms`
    });
    
    sendSuccessResponse(res, teamMember, 'REMOVE_TEAM_MEMBER', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to remove team member');
  }
});

// Get teams by round
router.get('/round/:roundId', async (req, res) => {
  const { roundId } = req.params;
  const roundIdInt = parseInt(roundId);
  
  if (isNaN(roundIdInt)) {
    return sendErrorResponse(res, new Error('Invalid round ID'), 'Invalid round ID', 400);
  }
  
  try {
    const startTime = startTiming();
    const teams = await teamsService.getTeamsByRound(roundIdInt);
    const duration = endTiming(startTime);
    
    sendSuccessResponse(res, teams, 'GET_TEAMS_BY_ROUND', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch teams by round');
  }
});

// Get participant teams
router.get('/participant/:participantId', async (req, res) => {
  const { participantId } = req.params;
  const participantIdInt = parseInt(participantId);
  
  if (isNaN(participantIdInt)) {
    return sendErrorResponse(res, new Error('Invalid participant ID'), 'Invalid participant ID', 400);
  }
  
  try {
    const startTime = startTiming();
    const teams = await teamsService.getParticipantTeams(participantIdInt);
    const duration = endTiming(startTime);
    
    sendSuccessResponse(res, teams, 'GET_PARTICIPANT_TEAMS', duration);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch participant teams');
  }
});

export default router;
