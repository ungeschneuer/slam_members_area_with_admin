// Simplified rounds service using consolidated round_assignments table
import { executeQuery, executeTransaction } from '../config/database.js';
import logger from '../config/logger.js';

export class SimplifiedRoundsService {
  
  constructor() {
    this._hasAssignmentsTable = null;
  }

  // Helper function to consolidate assignments by participant/team to avoid unique constraint violations
  consolidateAssignments(assignments, roundId) {
    const consolidatedAssignments = new Map();
    
    for (const assignment of assignments) {
      const key = assignment.participant_id ? `participant_${assignment.participant_id}` : `team_${assignment.team_id}`;
      
      if (!consolidatedAssignments.has(key)) {
        consolidatedAssignments.set(key, {
          round_id: roundId,
          participant_id: assignment.participant_id || null,
          team_id: assignment.team_id || null,
          roles: [],
          metadata: {}
        });
      }
      
      const consolidated = consolidatedAssignments.get(key);
      consolidated.roles.push(...(assignment.roles || []));
      Object.assign(consolidated.metadata, assignment.metadata || {});
    }
    
    return Array.from(consolidatedAssignments.values());
  }

  async hasAssignmentsTable() {
    if (this._hasAssignmentsTable !== null) return this._hasAssignmentsTable;
    try {
      const result = await executeQuery("SELECT to_regclass('public.round_assignments') AS reg;", []);
      this._hasAssignmentsTable = !!result.rows?.[0]?.reg;
    } catch (_) {
      this._hasAssignmentsTable = false;
    }
    return this._hasAssignmentsTable;
  }
  
  // Get all rounds with assignments
  async getRoundsWithAssignments() {
    const hasAssignments = await this.hasAssignmentsTable();
    if (!hasAssignments) {
      const fallbackQuery = `
        SELECT 
          r.*,
          '[]'::json AS assignments
        FROM rounds r
        ORDER BY r.date, r.start_time
      `;
      const fallbackResult = await executeQuery(fallbackQuery, []);
      return fallbackResult.rows;
    }

    const query = `
      SELECT 
        r.*,
        r.groups,
        r.total_jury_members,
        r.competition_type,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ra.id,
              'participant_id', ra.participant_id,
              'participant_name', p.name,
              'participant_region', p.region,
              'participant_pronouns', p.pronouns,
              'participant_instagram', p.instagram,
              'participant_slug', p.slug,
              'team_id', ra.team_id,
              'team_name', t.name,
              'team_instagram', t.instagram,
              'team_slug', t.slug,
              'team_members', COALESCE(
                (
                  SELECT json_agg(
                    json_build_object(
                      'id', tm_p.id,
                      'name', tm_p.name,
                      'region', tm_p.region,
                      'pronouns', tm_p.pronouns,
                      'instagram', tm_p.instagram,
                      'slug', tm_p.slug
                    )
                  )
                  FROM team_members tm
                  JOIN participants tm_p ON tm.participant_id = tm_p.id
                  WHERE tm.team_id = t.id
                ),
                '[]'
              ),
              'roles', ra.roles,
              'metadata', ra.metadata
            )
          ) FILTER (WHERE ra.id IS NOT NULL),
          '[]'
        ) as assignments
      FROM rounds r
      LEFT JOIN round_assignments ra ON r.id = ra.round_id
      LEFT JOIN participants p ON ra.participant_id = p.id
      LEFT JOIN teams t ON ra.team_id = t.id
      GROUP BY r.id, r.groups, r.total_jury_members, r.competition_type
      ORDER BY r.date, r.start_time
    `;
    
    const result = await executeQuery(query, []);
    return result.rows;
  }

  // Get single round with assignments
  async getRoundWithAssignments(roundId) {
    const hasAssignments = await this.hasAssignmentsTable();
    if (!hasAssignments) {
      const fallbackQuery = `
        SELECT 
          r.*,
          '[]'::json AS assignments
        FROM rounds r
        WHERE r.id = $1
      `;
      const fb = await executeQuery(fallbackQuery, [roundId]);
      if (fb.rows.length === 0) return null;
      return fb.rows[0];
    }

    const query = `
      SELECT 
        r.*,
        r.groups,
        r.total_jury_members,
        r.competition_type,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ra.id,
              'participant_id', ra.participant_id,
              'participant_name', p.name,
              'participant_region', p.region,
              'participant_pronouns', p.pronouns,
              'participant_instagram', p.instagram,
              'participant_slug', p.slug,
              'team_id', ra.team_id,
              'team_name', t.name,
              'team_instagram', t.instagram,
              'team_slug', t.slug,
              'team_members', COALESCE(
                (
                  SELECT json_agg(
                    json_build_object(
                      'id', tm_p.id,
                      'name', tm_p.name,
                      'region', tm_p.region,
                      'pronouns', tm_p.pronouns,
                      'instagram', tm_p.instagram,
                      'slug', tm_p.slug
                    )
                  )
                  FROM team_members tm
                  JOIN participants tm_p ON tm.participant_id = tm_p.id
                  WHERE tm.team_id = t.id
                ),
                '[]'
              ),
              'roles', ra.roles,
              'metadata', ra.metadata
            )
          ) FILTER (WHERE ra.id IS NOT NULL),
          '[]'
        ) as assignments
      FROM rounds r
      LEFT JOIN round_assignments ra ON r.id = ra.round_id
      LEFT JOIN participants p ON ra.participant_id = p.id
      LEFT JOIN teams t ON ra.team_id = t.id
      WHERE r.id = $1
      GROUP BY r.id, r.groups, r.total_jury_members, r.competition_type
    `;
    
    const result = await executeQuery(query, [roundId]);
    if (result.rows.length === 0) return null;
    
    return result.rows[0];
  }

  // Create round with assignments
  async createRoundWithAssignments(roundData, assignments = [], client = null) {
    // If client is provided, use it directly (for nested transactions)
    if (client) {
      // Validate assignments based on competition type
      const competitionType = roundData.competition_type || 'Einzelwettbewerb';
      this.validateAssignments(assignments, competitionType);
      
      const roundQuery = `
        INSERT INTO rounds (title, date, start_time, end_time, location, address, description, after_play_report, photos_cloud_url, slug, groups, total_jury_members, competition_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      const roundResult = await client.query(roundQuery, [
        roundData.title,
        roundData.date,
        roundData.start_time,
        roundData.end_time,
        roundData.location,
        roundData.address,
        roundData.description,
        roundData.after_play_report || '',
        roundData.photos_cloud_url || '',
        roundData.slug,
        JSON.stringify(roundData.groups || []),
        roundData.total_jury_members || 5,
        competitionType
      ]);
      const round = roundResult.rows[0];
      // Consolidate assignments to avoid unique constraint violations
      const consolidatedAssignments = this.consolidateAssignments(assignments, round.id);
      
      for (const assignment of consolidatedAssignments) {
        await client.query(
          `INSERT INTO round_assignments (round_id, participant_id, team_id, roles, metadata) VALUES ($1, $2, $3, $4, $5)`,
          [
            assignment.round_id,
            assignment.participant_id,
            assignment.team_id,
            JSON.stringify(assignment.roles),
            JSON.stringify(assignment.metadata)
          ]
        );
      }
      return round;
    }
    
    // If no client provided, use executeTransaction (for standalone calls)
    const result = await executeTransaction(async (client) => {
      // Validate assignments based on competition type
      const competitionType = roundData.competition_type || 'Einzelwettbewerb';
      this.validateAssignments(assignments, competitionType);
      
      const roundQuery = `
        INSERT INTO rounds (title, date, start_time, end_time, location, address, description, after_play_report, photos_cloud_url, slug, groups, total_jury_members, competition_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      const roundResult = await client.query(roundQuery, [
        roundData.title,
        roundData.date,
        roundData.start_time,
        roundData.end_time,
        roundData.location,
        roundData.address,
        roundData.description,
        roundData.after_play_report || '',
        roundData.photos_cloud_url || '',
        roundData.slug,
        JSON.stringify(roundData.groups || []),
        roundData.total_jury_members || 5,
        competitionType
      ]);
      const round = roundResult.rows[0];
      // Consolidate assignments to avoid unique constraint violations
      const consolidatedAssignments = this.consolidateAssignments(assignments, round.id);
      
      for (const assignment of consolidatedAssignments) {
        await client.query(
          `INSERT INTO round_assignments (round_id, participant_id, team_id, roles, metadata) VALUES ($1, $2, $3, $4, $5)`,
          [
            assignment.round_id,
            assignment.participant_id,
            assignment.team_id,
            JSON.stringify(assignment.roles),
            JSON.stringify(assignment.metadata)
          ]
        );
      }
      return round;
    });
    return result;
  }

  // Update round assignments
  async updateRoundAssignments(roundId, assignments) {
    const hasAssignments = await this.hasAssignmentsTable();
    if (!hasAssignments) {
      // No-op if assignments table does not exist
      return;
    }
    
    // Get round competition type for validation
    const roundQuery = await executeQuery('SELECT competition_type FROM rounds WHERE id = $1', [roundId]);
    const competitionType = roundQuery.rows[0]?.competition_type || 'Einzelwettbewerb';
    
    // Validate assignments
    this.validateAssignments(assignments, competitionType);
    
    await executeTransaction(async (client) => {
      await client.query('DELETE FROM round_assignments WHERE round_id = $1', [roundId]);
      for (const assignment of assignments) {
        await client.query(
          `INSERT INTO round_assignments (round_id, participant_id, team_id, roles, metadata) VALUES ($1, $2, $3, $4, $5)`,
          [
            roundId,
            assignment.participant_id || null,
            assignment.team_id || null,
            JSON.stringify(assignment.roles || []),
            JSON.stringify(assignment.metadata || {})
          ]
        );
      }
    });
  }

  // Get participants by role for a round
  async getRoundParticipantsByRole(roundId, role) {
    const query = `
      SELECT ra.*, p.name, p.region, p.pronouns, p.instagram
      FROM round_assignments ra
      JOIN participants p ON ra.participant_id = p.id
      WHERE ra.round_id = $1 AND ra.roles @> $2
    `;
    
    const result = await executeQuery(query, [roundId, [role]]);
    return result.rows;
  }

  // Validate assignments based on competition type
  validateAssignments(assignments, competitionType) {
    for (const assignment of assignments) {
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
      
      // Ensure exactly one of participant_id or team_id is set
      if ((participant_id && team_id) || (!participant_id && !team_id)) {
        throw new Error('Exactly one of participant_id or team_id must be provided');
      }
    }
  }

}

export default new SimplifiedRoundsService();
