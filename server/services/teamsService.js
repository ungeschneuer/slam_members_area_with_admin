// Teams service for managing teams and team members
import { executeQuery, executeTransaction } from '../config/database.js';
import logger from '../config/logger.js';
import { generateSlug, generateUniqueSlug } from '../utils/slugUtils.js';
import { normalizeInstagramInput, extractInstagramUsername } from '../utils/instagramUtils.js';

export class TeamsService {
  
  // Get all teams with member details
  async getTeamsWithMembers() {
    const query = `
      SELECT 
        t.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'name', p.name,
              'region', p.region,
              'instagram', p.instagram,
              'slug', p.slug
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) as members,
        COUNT(tm.participant_id) as member_count
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN participants p ON tm.participant_id = p.id
      GROUP BY t.id, t.name, t.slug, t.role, t.instagram, t.created_at, t.updated_at
      ORDER BY t.name
    `;
    
    const result = await executeQuery(query, []);
    return result.rows;
  }

  // Get single team with members by ID
  async getTeamById(teamId) {
    const query = `
      SELECT 
        t.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'name', p.name,
              'region', p.region,
              'instagram', p.instagram,
              'slug', p.slug
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) as members
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN participants p ON tm.participant_id = p.id
      WHERE t.id = $1
      GROUP BY t.id, t.name, t.slug, t.role, t.instagram, t.created_at, t.updated_at
    `;
    
    const result = await executeQuery(query, [teamId]);
    return result.rows[0] || null;
  }

  // Get single team with members by slug
  async getTeamBySlug(slug) {
    const query = `
      SELECT 
        t.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'name', p.name,
              'region', p.region,
              'instagram', p.instagram,
              'slug', p.slug
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) as members
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN participants p ON tm.participant_id = p.id
      WHERE t.slug = $1
      GROUP BY t.id, t.name, t.slug, t.role, t.instagram, t.created_at, t.updated_at
    `;
    
    const result = await executeQuery(query, [slug]);
    return result.rows[0] || null;
  }

  // Create team with members
  async createTeam(teamData, memberIds = []) {
    return await executeTransaction(async (client) => {
      // Generate unique slug
      const existingSlugs = await client.query('SELECT slug FROM teams UNION SELECT slug FROM participants');
      const slug = generateUniqueSlug(teamData.name, existingSlugs.rows.map(r => r.slug));
      
      // Normalize Instagram handle
      const instagram = teamData.instagram ? (() => {
        try {
          const normalized = normalizeInstagramInput(teamData.instagram);
          return extractInstagramUsername(normalized) || teamData.instagram.replace(/^@/, '');
        } catch (error) {
          logger.warn('Instagram normalization failed:', error);
          return teamData.instagram.replace(/^@/, '');
        }
      })() : '';

      // Create team
      const teamQuery = `
        INSERT INTO teams (name, slug, role, instagram)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const teamResult = await client.query(teamQuery, [
        teamData.name,
        slug,
        teamData.role || 'Team',
        instagram
      ]);
      
      const team = teamResult.rows[0];
      
      // Add members if provided
      if (memberIds.length > 0) {
        // Validate that all participants exist (all roles allowed for team membership)
        const participantQuery = `
          SELECT id, name, role FROM participants 
          WHERE id = ANY($1)
        `;
        const participants = await client.query(participantQuery, [memberIds]);
        
        if (participants.rows.length !== memberIds.length) {
          throw new Error('Some participants not found or not eligible for team membership');
        }
        
        // Add team members
        for (const participantId of memberIds) {
          await client.query(
            'INSERT INTO team_members (team_id, participant_id) VALUES ($1, $2)',
            [team.id, participantId]
          );
        }
      }
      
      return team;
    });
  }

  // Update team
  async updateTeam(teamId, teamData) {
    return await executeTransaction(async (client) => {
      // Get existing team
      const existingTeam = await client.query('SELECT id, name, slug, role, instagram, created_at, updated_at FROM teams WHERE id = $1', [teamId]);
      if (existingTeam.rows.length === 0) {
        throw new Error('Team not found');
      }
      
      const existing = existingTeam.rows[0];
      
      // Generate new slug if name changed
      let slug = existing.slug;
      if (teamData.name && teamData.name !== existing.name) {
        const existingSlugs = await client.query('SELECT slug FROM teams WHERE id != $1 UNION SELECT slug FROM participants', [teamId]);
        slug = generateUniqueSlug(teamData.name, existingSlugs.rows.map(r => r.slug));
      }
      
      // Normalize Instagram handle
      const instagram = teamData.instagram !== undefined ? (() => {
        if (!teamData.instagram) return '';
        try {
          const normalized = normalizeInstagramInput(teamData.instagram);
          return extractInstagramUsername(normalized) || teamData.instagram.replace(/^@/, '');
        } catch (error) {
          logger.warn('Instagram normalization failed:', error);
          return teamData.instagram.replace(/^@/, '');
        }
      })() : existing.instagram;

      // Update team
      const updateQuery = `
        UPDATE teams 
        SET name = $1, slug = $2, role = $3, instagram = $4, updated_at = NOW()
        WHERE id = $5
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, [
        teamData.name || existing.name,
        slug,
        teamData.role || existing.role,
        instagram,
        teamId
      ]);
      
      return result.rows[0];
    });
  }

  // Delete team
  async deleteTeam(teamId) {
    return await executeTransaction(async (client) => {
      // Check if team is assigned to any active or scheduled rounds
      const activeRoundsQuery = `
        SELECT DISTINCT r.id, r.title, r.start_time as date, r.status
        FROM rounds r
        INNER JOIN round_assignments ra ON r.id = ra.round_id
        WHERE ra.team_id = $1 AND r.status IN ('SCHEDULED', 'ACTIVE')
      `;
      
      const activeRounds = await client.query(activeRoundsQuery, [teamId]);
      
      if (activeRounds.rows.length > 0) {
        const error = new Error('Cannot delete team assigned to active or scheduled rounds');
        error.code = 'ACTIVE_ROUNDS_CONSTRAINT';
        error.details = { activeRounds: activeRounds.rows };
        throw error;
      }
      
      // Delete team (cascade will handle team_members)
      const result = await client.query('DELETE FROM teams WHERE id = $1 RETURNING *', [teamId]);
      
      if (result.rows.length === 0) {
        throw new Error('Team not found');
      }
      
      return result.rows[0];
    });
  }

  // Add member to team
  async addTeamMember(teamId, participantId) {
    return await executeTransaction(async (client) => {
      // Validate participant exists (all roles allowed for team membership)
      const participantQuery = `
        SELECT id, name, role FROM participants 
        WHERE id = $1
      `;
      const participant = await client.query(participantQuery, [participantId]);
      
      if (participant.rows.length === 0) {
        throw new Error('Participant not found or not eligible for team membership');
      }
      
      // Check if already a member
      const existingMember = await client.query(
        'SELECT id FROM team_members WHERE team_id = $1 AND participant_id = $2',
        [teamId, participantId]
      );
      
      if (existingMember.rows.length > 0) {
        throw new Error('Participant is already a member of this team');
      }
      
      // Add member
      const result = await client.query(
        'INSERT INTO team_members (team_id, participant_id) VALUES ($1, $2) RETURNING *',
        [teamId, participantId]
      );
      
      return result.rows[0];
    });
  }

  // Remove member from team
  async removeTeamMember(teamId, participantId) {
    // First check if the team member relationship exists
    const checkQuery = `
      SELECT tm.*, t.name as team_name, p.name as participant_name
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      JOIN participants p ON tm.participant_id = p.id
      WHERE tm.team_id = $1 AND tm.participant_id = $2
    `;
    
    const checkResult = await executeQuery(checkQuery, [teamId, participantId]);
    
    if (checkResult.rows.length === 0) {
      // Team member relationship doesn't exist - this is not an error, just return success
      logger.info('Team member relationship not found - may have been already removed', {
        teamId,
        participantId
      });
      return { id: null, team_id: teamId, participant_id: participantId, removed: true };
    }
    
    // Remove the team member relationship
    const result = await executeQuery(
      'DELETE FROM team_members WHERE team_id = $1 AND participant_id = $2 RETURNING *',
      [teamId, participantId]
    );
    
    logger.info('Team member removed successfully', {
      teamId,
      participantId,
      teamName: checkResult.rows[0].team_name,
      participantName: checkResult.rows[0].participant_name
    });
    
    return result.rows[0];
  }

  // Get teams assigned to a round
  async getTeamsByRound(roundId) {
    const query = `
      SELECT 
        t.*,
        ra.roles,
        ra.metadata
      FROM teams t
      INNER JOIN round_assignments ra ON t.id = ra.team_id
      WHERE ra.round_id = $1
    `;
    
    const result = await executeQuery(query, [roundId]);
    return result.rows;
  }

  // Get teams a participant belongs to
  async getParticipantTeams(participantId) {
    const query = `
      SELECT 
        t.*,
        tm.created_at as joined_at
      FROM teams t
      INNER JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.participant_id = $1
      ORDER BY tm.created_at DESC
    `;
    
    const result = await executeQuery(query, [participantId]);
    return result.rows;
  }

  // Get team members
  async getTeamMembers(teamId) {
    const query = `
      SELECT 
        p.*,
        tm.created_at as joined_at
      FROM participants p
      INNER JOIN team_members tm ON p.id = tm.participant_id
      WHERE tm.team_id = $1
      ORDER BY tm.created_at ASC
    `;
    
    const result = await executeQuery(query, [teamId]);
    return result.rows;
  }

  // Check if team has active or scheduled round assignments
  async hasActiveRoundAssignments(teamId) {
    const query = `
      SELECT COUNT(*) as count
      FROM round_assignments ra
      INNER JOIN rounds r ON ra.round_id = r.id
      WHERE ra.team_id = $1 AND r.status IN ('SCHEDULED', 'ACTIVE')
    `;
    
    const result = await executeQuery(query, [teamId]);
    return parseInt(result.rows[0].count) > 0;
  }
}

export default new TeamsService();
