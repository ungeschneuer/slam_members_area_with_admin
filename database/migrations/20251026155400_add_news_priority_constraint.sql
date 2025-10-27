-- Migration: Add CHECK constraint for news priority field
-- Date: 2025-01-27
-- Description: Adds constraint to ensure priority field only accepts valid enum values

-- Add CHECK constraint for priority field
ALTER TABLE news 
ADD CONSTRAINT chk_news_priority 
CHECK (priority IN ('NORMAL', 'HIGH', 'URGENT'));

-- Update any existing records with invalid priority values to 'NORMAL'
UPDATE news 
SET priority = 'NORMAL' 
WHERE priority NOT IN ('NORMAL', 'HIGH', 'URGENT') 
   OR priority IS NULL;

-- Add comment to document the constraint
COMMENT ON COLUMN news.priority IS 'Priority level: NORMAL, HIGH, URGENT. Defaults to NORMAL.';

-- Add index for better query performance on priority field
CREATE INDEX IF NOT EXISTS idx_news_priority 
ON news (priority);

