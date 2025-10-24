import { z } from 'zod';
import { ALLOWED_REGIONS } from '../constants/regions.js';

// Base team schema
export const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(255, 'Team name too long'),
  instagram: z.string().max(255, 'Instagram handle too long').optional(),
  // Backend-populated fields
  slug: z.string().max(255, 'Slug too long').optional(),
  role: z.string().max(100, 'Role too long').optional()
});

// Team member schema
export const teamMemberSchema = z.object({
  team_id: z.number().int().positive('Team ID must be positive'),
  participant_id: z.number().int().positive('Participant ID must be positive')
});

// Team creation schema (without ID and timestamps)
export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(255),
  instagram: z.string().max(255).optional()
});

// Team update schema (all fields optional except ID)
export const updateTeamSchema = teamSchema.partial();

// Team member addition schema
export const addTeamMemberSchema = z.object({
  participant_id: z.number().int().positive('Participant ID must be positive')
});

// Team member removal schema
export const removeTeamMemberSchema = z.object({
  participant_id: z.number().int().positive('Participant ID must be positive')
});

// Bulk team operations schema
export const teamBulkSchema = z.object({
  teams: z.array(teamSchema).min(1, 'At least one team required')
});

// Team with members schema
export const teamWithMembersSchema = teamSchema.extend({
  id: z.number().int().positive(),
  slug: z.string().optional(),
  role: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  members: z.array(z.object({
    id: z.number().int().positive(),
    name: z.string(),
    region: z.string().optional(),
    instagram: z.string().optional(),
    slug: z.string()
  })).optional()
});

// Team assignment schema for rounds
export const teamAssignmentSchema = z.object({
  team_id: z.number().int().positive('Team ID must be positive'),
  roles: z.array(z.string()).min(1, 'At least one role required'),
  metadata: z.record(z.any()).optional()
});

// Mixed assignment schema (participant or team)
export const mixedAssignmentSchema = z.object({
  participant_id: z.number().int().positive().optional(),
  team_id: z.number().int().positive().optional(),
  roles: z.array(z.string()).min(1, 'At least one role required'),
  metadata: z.record(z.any()).optional()
}).refine(
  (data) => (data.participant_id && !data.team_id) || (!data.participant_id && data.team_id),
  {
    message: 'Exactly one of participant_id or team_id must be provided',
    path: ['participant_id', 'team_id']
  }
);

// Validation for team assignment rules
export const validateTeamAssignment = (assignment, competitionType) => {
  const { participant_id, team_id, roles } = assignment;
  
  // Check if it's a participant role
  const isParticipantRole = roles.includes('participant');
  
  if (isParticipantRole) {
    if (competitionType === 'Teamwettbewerb') {
      // In Teamwettbewerb, only teams can be participants
      if (participant_id) {
        throw new Error('Individual participants cannot compete in Teamwettbewerb rounds');
      }
      if (!team_id) {
        throw new Error('Team is required for Teamwettbewerb participant role');
      }
    } else if (competitionType === 'Einzelwettbewerb') {
      // In Einzelwettbewerb, only individuals can be participants
      if (team_id) {
        throw new Error('Teams cannot compete in Einzelwettbewerb rounds');
      }
      if (!participant_id) {
        throw new Error('Participant is required for Einzelwettbewerb participant role');
      }
    }
  }
  
  // Check for invalid team roles
  const invalidTeamRoles = ['crew', 'moderator', 'jury'];
  if (team_id && roles.some(role => invalidTeamRoles.includes(role))) {
    throw new Error(`Teams cannot have roles: ${invalidTeamRoles.join(', ')}`);
  }
  
  return true;
};
