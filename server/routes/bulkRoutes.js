import express from 'express';
import { authenticateCookie, authorize as authorizeCookie } from '../middleware/cookieAuth.js';
import { executeQuery, executeTransaction } from '../config/database.js';
import { startTiming, endTiming, sendSuccessResponse, sendErrorResponse } from '../utils/routeHelpers.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * Bulk operations for participants
 */
router.post('/participants', authenticateCookie, authorizeCookie(['admin', 'organizer']), async (req, res) => {
  const startTime = startTiming();
  
  try {
    const { operation, items } = req.body;
    
    if (!operation || !Array.isArray(items)) {
      return sendErrorResponse(res, new Error('Invalid request format'), 'Operation and items array required', 400);
    }
    
    if (!['create', 'update', 'delete'].includes(operation)) {
      return sendErrorResponse(res, new Error('Invalid operation'), 'Operation must be create, update, or delete', 400);
    }
    
    if (items.length === 0) {
      return sendErrorResponse(res, new Error('Empty items array'), 'Items array cannot be empty', 400);
    }
    
    if (items.length > 100) {
      return sendErrorResponse(res, new Error('Too many items'), 'Maximum 100 items per bulk operation', 400);
    }
    
    const results = [];
    const errors = [];
    
    // Prepare queries for transaction
    const queries = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        let query, params;
        
        if (operation === 'create') {
          query = `
            INSERT INTO participants (name, slug, region, pronouns, instagram, role, created_at, updated_at) 
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
            RETURNING *
          `;
          params = [
            item.name || '',
            item.slug || '',
            item.region || '',
            item.pronouns || '',
            item.instagram || '',
            item.role || 'Teilnehmer*in'
          ];
        } else if (operation === 'update') {
          if (!item.id) {
            throw new Error(`Item ${i + 1}: ID required for update operation`);
          }
          query = `
            UPDATE participants 
            SET name = $1, slug = $2, region = $3, pronouns = $4, instagram = $5, role = $6, updated_at = NOW() 
            WHERE id = $7 
            RETURNING *
          `;
          params = [
            item.name || '',
            item.slug || '',
            item.region || '',
            item.pronouns || '',
            item.instagram || '',
            item.role || 'Teilnehmer*in',
            item.id
          ];
        } else if (operation === 'delete') {
          if (!item.id) {
            throw new Error(`Item ${i + 1}: ID required for delete operation`);
          }
          query = `DELETE FROM participants WHERE id = $1 RETURNING *`;
          params = [item.id];
        }
        
        queries.push({ query, params });
      } catch (error) {
        errors.push({
          index: i,
          item: item,
          error: error.message
        });
      }
    }
    
    if (errors.length > 0) {
      return sendErrorResponse(res, new Error('Validation errors'), `Validation failed for ${errors.length} items`, 400, { errors });
    }
    
    // Execute all queries in a transaction
    const transactionResults = await executeTransaction(queries);
    
    for (let i = 0; i < transactionResults.length; i++) {
      const result = transactionResults[i];
      if (result.rows.length > 0) {
        results.push({
          index: i,
          success: true,
          data: result.rows[0]
        });
      } else {
        results.push({
          index: i,
          success: false,
          error: 'No rows affected'
        });
      }
    }
    
    const duration = endTiming(startTime);
    
    logger.info('Bulk participants operation completed', {
      operation,
      itemCount: items.length,
      successCount: results.filter(r => r.success).length,
      duration: `${Math.round(duration)}ms`
    });
    
    sendSuccessResponse(res, {
      operation,
      totalItems: items.length,
      successCount: results.filter(r => r.success).length,
      results
    }, 'BULK_PARTICIPANTS', duration);
    
  } catch (error) {
    const duration = endTiming(startTime);
    sendErrorResponse(res, error, `Bulk participants ${req.body.operation} failed`);
  }
});

/**
 * Bulk operations for rounds
 */
router.post('/rounds', authenticateCookie, authorizeCookie(['admin', 'organizer']), async (req, res) => {
  const startTime = startTiming();
  
  try {
    const { operation, items } = req.body;
    
    if (!operation || !Array.isArray(items)) {
      return sendErrorResponse(res, new Error('Invalid request format'), 'Operation and items array required', 400);
    }
    
    if (!['create', 'update', 'delete'].includes(operation)) {
      return sendErrorResponse(res, new Error('Invalid operation'), 'Operation must be create, update, or delete', 400);
    }
    
    if (items.length === 0) {
      return sendErrorResponse(res, new Error('Empty items array'), 'Items array cannot be empty', 400);
    }
    
    if (items.length > 100) {
      return sendErrorResponse(res, new Error('Too many items'), 'Maximum 100 items per bulk operation', 400);
    }
    
    const results = [];
    const errors = [];
    
    // Prepare queries for transaction
    const queries = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        let query, params;
        
        if (operation === 'create') {
          // Generate slug from title
          const slug = item.title ? item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : `round-${Date.now()}`;
          
          query = `
            INSERT INTO rounds (title, slug, description, date, location, max_participants, created_at, updated_at) 
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
            RETURNING *
          `;
          params = [
            item.title || '',
            slug,
            item.description || '',
            item.date || null,
            item.location || '',
            item.max_participants || null
          ];
        } else if (operation === 'update') {
          if (!item.id) {
            throw new Error(`Item ${i + 1}: ID required for update operation`);
          }
          query = `
            UPDATE rounds 
            SET title = $1, description = $2, date = $3, location = $4, max_participants = $5, updated_at = NOW() 
            WHERE id = $6 
            RETURNING *
          `;
          params = [
            item.title || '',
            item.description || '',
            item.date || null,
            item.location || '',
            item.max_participants || null,
            item.id
          ];
        } else if (operation === 'delete') {
          if (!item.id) {
            throw new Error(`Item ${i + 1}: ID required for delete operation`);
          }
          query = `DELETE FROM rounds WHERE id = $1 RETURNING *`;
          params = [item.id];
        }
        
        queries.push({ query, params });
      } catch (error) {
        errors.push({
          index: i,
          item: item,
          error: error.message
        });
      }
    }
    
    if (errors.length > 0) {
      return sendErrorResponse(res, new Error('Validation errors'), `Validation failed for ${errors.length} items`, 400, { errors });
    }
    
    // Execute all queries in a transaction
    const transactionResults = await executeTransaction(queries);
    
    for (let i = 0; i < transactionResults.length; i++) {
      const result = transactionResults[i];
      if (result.rows.length > 0) {
        results.push({
          index: i,
          success: true,
          data: result.rows[0]
        });
      } else {
        results.push({
          index: i,
          success: false,
          error: 'No rows affected'
        });
      }
    }
    
    const duration = endTiming(startTime);
    
    logger.info('Bulk rounds operation completed', {
      operation,
      itemCount: items.length,
      successCount: results.filter(r => r.success).length,
      duration: `${Math.round(duration)}ms`
    });
    
    sendSuccessResponse(res, {
      operation,
      totalItems: items.length,
      successCount: results.filter(r => r.success).length,
      results
    }, 'BULK_ROUNDS', duration);
    
  } catch (error) {
    const duration = endTiming(startTime);
    sendErrorResponse(res, error, `Bulk rounds ${req.body.operation} failed`);
  }
});

/**
 * Bulk operations for news
 */
router.post('/news', authenticateCookie, authorizeCookie(['admin', 'organizer']), async (req, res) => {
  const startTime = startTiming();
  
  try {
    const { operation, items } = req.body;
    
    if (!operation || !Array.isArray(items)) {
      return sendErrorResponse(res, new Error('Invalid request format'), 'Operation and items array required', 400);
    }
    
    if (!['create', 'update', 'delete'].includes(operation)) {
      return sendErrorResponse(res, new Error('Invalid operation'), 'Operation must be create, update, or delete', 400);
    }
    
    if (items.length === 0) {
      return sendErrorResponse(res, new Error('Empty items array'), 'Items array cannot be empty', 400);
    }
    
    if (items.length > 100) {
      return sendErrorResponse(res, new Error('Too many items'), 'Maximum 100 items per bulk operation', 400);
    }
    
    const results = [];
    const errors = [];
    
    // Prepare queries for transaction
    const queries = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        let query, params;
        
        if (operation === 'create') {
          query = `
            INSERT INTO news (title, content, excerpt, author, published_at, created_at, updated_at) 
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
            RETURNING *
          `;
          params = [
            item.title || '',
            item.content || '',
            item.excerpt || '',
            item.author || 'Admin',
            item.published_at || null
          ];
        } else if (operation === 'update') {
          if (!item.id) {
            throw new Error(`Item ${i + 1}: ID required for update operation`);
          }
          query = `
            UPDATE news 
            SET title = $1, content = $2, excerpt = $3, author = $4, published_at = $5, updated_at = NOW() 
            WHERE id = $6 
            RETURNING *
          `;
          params = [
            item.title || '',
            item.content || '',
            item.excerpt || '',
            item.author || 'Admin',
            item.published_at || null,
            item.id
          ];
        } else if (operation === 'delete') {
          if (!item.id) {
            throw new Error(`Item ${i + 1}: ID required for delete operation`);
          }
          query = `DELETE FROM news WHERE id = $1 RETURNING *`;
          params = [item.id];
        }
        
        queries.push({ query, params });
      } catch (error) {
        errors.push({
          index: i,
          item: item,
          error: error.message
        });
      }
    }
    
    if (errors.length > 0) {
      return sendErrorResponse(res, new Error('Validation errors'), `Validation failed for ${errors.length} items`, 400, { errors });
    }
    
    // Execute all queries in a transaction
    const transactionResults = await executeTransaction(queries);
    
    for (let i = 0; i < transactionResults.length; i++) {
      const result = transactionResults[i];
      if (result.rows.length > 0) {
        results.push({
          index: i,
          success: true,
          data: result.rows[0]
        });
      } else {
        results.push({
          index: i,
          success: false,
          error: 'No rows affected'
        });
      }
    }
    
    const duration = endTiming(startTime);
    
    logger.info('Bulk news operation completed', {
      operation,
      itemCount: items.length,
      successCount: results.filter(r => r.success).length,
      duration: `${Math.round(duration)}ms`
    });
    
    sendSuccessResponse(res, {
      operation,
      totalItems: items.length,
      successCount: results.filter(r => r.success).length,
      results
    }, 'BULK_NEWS', duration);
    
  } catch (error) {
    const duration = endTiming(startTime);
    sendErrorResponse(res, error, `Bulk news ${req.body.operation} failed`);
  }
});

/**
 * Bulk operations for links
 */
router.post('/links', authenticateCookie, authorizeCookie(['admin', 'organizer']), async (req, res) => {
  const startTime = startTiming();
  
  try {
    const { operation, items } = req.body;
    
    if (!operation || !Array.isArray(items)) {
      return sendErrorResponse(res, new Error('Invalid request format'), 'Operation and items array required', 400);
    }
    
    if (!['create', 'update', 'delete'].includes(operation)) {
      return sendErrorResponse(res, new Error('Invalid operation'), 'Operation must be create, update, or delete', 400);
    }
    
    if (items.length === 0) {
      return sendErrorResponse(res, new Error('Empty items array'), 'Items array cannot be empty', 400);
    }
    
    if (items.length > 100) {
      return sendErrorResponse(res, new Error('Too many items'), 'Maximum 100 items per bulk operation', 400);
    }
    
    const results = [];
    const errors = [];
    
    // Prepare queries for transaction
    const queries = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        let query, params;
        
        if (operation === 'create') {
          query = `
            INSERT INTO links (title, url, description, category, sort_order, is_active, created_at, updated_at) 
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
            RETURNING *
          `;
          params = [
            item.title || '',
            item.url || '',
            item.description || '',
            item.category || 'general',
            item.sort_order || 0,
            item.is_active !== false
          ];
        } else if (operation === 'update') {
          if (!item.id) {
            throw new Error(`Item ${i + 1}: ID required for update operation`);
          }
          query = `
            UPDATE links 
            SET title = $1, url = $2, description = $3, category = $4, sort_order = $5, is_active = $6, updated_at = NOW() 
            WHERE id = $7 
            RETURNING *
          `;
          params = [
            item.title || '',
            item.url || '',
            item.description || '',
            item.category || 'general',
            item.sort_order || 0,
            item.is_active !== false,
            item.id
          ];
        } else if (operation === 'delete') {
          if (!item.id) {
            throw new Error(`Item ${i + 1}: ID required for delete operation`);
          }
          query = `DELETE FROM links WHERE id = $1 RETURNING *`;
          params = [item.id];
        }
        
        queries.push({ query, params });
      } catch (error) {
        errors.push({
          index: i,
          item: item,
          error: error.message
        });
      }
    }
    
    if (errors.length > 0) {
      return sendErrorResponse(res, new Error('Validation errors'), `Validation failed for ${errors.length} items`, 400, { errors });
    }
    
    // Execute all queries in a transaction
    const transactionResults = await executeTransaction(queries);
    
    for (let i = 0; i < transactionResults.length; i++) {
      const result = transactionResults[i];
      if (result.rows.length > 0) {
        results.push({
          index: i,
          success: true,
          data: result.rows[0]
        });
      } else {
        results.push({
          index: i,
          success: false,
          error: 'No rows affected'
        });
      }
    }
    
    const duration = endTiming(startTime);
    
    logger.info('Bulk links operation completed', {
      operation,
      itemCount: items.length,
      successCount: results.filter(r => r.success).length,
      duration: `${Math.round(duration)}ms`
    });
    
    sendSuccessResponse(res, {
      operation,
      totalItems: items.length,
      successCount: results.filter(r => r.success).length,
      results
    }, 'BULK_LINKS', duration);
    
  } catch (error) {
    const duration = endTiming(startTime);
    sendErrorResponse(res, error, `Bulk links ${req.body.operation} failed`);
  }
});

export default router;
