// Simplified timetable service using consolidated timetable_participants table
import { executeQuery, executeTransaction } from '../config/database.js';
import logger from '../config/logger.js';

export class SimplifiedTimetableService {
  
  // Get all timetable entries with participant assignments
  async getTimetableWithAssignments() {
    try {
      const query = `
        SELECT 
          t.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', tp.id,
                'participant_id', tp.participant_id,
                'role', tp.role,
                'participant_name', p.name,
                'participant_slug', p.slug,
                'participant_region', p.region,
                'participant_pronouns', p.pronouns,
                'participant_instagram', p.instagram
              ) ORDER BY tp.id
            ) FILTER (WHERE tp.id IS NOT NULL),
            '[]'::json
          ) AS assignments
        FROM timetable_entries t
        LEFT JOIN timetable_participants tp ON t.id = tp.timetable_entry_id
        LEFT JOIN participants p ON tp.participant_id = p.id
        GROUP BY t.id, t.title, t.description, t.detailed_description, t.location, 
                 t.address, t.date, t.time, t.end_time, t.type, t.status, 
                 t.additional_links, t.slug, t.created_at, t.updated_at
        ORDER BY t.date, t.time
      `;
      const result = await executeQuery(query, []);
      logger.info('Successfully fetched timetable entries with assignments', { count: result.rows.length });
      return result.rows;
    } catch (error) {
      logger.error('Failed to fetch timetable', { error: error.message });
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  // Get single timetable entry with participant assignments
  async getTimetableEntryWithAssignments(entryId) {
    try {
      if (!entryId || typeof entryId !== 'number') {
        throw new Error('Invalid entryId: must be a number');
      }

      const query = `
        SELECT 
          t.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', tp.id,
                'participant_id', tp.participant_id,
                'role', tp.role,
                'participant_name', p.name,
                'participant_slug', p.slug,
                'participant_region', p.region,
                'participant_pronouns', p.pronouns,
                'participant_instagram', p.instagram
              ) ORDER BY tp.id
            ) FILTER (WHERE tp.id IS NOT NULL),
            '[]'::json
          ) AS assignments
        FROM timetable_entries t
        LEFT JOIN timetable_participants tp ON t.id = tp.timetable_entry_id
        LEFT JOIN participants p ON tp.participant_id = p.id
        WHERE t.id = $1
        GROUP BY t.id, t.title, t.description, t.detailed_description, t.location, 
                 t.address, t.date, t.time, t.end_time, t.type, t.status, 
                 t.additional_links, t.slug, t.created_at, t.updated_at
      `;

      const result = await executeQuery(query, [entryId]);
      if (result.rows.length === 0) {
        logger.info('Timetable entry not found', { entryId });
        return null;
      }
      
      logger.info('Successfully fetched timetable entry with assignments', { 
        entryId, 
        assignmentCount: result.rows[0].assignments?.length || 0 
      });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to fetch timetable entry with assignments', { 
        entryId, 
        error: error.message 
      });
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  // Get single timetable entry by slug with participant assignments
  async getTimetableEntryBySlugWithAssignments(slug) {
    try {
      if (!slug || typeof slug !== 'string') {
        throw new Error('Invalid slug: must be a non-empty string');
      }

      const query = `
        SELECT 
          t.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', tp.id,
                'participant_id', tp.participant_id,
                'role', tp.role,
                'participant_name', p.name,
                'participant_slug', p.slug,
                'participant_region', p.region,
                'participant_pronouns', p.pronouns,
                'participant_instagram', p.instagram
              ) ORDER BY tp.id
            ) FILTER (WHERE tp.id IS NOT NULL),
            '[]'::json
          ) AS assignments
        FROM timetable_entries t
        LEFT JOIN timetable_participants tp ON t.id = tp.timetable_entry_id
        LEFT JOIN participants p ON tp.participant_id = p.id
        WHERE t.slug = $1
        GROUP BY t.id, t.title, t.description, t.detailed_description, t.location, 
                 t.address, t.date, t.time, t.end_time, t.type, t.status, 
                 t.additional_links, t.slug, t.created_at, t.updated_at
      `;

      const result = await executeQuery(query, [slug]);
      if (result.rows.length === 0) {
        logger.info('Timetable entry not found by slug', { slug });
        return null;
      }
      
      logger.info('Successfully fetched timetable entry by slug with assignments', { 
        slug, 
        assignmentCount: result.rows[0].assignments?.length || 0 
      });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to fetch timetable entry by slug with assignments', { 
        slug, 
        error: error.message 
      });
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  // Create timetable entry with participant assignments
  async createTimetableEntryWithAssignments(entryData, assignments = []) {
    const result = await executeTransaction(async (client) => {
      const entryQuery = `
        INSERT INTO timetables (title, description, detailed_description, location, 
         date, time, type, status, additional_links, slug, end_time, round_id) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *
      `;
      const entryResult = await client.query(entryQuery, [
        entryData.title,
        entryData.description,
        entryData.detailed_description,
        entryData.location,
        entryData.date,
        entryData.time,
        entryData.type || 'general',
        entryData.status || 'confirmed',
        JSON.stringify(entryData.additional_links || []),
        entryData.slug,
        entryData.end_time,
        entryData.round_id
      ]);
      const entry = entryResult.rows[0];

      // Add participant assignments
      for (const assignment of assignments) {
        await client.query(
          `INSERT INTO timetable_participants (timetable_entry_id, participant_id, role) VALUES ($1, $2, $3)`,
          [entry.id, assignment.participant_id, assignment.role]
        );
      }

      return entry;
    });
    return result;
  }

  // Update timetable entry assignments
  async updateTimetableEntryAssignments(entryId, assignments) {
    await executeTransaction(async (client) => {
      // Remove existing assignments
      await client.query(
        'DELETE FROM timetable_participants WHERE timetable_entry_id = $1',
        [entryId]
      );

      // Add new assignments
      for (const assignment of assignments) {
        await client.query(
          `INSERT INTO timetable_participants (timetable_entry_id, participant_id, role) VALUES ($1, $2, $3)`,
          [entryId, assignment.participant_id, assignment.role]
        );
      }
    });
  }

  // Add participant to timetable entry
  async addParticipantToTimetableEntry(entryId, participantId, role = 'Teilnehmer') {
    const result = await executeQuery(
      `INSERT INTO timetable_participants (timetable_entry_id, participant_id, role) 
       VALUES ($1, $2, $3) RETURNING *`,
      [entryId, participantId, role]
    );
    return result.rows[0];
  }

  // Remove participant from timetable entry
  async removeParticipantFromTimetableEntry(entryId, participantId) {
    const result = await executeQuery(
      'DELETE FROM timetable_participants WHERE timetable_entry_id = $1 AND participant_id = $2 RETURNING *',
      [entryId, participantId]
    );
    return result.rows[0];
  }

  // Create timetable entry with participant assignments
  async createTimetableWithAssignments(entryData, participants = [], client = null) {
    // If client is provided, use it directly (for nested transactions)
    if (client) {
      const entryQuery = `
        INSERT INTO timetable_entries (title, description, detailed_description, location, 
          date, "time", end_time, type, status, additional_links, slug)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const params = [
        entryData.title,
        entryData.description,
        entryData.detailed_description,
        entryData.location,
        entryData.date,
        entryData.time,
        entryData.end_time || null,
        entryData.type || 'general',
        entryData.status || 'confirmed',
        JSON.stringify(entryData.additional_links || []),
        entryData.slug
      ];
      
      console.log('INSERT with client - params:', params);
      console.log('INSERT with client - entryData:', entryData);
      
      const entryResult = await client.query(entryQuery, params);
      const entry = entryResult.rows[0];
      
      // Insert participants (no duplicate check needed for new entries)
      for (const participant of participants) {
        if (participant.participant_id) {
          await client.query(
            'INSERT INTO timetable_participants (timetable_entry_id, participant_id, role) VALUES ($1, $2, $3)',
            [entry.id, participant.participant_id, participant.role || 'Teilnehmer*in']
          );
        }
      }
      
      return entry;
    }
    
    // If no client provided, use executeTransaction (for standalone calls)
    const result = await executeTransaction(async (client) => {
      const entryQuery = `
        INSERT INTO timetable_entries (title, description, detailed_description, location, 
          date, "time", end_time, type, status, additional_links, slug)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const params = [
        entryData.title,
        entryData.description,
        entryData.detailed_description,
        entryData.location,
        entryData.date,
        entryData.time,
        entryData.end_time || null,
        entryData.type || 'general',
        entryData.status || 'confirmed',
        JSON.stringify(entryData.additional_links || []),
        entryData.slug
      ];
      
      console.log('INSERT standalone - params:', params);
      console.log('INSERT standalone - entryData:', entryData);
      
      const entryResult = await client.query(entryQuery, params);
      const entry = entryResult.rows[0];
      
      // Insert participants (no duplicate check needed for new entries)
      for (const participant of participants) {
        if (participant.participant_id) {
          await client.query(
            'INSERT INTO timetable_participants (timetable_entry_id, participant_id, role) VALUES ($1, $2, $3)',
            [entry.id, participant.participant_id, participant.role || 'Teilnehmer*in']
          );
        }
      }
      
      return entry;
    });
    
    return result;
  }

  // Update timetable entry with participant assignments
  async updateTimetableWithAssignments(entryId, entryData, participants = []) {
    return await executeTransaction(async (client) => {
      // Update the timetable entry
      const updateQuery = `
        UPDATE timetable_entries 
        SET title = $1, description = $2, detailed_description = $3, 
            location = $4, date = $5, "time" = $6, end_time = $7, 
            type = $8, status = $9, additional_links = $10, slug = $11, updated_at = NOW()
        WHERE id = $12
        RETURNING *
      `;
      const updateResult = await client.query(updateQuery, [
        entryData.title,
        entryData.description,
        entryData.detailed_description,
        entryData.location,
        entryData.date,
        entryData.time,
        entryData.end_time || null,
        entryData.type || 'general',
        entryData.status || 'confirmed',
        JSON.stringify(entryData.additional_links || []),
        entryData.slug,
        entryId
      ]);
      
      if (updateResult.rows.length === 0) {
        throw new Error(`Timetable entry not found: ${entryId}`);
      }
      
      const entry = updateResult.rows[0];
      
      // Delete existing participants
      await client.query('DELETE FROM timetable_participants WHERE timetable_entry_id = $1', [entryId]);
      
      // Insert new participants
      for (const participant of participants) {
        if (participant.participant_id) {
          await client.query(
            'INSERT INTO timetable_participants (timetable_entry_id, participant_id, role) VALUES ($1, $2, $3)',
            [entryId, participant.participant_id, participant.role || 'Teilnehmer*in']
          );
        }
      }
      
      return entry;
    });
  }
}

export default new SimplifiedTimetableService();
