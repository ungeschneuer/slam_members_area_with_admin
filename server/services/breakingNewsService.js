import { executeTransaction } from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Set an article as breaking news, clearing any existing breaking news
 * This operation is atomic and uses a transaction to ensure consistency
 *
 * @param {number} articleId - ID of the article to set as breaking news
 * @param {string|null} expiresAt - ISO timestamp when breaking news should expire (optional)
 * @returns {Promise<object>} The updated article
 * @throws {Error} If article is not found, not published, or transaction fails
 */
export const setBreakingNews = async (articleId, expiresAt = null) => {
  return executeTransaction(async (client) => {
    // 1. Clean up expired breaking news before setting new one
    const expiredCleanup = await client.query(
      'UPDATE news SET is_breaking_news = false, breaking_news_until = NULL WHERE is_breaking_news = true AND breaking_news_until < NOW() RETURNING id'
    );

    if (expiredCleanup.rows.length > 0) {
      logger.info('Cleaned up expired breaking news', {
        count: expiredCleanup.rows.length,
        articleIds: expiredCleanup.rows.map(r => r.id)
      });
    }

    // 2. Clear any existing breaking news
    const existingCleanup = await client.query(
      'UPDATE news SET is_breaking_news = false, breaking_news_until = NULL WHERE is_breaking_news = true RETURNING id, title'
    );

    if (existingCleanup.rows.length > 0) {
      logger.info('Cleared existing breaking news', {
        count: existingCleanup.rows.length,
        previousArticles: existingCleanup.rows.map(r => ({ id: r.id, title: r.title }))
      });
    }

    // 2a. Validate no breaking news remains (defensive check)
    const validationResult = await client.query(
      'SELECT COUNT(*) as count FROM news WHERE is_breaking_news = true'
    );

    if (parseInt(validationResult.rows[0].count) > 0) {
      logger.error('Breaking news transaction validation failed: breaking news still exists after cleanup', {
        remainingCount: validationResult.rows[0].count
      });
      throw new Error('Failed to clear existing breaking news - transaction state inconsistent');
    }

    // 3. Set the new breaking news
    const updateResult = await client.query(`
      UPDATE news
      SET is_breaking_news = true,
          breaking_news_until = $2,
          "updated_at" = NOW()
      WHERE id = $1 AND status = 'PUBLISHED'
      RETURNING *
    `, [articleId, expiresAt]);

    if (updateResult.rows.length === 0) {
      logger.error('Breaking news transaction failed: article disappeared or unpublished during transaction', {
        articleId
      });
      throw new Error('News article not found or not published');
    }

    return updateResult.rows[0];
  });
};
