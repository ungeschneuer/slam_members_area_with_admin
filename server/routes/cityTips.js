import express from 'express';
import { executeQuery, executeTransaction } from '../config/database.js';
import { emitDataUpdate, emitAdminUpdate } from '../services/websocketService.js';

const router = express.Router();

// Get all city tips
router.get('/', async (req, res) => {
  try {
    const result = await executeQuery(
      'SELECT * FROM city_tips ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching city tips:', error);
    res.status(500).json({ error: 'Failed to fetch city tips' });
  }
});

// Get city tip by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await executeQuery(
      'SELECT * FROM city_tips WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'City tip not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching city tip:', error);
    res.status(500).json({ error: 'Failed to fetch city tip' });
  }
});

// Create new city tip
router.post('/', async (req, res) => {
  try {
    const {
      name,
      category,
      description,
      address,
      latitude,
      longitude,
      rating,
      price_range,
      opening_hours,
      contact_info,
      website,
      images
    } = req.body;
    
    const result = await executeQuery(
      `INSERT INTO city_tips (
        name, category, description, address, latitude, longitude, 
        rating, price_range, opening_hours, contact_info, website, images, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()) 
      RETURNING *`,
      [
        name, category, description, address, latitude, longitude,
        rating, price_range, opening_hours, contact_info, website, JSON.stringify(images)
      ]
    );
    
    // Emit WebSocket events for real-time updates
    emitDataUpdate('city-tips', result.rows[0]);
    emitAdminUpdate('city-tips', result.rows[0]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating city tip:', error);
    res.status(500).json({ error: 'Failed to create city tip' });
  }
});

// Update city tip
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Build dynamic UPDATE query based on provided fields
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    if (req.body.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(req.body.name);
    }
    if (req.body.category !== undefined) {
      updateFields.push(`category = $${paramIndex++}`);
      updateValues.push(req.body.category);
    }
    if (req.body.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(req.body.description);
    }
    if (req.body.address !== undefined) {
      updateFields.push(`address = $${paramIndex++}`);
      updateValues.push(req.body.address);
    }
    if (req.body.latitude !== undefined) {
      updateFields.push(`latitude = $${paramIndex++}`);
      updateValues.push(req.body.latitude);
    }
    if (req.body.longitude !== undefined) {
      updateFields.push(`longitude = $${paramIndex++}`);
      updateValues.push(req.body.longitude);
    }
    if (req.body.rating !== undefined) {
      updateFields.push(`rating = $${paramIndex++}`);
      updateValues.push(req.body.rating);
    }
    if (req.body.price_range !== undefined) {
      updateFields.push(`price_range = $${paramIndex++}`);
      updateValues.push(req.body.price_range);
    }
    if (req.body.opening_hours !== undefined) {
      updateFields.push(`opening_hours = $${paramIndex++}`);
      updateValues.push(req.body.opening_hours);
    }
    if (req.body.contact_info !== undefined) {
      updateFields.push(`contact_info = $${paramIndex++}`);
      updateValues.push(req.body.contact_info);
    }
    if (req.body.website !== undefined) {
      updateFields.push(`website = $${paramIndex++}`);
      updateValues.push(req.body.website);
    }
    if (req.body.images !== undefined) {
      updateFields.push(`images = $${paramIndex++}`);
      updateValues.push(JSON.stringify(req.body.images));
    }
    
    // Add updated_at field
    updateFields.push(`updated_at = NOW()`);
    
    // Add WHERE clause
    updateValues.push(id);
    
    const query = `UPDATE city_tips SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await executeQuery(query, updateValues);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'City tip not found' });
    }
    
    // Emit WebSocket events for real-time updates
    emitDataUpdate('city-tips', result.rows[0]);
    emitAdminUpdate('city-tips', result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating city tip:', error);
    res.status(500).json({ error: 'Failed to update city tip' });
  }
});

// Delete city tip
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(
      'DELETE FROM city_tips WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'City tip not found' });
    }
    
    // Emit WebSocket events for real-time updates
    emitDataUpdate('city-tips', { id, deleted: true });
    emitAdminUpdate('city-tips', { id, deleted: true });
    
    res.json({ message: 'City tip deleted successfully' });
  } catch (error) {
    console.error('Error deleting city tip:', error);
    res.status(500).json({ error: 'Failed to delete city tip' });
  }
});

// Search city tips
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const searchTerm = `%${query}%`;
    
    const result = await executeQuery(
      `SELECT * FROM city_tips 
       WHERE name ILIKE $1 OR description ILIKE $1 OR category ILIKE $1
       ORDER BY name ASC`,
      [searchTerm]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching city tips:', error);
    res.status(500).json({ error: 'Failed to search city tips' });
  }
});

// Get city tips by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const result = await executeQuery(
      'SELECT * FROM city_tips WHERE category = $1 ORDER BY name ASC',
      [category]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching city tips by category:', error);
    res.status(500).json({ error: 'Failed to fetch city tips by category' });
  }
});

// Get city tips by rating
router.get('/rating/:minRating', async (req, res) => {
  try {
    const { minRating } = req.params;
    
    const result = await executeQuery(
      'SELECT * FROM city_tips WHERE rating >= $1 ORDER BY rating DESC, name ASC',
      [minRating]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching city tips by rating:', error);
    res.status(500).json({ error: 'Failed to fetch city tips by rating' });
  }
});

// Get nearby locations
router.get('/nearby/:lat/:lng/:radius', async (req, res) => {
  try {
    const { lat, lng, radius } = req.params;
    
    const result = await executeQuery(
      `SELECT *, 
        (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * 
         cos(radians(longitude) - radians($2)) + 
         sin(radians($1)) * sin(radians(latitude)))) AS distance
       FROM city_tips 
       HAVING distance <= $3
       ORDER BY distance ASC`,
      [lat, lng, radius]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching nearby locations:', error);
    res.status(500).json({ error: 'Failed to fetch nearby locations' });
  }
});

export default router;