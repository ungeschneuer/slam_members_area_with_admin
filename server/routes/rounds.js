import express from 'express';
import { executeQuery, executeTransaction } from '../config/database.js';
import { emitDataUpdate, emitAdminUpdate } from '../services/websocketService.js';

const router = express.Router();

// Get all rounds
router.get('/', async (req, res) => {
  try {
    const result = await executeQuery(
      'SELECT * FROM rounds ORDER BY "startDateTime" ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching rounds:', error);
    res.status(500).json({ error: 'Failed to fetch rounds' });
  }
});

// Get round by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await executeQuery(
      'SELECT * FROM rounds WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Round not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching round:', error);
    res.status(500).json({ error: 'Failed to fetch round' });
  }
});

// Create new round
router.post('/', async (req, res) => {
  try {
    const {
      title,
      startDateTime,
      endDateTime,
      location,
      address,
      description,
      afterPlayReport,
      competitionType,
      crew,
      tournamentParticipants,
      groups,
      featureArtists,
      totalJuryMembers,
      status
    } = req.body;
    
    const result = await executeQuery(
      `INSERT INTO rounds (
        title, "startDateTime", "endDateTime", location, address, description, 
        "afterPlayReport", "competitionType", crew, "tournamentParticipants", 
        groups, "featureArtists", "totalJuryMembers", status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()) 
      RETURNING *`,
      [
        title, startDateTime, endDateTime, location, address, description,
        afterPlayReport, competitionType, JSON.stringify(crew), 
        JSON.stringify(tournamentParticipants), JSON.stringify(groups),
        JSON.stringify(featureArtists), totalJuryMembers, status
      ]
    );
    
    // Emit WebSocket events for real-time updates
    emitDataUpdate('rounds', result.rows[0]);
    emitAdminUpdate('rounds', result.rows[0]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating round:', error);
    res.status(500).json({ error: 'Failed to create round' });
  }
});

// Update round
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Build dynamic UPDATE query based on provided fields
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    if (req.body.title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      updateValues.push(req.body.title);
    }
    if (req.body.startDateTime !== undefined) {
      updateFields.push(`"startDateTime" = $${paramIndex++}`);
      updateValues.push(req.body.startDateTime);
    }
    if (req.body.endDateTime !== undefined) {
      updateFields.push(`"endDateTime" = $${paramIndex++}`);
      updateValues.push(req.body.endDateTime);
    }
    if (req.body.location !== undefined) {
      updateFields.push(`location = $${paramIndex++}`);
      updateValues.push(req.body.location);
    }
    if (req.body.address !== undefined) {
      updateFields.push(`address = $${paramIndex++}`);
      updateValues.push(req.body.address);
    }
    if (req.body.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(req.body.description);
    }
    if (req.body.afterPlayReport !== undefined) {
      updateFields.push(`"afterPlayReport" = $${paramIndex++}`);
      updateValues.push(req.body.afterPlayReport);
    }
    if (req.body.competitionType !== undefined) {
      updateFields.push(`"competitionType" = $${paramIndex++}`);
      updateValues.push(req.body.competitionType);
    }
    if (req.body.crew !== undefined) {
      updateFields.push(`crew = $${paramIndex++}`);
      updateValues.push(JSON.stringify(req.body.crew));
    }
    if (req.body.tournamentParticipants !== undefined) {
      updateFields.push(`"tournamentParticipants" = $${paramIndex++}`);
      updateValues.push(JSON.stringify(req.body.tournamentParticipants));
    }
    if (req.body.groups !== undefined) {
      updateFields.push(`groups = $${paramIndex++}`);
      updateValues.push(JSON.stringify(req.body.groups));
    }
    if (req.body.featureArtists !== undefined) {
      updateFields.push(`"featureArtists" = $${paramIndex++}`);
      updateValues.push(JSON.stringify(req.body.featureArtists));
    }
    if (req.body.totalJuryMembers !== undefined) {
      updateFields.push(`"totalJuryMembers" = $${paramIndex++}`);
      updateValues.push(req.body.totalJuryMembers);
    }
    if (req.body.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(req.body.status);
    }
    
    // Add updated_at field
    updateFields.push(`updated_at = NOW()`);
    
    // Add WHERE clause
    updateValues.push(id);
    
    const query = `UPDATE rounds SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    console.log('Update query:', query);
    console.log('Update values:', updateValues);
    
    const result = await executeQuery(query, updateValues);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Round not found' });
    }
    
    // Emit WebSocket events for real-time updates
    emitDataUpdate('rounds', result.rows[0]);
    emitAdminUpdate('rounds', result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating round:', error);
    res.status(500).json({ error: 'Failed to update round' });
  }
});

// Delete round
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(
      'DELETE FROM rounds WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Round not found' });
    }
    
    // Emit WebSocket events for real-time updates
    emitDataUpdate('rounds', { id, deleted: true });
    emitAdminUpdate('rounds', { id, deleted: true });
    
    res.json({ message: 'Round deleted successfully' });
  } catch (error) {
    console.error('Error deleting round:', error);
    res.status(500).json({ error: 'Failed to delete round' });
  }
});

// Search rounds
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const searchTerm = `%${query}%`;
    
    const result = await executeQuery(
      `SELECT * FROM rounds 
       WHERE title ILIKE $1 OR location ILIKE $1 OR description ILIKE $1
       ORDER BY "startDateTime" ASC`,
      [searchTerm]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching rounds:', error);
    res.status(500).json({ error: 'Failed to search rounds' });
  }
});

// Get rounds by status
router.get('/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    
    const result = await executeQuery(
      'SELECT * FROM rounds WHERE status = $1 ORDER BY "startDateTime" ASC',
      [status]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching rounds by status:', error);
    res.status(500).json({ error: 'Failed to fetch rounds by status' });
  }
});

// Get rounds by competition type
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    
    const result = await executeQuery(
      'SELECT * FROM rounds WHERE competitionType = $1 ORDER BY "startDateTime" ASC',
      [type]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching rounds by type:', error);
    res.status(500).json({ error: 'Failed to fetch rounds by type' });
  }
});

export default router;
