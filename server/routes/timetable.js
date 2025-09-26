import express from 'express';
import { executeQuery, executeTransaction } from '../config/database.js';
import { emitDataUpdate, emitAdminUpdate } from '../services/websocketService.js';

const router = express.Router();

// Get all timetable entries
router.get('/', async (req, res) => {
  try {
    const result = await executeQuery(
      'SELECT * FROM timetable_entries ORDER BY date ASC, time ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching timetable:', error);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

// Get timetable entry by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await executeQuery(
      'SELECT * FROM timetable_entries WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Timetable entry not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching timetable entry:', error);
    res.status(500).json({ error: 'Failed to fetch timetable entry' });
  }
});

// Create new timetable entry
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      detailedDescription,
      location,
      date,
      time,
      type,
      status,
      participants,
      additionalLinks
    } = req.body;
    
    const result = await executeQuery(
      `INSERT INTO timetable_entries (
        title, description, "detailedDescription", location, date, time, 
        type, status, participants, "additionalLinks", created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) 
      RETURNING *`,
      [
        title, description, detailedDescription, location, date, time,
        type, status, JSON.stringify(participants), JSON.stringify(additionalLinks)
      ]
    );
    
    // Emit WebSocket events for real-time updates
    emitDataUpdate('timetable', result.rows[0]);
    emitAdminUpdate('timetable', result.rows[0]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating timetable entry:', error);
    res.status(500).json({ error: 'Failed to create timetable entry' });
  }
});

// Update timetable entry
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
    if (req.body.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(req.body.description);
    }
    if (req.body.detailedDescription !== undefined) {
      updateFields.push(`"detailedDescription" = $${paramIndex++}`);
      updateValues.push(req.body.detailedDescription);
    }
    if (req.body.location !== undefined) {
      updateFields.push(`location = $${paramIndex++}`);
      updateValues.push(req.body.location);
    }
    if (req.body.date !== undefined) {
      updateFields.push(`date = $${paramIndex++}`);
      updateValues.push(req.body.date);
    }
    if (req.body.time !== undefined) {
      updateFields.push(`time = $${paramIndex++}`);
      updateValues.push(req.body.time);
    }
    if (req.body.type !== undefined) {
      updateFields.push(`type = $${paramIndex++}`);
      updateValues.push(req.body.type);
    }
    if (req.body.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(req.body.status);
    }
    if (req.body.participants !== undefined) {
      updateFields.push(`participants = $${paramIndex++}`);
      updateValues.push(JSON.stringify(req.body.participants));
    }
    if (req.body.additionalLinks !== undefined) {
      updateFields.push(`"additionalLinks" = $${paramIndex++}`);
      updateValues.push(JSON.stringify(req.body.additionalLinks));
    }
    
    // Add updated_at field
    updateFields.push(`updated_at = NOW()`);
    
    // Add WHERE clause
    updateValues.push(id);
    
    const query = `UPDATE timetable_entries SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await executeQuery(query, updateValues);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Timetable entry not found' });
    }
    
    // Emit WebSocket events for real-time updates
    emitDataUpdate('timetable', result.rows[0]);
    emitAdminUpdate('timetable', result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating timetable entry:', error);
    res.status(500).json({ error: 'Failed to update timetable entry' });
  }
});

// Delete timetable entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(
      'DELETE FROM timetable_entries WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Timetable entry not found' });
    }
    
    // Emit WebSocket events for real-time updates
    emitDataUpdate('timetable', { id, deleted: true });
    emitAdminUpdate('timetable', { id, deleted: true });
    
    res.json({ message: 'Timetable entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting timetable entry:', error);
    res.status(500).json({ error: 'Failed to delete timetable entry' });
  }
});

// Search timetable entries
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const searchTerm = `%${query}%`;
    
    const result = await executeQuery(
      `SELECT * FROM timetable_entries 
       WHERE title ILIKE $1 OR description ILIKE $1 OR location ILIKE $1
       ORDER BY date ASC, time ASC`,
      [searchTerm]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching timetable:', error);
    res.status(500).json({ error: 'Failed to search timetable' });
  }
});

// Get timetable entries by date
router.get('/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    const result = await executeQuery(
      'SELECT * FROM timetable_entries WHERE date = $1 ORDER BY time ASC',
      [date]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching timetable by date:', error);
    res.status(500).json({ error: 'Failed to fetch timetable by date' });
  }
});

// Get timetable entries by type
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    
    const result = await executeQuery(
      'SELECT * FROM timetable_entries WHERE type = $1 ORDER BY date ASC, time ASC',
      [type]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching timetable by type:', error);
    res.status(500).json({ error: 'Failed to fetch timetable by type' });
  }
});

export default router;
