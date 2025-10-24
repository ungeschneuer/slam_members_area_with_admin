// Participants service for managing participants
import { executeQuery, executeTransaction } from '../config/database.js';
import logger from '../config/logger.js';

export class ParticipantsService {
  
  // Delete participant with active rounds validation
  async deleteParticipant(participantId) {
    return await executeTransaction(async (client) => {
      // Check if participant is assigned to any active or scheduled rounds
      // Both statuses prevent deletion to maintain data integrity for planned events
      const activeRoundsQuery = `
        SELECT DISTINCT r.id, r.title, r.start_time as date, r.status
        FROM rounds r
        INNER JOIN round_assignments ra ON r.id = ra.round_id
        WHERE ra.participant_id = $1 AND r.status IN ('SCHEDULED', 'ACTIVE')
      `;
      
      const activeRounds = await client.query(activeRoundsQuery, [participantId]);
      
      if (activeRounds.rows.length > 0) {
        const error = new Error('Cannot delete participant assigned to active or scheduled rounds');
        error.code = 'ACTIVE_ROUNDS_CONSTRAINT';
        error.details = { activeRounds: activeRounds.rows };
        throw error;
      }
      
      // Delete participant (cascade will handle related records)
      const result = await client.query(
        'DELETE FROM participants WHERE id = $1 RETURNING *',
        [participantId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Participant not found');
      }
      
      return result.rows[0];
    });
  }
}
