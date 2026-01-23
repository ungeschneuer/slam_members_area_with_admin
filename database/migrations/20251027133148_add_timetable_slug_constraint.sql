-- Migration: Add CHECK constraint for timetable_entries slug field
-- Date: 2025-10-27
-- Description: Adds constraint to ensure slug field is never NULL or empty string

-- Add CHECK constraint for slug field (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_slug_not_empty' 
        AND conrelid = 'timetable_entries'::regclass
    ) THEN
        ALTER TABLE timetable_entries 
        ADD CONSTRAINT check_slug_not_empty 
        CHECK (slug IS NOT NULL AND slug != '');
    END IF;
END $$;

-- Update any existing records with empty slug values (should not be any based on verification)
-- This is a safety measure in case any records somehow have empty slugs
UPDATE timetable_entries 
SET slug = CONCAT('event-', id, '-', EXTRACT(EPOCH FROM NOW())::bigint)
WHERE slug IS NULL OR slug = '';

-- Add comment to document the constraint
COMMENT ON COLUMN timetable_entries.slug IS 'Unique slug for timetable events. Cannot be NULL or empty string.';

-- Add index for better query performance on slug field (if not already exists)
CREATE INDEX IF NOT EXISTS idx_timetable_entries_slug 
ON timetable_entries (slug);

-- Verify constraint was added successfully
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_slug_not_empty' 
        AND conrelid = 'timetable_entries'::regclass
    ) THEN
        RAISE EXCEPTION 'Failed to add check_slug_not_empty constraint to timetable_entries table';
    END IF;
END $$;
