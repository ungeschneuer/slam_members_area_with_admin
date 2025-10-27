-- Rollback Migration: Remove CHECK constraint for timetable_entries slug field
-- Date: 2025-10-27
-- Description: Removes the check_slug_not_empty constraint from timetable_entries table

-- Remove the CHECK constraint
ALTER TABLE timetable_entries 
DROP CONSTRAINT IF EXISTS check_slug_not_empty;

-- Remove the index (optional - can be kept for performance)
DROP INDEX IF EXISTS idx_timetable_entries_slug;

-- Remove the comment
COMMENT ON COLUMN timetable_entries.slug IS NULL;

-- Verify constraint was removed successfully
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_slug_not_empty' 
        AND conrelid = 'timetable_entries'::regclass
    ) THEN
        RAISE EXCEPTION 'Failed to remove check_slug_not_empty constraint from timetable_entries table';
    END IF;
END $$;
