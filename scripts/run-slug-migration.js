#!/usr/bin/env node

import { executeQuery } from '../server/config/database.js';
import { generateSlug, generateUniqueSlug } from '../client/utils/slugUtils.js';
import logger from '../server/config/logger.js';

async function runSlugMigration() {
  try {
    logger.info('Starting slug migration...');

    // Step 1: Add slug columns
    logger.info('Adding slug columns to tables...');
    await executeQuery('ALTER TABLE news ADD COLUMN IF NOT EXISTS slug VARCHAR(255)');
    await executeQuery('ALTER TABLE participants ADD COLUMN IF NOT EXISTS slug VARCHAR(255)');
    await executeQuery('ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS slug VARCHAR(255)');

    // Step 2: Create indexes
    logger.info('Creating indexes...');
    await executeQuery('CREATE INDEX IF NOT EXISTS idx_news_slug ON news(slug)');
    await executeQuery('CREATE INDEX IF NOT EXISTS idx_participants_slug ON participants(slug)');
    await executeQuery('CREATE INDEX IF NOT EXISTS idx_timetable_slug ON timetable_entries(slug)');

    // Step 3: Generate slugs for existing content
    logger.info('Generating slugs for existing news articles...');
    const newsResult = await executeQuery('SELECT id, title FROM news WHERE slug IS NULL');
    for (const article of newsResult.rows) {
      const baseSlug = generateSlug(article.title);
      
      // Get existing slugs for uniqueness check
      const existingSlugsResult = await executeQuery('SELECT slug FROM news WHERE slug LIKE $1', [`${baseSlug}%`]);
      const existingSlugs = existingSlugsResult.rows.map(row => row.slug);
      const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);
      
      await executeQuery('UPDATE news SET slug = $1 WHERE id = $2', [uniqueSlug, article.id]);
      logger.info(`Generated slug for news ${article.id}: ${uniqueSlug}`);
    }

    logger.info('Generating slugs for existing participants...');
    const participantsResult = await executeQuery('SELECT id, name FROM participants WHERE slug IS NULL');
    for (const participant of participantsResult.rows) {
      const baseSlug = generateSlug(participant.name);
      
      // Get existing slugs for uniqueness check
      const existingSlugsResult = await executeQuery('SELECT slug FROM participants WHERE slug LIKE $1', [`${baseSlug}%`]);
      const existingSlugs = existingSlugsResult.rows.map(row => row.slug);
      const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);
      
      await executeQuery('UPDATE participants SET slug = $1 WHERE id = $2', [uniqueSlug, participant.id]);
      logger.info(`Generated slug for participant ${participant.id}: ${uniqueSlug}`);
    }

    logger.info('Generating slugs for existing timetable entries...');
    const timetableResult = await executeQuery('SELECT id, title FROM timetable_entries WHERE slug IS NULL');
    for (const entry of timetableResult.rows) {
      const baseSlug = generateSlug(entry.title);
      
      // Get existing slugs for uniqueness check
      const existingSlugsResult = await executeQuery('SELECT slug FROM timetable_entries WHERE slug LIKE $1', [`${baseSlug}%`]);
      const existingSlugs = existingSlugsResult.rows.map(row => row.slug);
      const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);
      
      await executeQuery('UPDATE timetable_entries SET slug = $1 WHERE id = $2', [uniqueSlug, entry.id]);
      logger.info(`Generated slug for timetable entry ${entry.id}: ${uniqueSlug}`);
    }

    // Step 4: Make slug columns NOT NULL and UNIQUE
    logger.info('Setting NOT NULL constraints...');
    await executeQuery('ALTER TABLE news ALTER COLUMN slug SET NOT NULL');
    await executeQuery('ALTER TABLE participants ALTER COLUMN slug SET NOT NULL');
    await executeQuery('ALTER TABLE timetable_entries ALTER COLUMN slug SET NOT NULL');

    logger.info('Adding unique constraints...');
    await executeQuery('ALTER TABLE news ADD CONSTRAINT news_slug_unique UNIQUE (slug)');
    await executeQuery('ALTER TABLE participants ADD CONSTRAINT participants_slug_unique UNIQUE (slug)');
    await executeQuery('ALTER TABLE timetable_entries ADD CONSTRAINT timetable_entries_slug_unique UNIQUE (slug)');

    logger.info('Slug migration completed successfully!');
    
    // Verify the migration
    const newsCount = await executeQuery('SELECT COUNT(*) as count FROM news');
    const participantsCount = await executeQuery('SELECT COUNT(*) as count FROM participants');
    const timetableCount = await executeQuery('SELECT COUNT(*) as count FROM timetable_entries');
    
    logger.info('Migration verification:', {
      news: newsCount.rows[0].count,
      participants: participantsCount.rows[0].count,
      timetable: timetableCount.rows[0].count
    });

  } catch (error) {
    logger.error('Slug migration failed:', error);
    throw error;
  }
}

// Run the migration
runSlugMigration()
  .then(() => {
    logger.info('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration failed:', error);
    process.exit(1);
  });
