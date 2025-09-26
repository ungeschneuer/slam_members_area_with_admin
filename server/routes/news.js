import express from 'express';
import { executeQuery, executeTransaction } from '../config/database.js';
import { emitDataUpdate, emitAdminUpdate } from '../services/websocketService.js';

const router = express.Router();

// Get all news
router.get('/', async (req, res) => {
  try {
    const result = await executeQuery(
      'SELECT * FROM news ORDER BY "publishedAt" DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Get news by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await executeQuery(
      'SELECT * FROM news WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'News not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Create new news
router.post('/', async (req, res) => {
  try {
    const {
      title,
      content,
      category,
      status,
      publishedAt
    } = req.body;
    
    const result = await executeQuery(
      `INSERT INTO news (title, content, category, status, "publishedAt", created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING *`,
      [title, content, category, status, publishedAt]
    );
    
    // Emit WebSocket events for real-time updates
    emitDataUpdate('news', result.rows[0]);
    emitAdminUpdate('news', result.rows[0]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating news:', error);
    res.status(500).json({ error: 'Failed to create news' });
  }
});

// Update news
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      category,
      status,
      publishedAt
    } = req.body;
    
    const result = await executeQuery(
      `UPDATE news 
       SET title = $1, content = $2, category = $3, status = $4, 
           "publishedAt" = $5, updated_at = NOW()
       WHERE id = $6 
       RETURNING *`,
      [title, content, category, status, publishedAt, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'News not found' });
    }
    
    // Emit WebSocket events for real-time updates
    emitDataUpdate('news', result.rows[0]);
    emitAdminUpdate('news', result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating news:', error);
    res.status(500).json({ error: 'Failed to update news' });
  }
});

// Delete news
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(
      'DELETE FROM news WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'News not found' });
    }
    
    // Emit WebSocket events for real-time updates
    emitDataUpdate('news', { id, deleted: true });
    emitAdminUpdate('news', { id, deleted: true });
    
    res.json({ message: 'News deleted successfully' });
  } catch (error) {
    console.error('Error deleting news:', error);
    res.status(500).json({ error: 'Failed to delete news' });
  }
});

// Get published news
router.get('/published/all', async (req, res) => {
  try {
    const result = await executeQuery(
      'SELECT * FROM news WHERE status = \'PUBLISHED\' ORDER BY "publishedAt" DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching published news:', error);
    res.status(500).json({ error: 'Failed to fetch published news' });
  }
});

// Search news
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const searchTerm = `%${query}%`;
    
    const result = await executeQuery(
      `SELECT * FROM news 
       WHERE title ILIKE $1 OR content ILIKE $1
       ORDER BY "publishedAt" DESC`,
      [searchTerm]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching news:', error);
    res.status(500).json({ error: 'Failed to search news' });
  }
});

// Get news by content type
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    
    const result = await executeQuery(
      'SELECT * FROM news WHERE category = $1 ORDER BY "publishedAt" DESC',
      [type]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching news by type:', error);
    res.status(500).json({ error: 'Failed to fetch news by type' });
  }
});

export default router;
