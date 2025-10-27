-- Migration: Remove is_published field from info_pages table
-- Date: 2025-01-27
-- Description: Removes redundant is_published field and index, using only status field for consistency with news

-- Drop the index first
DROP INDEX IF EXISTS idx_info_pages_is_published;

-- Drop the is_published column
ALTER TABLE info_pages 
DROP COLUMN IF EXISTS is_published;

-- Add comment to document the change
COMMENT ON COLUMN info_pages.status IS 'Publication status: DRAFT, PUBLISHED, ARCHIVED. Use status = ''PUBLISHED'' to filter published pages.';

