import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { executeQuery, executeTransaction } from '../config/database.js';
import { emitDataUpdate, emitAdminUpdate } from '../services/websocketService.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'info-pages');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get all info pages (public)
router.get('/', async (req, res) => {
  try {
    const { category, status = 'PUBLISHED' } = req.query;
    
    let query = 'SELECT * FROM info_pages WHERE "isPublished" = true';
    const params = [];
    let paramIndex = 1;
    
    if (category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(category);
    }
    
    if (status && status !== 'PUBLISHED') {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    
    query += ' ORDER BY "order" ASC, "createdAt" DESC';
    
    const result = await executeQuery(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching info pages:', error);
    res.status(500).json({ error: 'Failed to fetch info pages' });
  }
});

// Get all info pages (admin - includes drafts)
router.get('/admin', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = 'SELECT * FROM info_pages';
    const params = [];
    
    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }
    
    query += ' ORDER BY "order" ASC, "createdAt" DESC';
    
    const result = await executeQuery(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching info pages for admin:', error);
    res.status(500).json({ error: 'Failed to fetch info pages' });
  }
});

// Get info page by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const result = await executeQuery(
      'SELECT * FROM info_pages WHERE slug = $1 AND "isPublished" = true',
      [slug]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Info page not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching info page by slug:', error);
    res.status(500).json({ error: 'Failed to fetch info page' });
  }
});

// Get info page by ID (admin)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(
      'SELECT * FROM info_pages WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Info page not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching info page:', error);
    res.status(500).json({ error: 'Failed to fetch info page' });
  }
});

// Create new info page
router.post('/', async (req, res) => {
  try {
    const {
      title,
      slug,
      content,
      excerpt,
      category = 'general',
      order = 0,
      status = 'DRAFT',
      featuredImageUrl,
      metaDescription,
      tags = [],
      isPublished = false
    } = req.body;
    
    const result = await executeQuery(
      `INSERT INTO info_pages (
        title, slug, content, excerpt, category, "order", status,
        "featuredImageUrl", "metaDescription", tags, "isPublished", "publishedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *`,
      [
        title, slug, content, excerpt, category, order, status,
        featuredImageUrl, metaDescription, tags, isPublished,
        isPublished ? new Date() : null
      ]
    );
    
    // Emit WebSocket events for real-time updates
    emitDataUpdate('infoPages', result.rows[0]);
    emitAdminUpdate('infoPages', result.rows[0]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating info page:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Slug already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create info page' });
    }
  }
});

// Update info page
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Build dynamic UPDATE query based on provided fields
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    const fields = [
      'title', 'slug', 'content', 'excerpt', 'category', 'order', 'status',
      'featuredImageUrl', 'metaDescription', 'tags', 'isPublished'
    ];
    
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'order') {
          updateFields.push(`"order" = $${paramIndex++}`);
        } else if (field === 'featuredImageUrl') {
          updateFields.push(`"featuredImageUrl" = $${paramIndex++}`);
        } else if (field === 'metaDescription') {
          updateFields.push(`"metaDescription" = $${paramIndex++}`);
        } else if (field === 'isPublished') {
          updateFields.push(`"isPublished" = $${paramIndex++}`);
        } else {
          updateFields.push(`${field} = $${paramIndex++}`);
        }
        updateValues.push(req.body[field]);
      }
    });
    
    // Handle publishedAt field
    if (req.body.isPublished !== undefined) {
      if (req.body.isPublished) {
        updateFields.push(`"publishedAt" = NOW()`);
      } else {
        updateFields.push(`"publishedAt" = NULL`);
      }
    }
    
    // Add updated_at field
    updateFields.push(`"updatedAt" = NOW()`);
    
    // Add WHERE clause
    updateValues.push(id);
    
    const query = `UPDATE info_pages SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await executeQuery(query, updateValues);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Info page not found' });
    }
    
    // Emit WebSocket events for real-time updates
    emitDataUpdate('infoPages', result.rows[0]);
    emitAdminUpdate('infoPages', result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating info page:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Slug already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update info page' });
    }
  }
});

// Delete info page
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(
      'DELETE FROM info_pages WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Info page not found' });
    }
    
    // Emit WebSocket events for real-time updates
    emitDataUpdate('infoPages', { id, deleted: true });
    emitAdminUpdate('infoPages', { id, deleted: true });
    
    res.json({ message: 'Info page deleted successfully' });
  } catch (error) {
    console.error('Error deleting info page:', error);
    res.status(500).json({ error: 'Failed to delete info page' });
  }
});

// Upload image for info page
router.post('/:id/upload-image', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    // Check if info page exists
    const pageResult = await executeQuery(
      'SELECT * FROM info_pages WHERE id = $1',
      [id]
    );
    
    if (pageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Info page not found' });
    }
    
    // Save image record to database
    const imageResult = await executeQuery(
      `INSERT INTO info_page_images (
        "pageId", "fileName", "originalName", "filePath", "fileSize", "mimeType"
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        id,
        req.file.filename,
        req.file.originalname,
        `/uploads/info-pages/${req.file.filename}`,
        req.file.size,
        req.file.mimetype
      ]
    );
    
    res.status(201).json({
      message: 'Image uploaded successfully',
      image: imageResult.rows[0]
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Get images for info page
router.get('/:id/images', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(
      'SELECT * FROM info_page_images WHERE "pageId" = $1 ORDER BY "uploadedAt" DESC',
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Delete image
router.delete('/images/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    
    // Get image info first
    const imageResult = await executeQuery(
      'SELECT * FROM info_page_images WHERE id = $1',
      [imageId]
    );
    
    if (imageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const image = imageResult.rows[0];
    
    // Delete file from filesystem
    const filePath = path.join(process.cwd(), 'public', image.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete from database
    await executeQuery(
      'DELETE FROM info_page_images WHERE id = $1',
      [imageId]
    );
    
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Search info pages
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const searchTerm = `%${query}%`;
    
    const result = await executeQuery(
      `SELECT * FROM info_pages 
       WHERE (title ILIKE $1 OR content ILIKE $1 OR excerpt ILIKE $1)
       AND "isPublished" = true
       ORDER BY "order" ASC, "createdAt" DESC`,
      [searchTerm]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching info pages:', error);
    res.status(500).json({ error: 'Failed to search info pages' });
  }
});

// Get info pages by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const result = await executeQuery(
      'SELECT * FROM info_pages WHERE category = $1 AND "isPublished" = true ORDER BY "order" ASC',
      [category]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching info pages by category:', error);
    res.status(500).json({ error: 'Failed to fetch info pages by category' });
  }
});

export default router;









