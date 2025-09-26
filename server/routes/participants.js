import express from 'express';
import { executeQuery, executeTransaction } from '../config/database.js';
import { emitDataUpdate, emitAdminUpdate } from '../services/websocketService.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { 
  validateParticipant, 
  validateId, 
  handleValidationErrors,
  checkResourceExists 
} from '../middleware/validation.js';

const router = express.Router();

// Get all participants
router.get('/', async (req, res) => {
  try {
    const result = await executeQuery(
      'SELECT * FROM participants ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

// Get participant by ID
router.get('/:id', validateId, handleValidationErrors, checkResourceExists('participants'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await executeQuery(
      'SELECT * FROM participants WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching participant:', error);
    res.status(500).json({ error: 'Failed to fetch participant' });
  }
});

// Create new participant (admin only)
router.post('/', authenticateToken, authorize('admin', 'organizer'), validateParticipant, handleValidationErrors, async (req, res) => {
  try {
    const { name, role, region, pronouns, instagram } = req.body;
    
    const result = await executeQuery(
      `INSERT INTO participants (name, role, region, pronouns, instagram, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING *`,
      [name, role, region, pronouns, instagram]
    );
    
    // Emit WebSocket events for real-time updates
    emitDataUpdate('participants', result.rows[0]);
    emitAdminUpdate('participants', result.rows[0]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating participant:', error);
    res.status(500).json({ error: 'Failed to create participant' });
  }
});

// Update participant (admin only)
router.put('/:id', authenticateToken, authorize('admin', 'organizer'), validateId, validateParticipant, handleValidationErrors, checkResourceExists('participants'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, region, pronouns, instagram } = req.body;
    
    const result = await executeQuery(
      `UPDATE participants 
       SET name = $1, role = $2, region = $3, pronouns = $4, instagram = $5, updated_at = NOW()
       WHERE id = $6 
       RETURNING *`,
      [name, role, region, pronouns, instagram, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    
    // Emit WebSocket events for real-time updates
    emitDataUpdate('participants', result.rows[0]);
    emitAdminUpdate('participants', result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating participant:', error);
    res.status(500).json({ error: 'Failed to update participant' });
  }
});

// Delete participant (admin only)
router.delete('/:id', authenticateToken, authorize('admin'), validateId, handleValidationErrors, checkResourceExists('participants'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(
      'DELETE FROM participants WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    
    // Emit WebSocket events for real-time updates
    emitDataUpdate('participants', { id, deleted: true });
    emitAdminUpdate('participants', { id, deleted: true });
    
    res.json({ message: 'Participant deleted successfully' });
  } catch (error) {
    console.error('Error deleting participant:', error);
    res.status(500).json({ error: 'Failed to delete participant' });
  }
});

// Search participants
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const searchTerm = `%${query}%`;
    
    const result = await executeQuery(
      `SELECT * FROM participants 
       WHERE name ILIKE $1 OR role ILIKE $1 OR region ILIKE $1
       ORDER BY name ASC`,
      [searchTerm]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching participants:', error);
    res.status(500).json({ error: 'Failed to search participants' });
  }
});

export default router;
