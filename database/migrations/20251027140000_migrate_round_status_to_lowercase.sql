-- Migration: Convert round status values from UPPERCASE to lowercase
-- Date: 2025-10-27
-- Description: Standardize all round status values to lowercase for consistency with timetable_entries

-- Update rounds table: SCHEDULED -> confirmed (semantic match with timetable_entries)
UPDATE rounds 
SET status = 'confirmed' 
WHERE status = 'SCHEDULED';

-- Update rounds table: ONGOING -> active
UPDATE rounds 
SET status = 'active' 
WHERE status = 'ONGOING';

-- Update rounds table: COMPLETED -> completed
UPDATE rounds 
SET status = 'completed' 
WHERE status = 'COMPLETED';

-- Update rounds table: CANCELLED -> cancelled
UPDATE rounds 
SET status = 'cancelled' 
WHERE status = 'CANCELLED';

-- Update rounds table: POSTPONED -> postponed
UPDATE rounds 
SET status = 'postponed' 
WHERE status = 'POSTPONED';

-- Update comment to reflect new lowercase values
COMMENT ON COLUMN rounds.status IS 'Round status: confirmed, tentative, upcoming, active, completed, cancelled, postponed';

-- Verify migration completed successfully
DO $$
DECLARE
    uppercase_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO uppercase_count 
    FROM rounds 
    WHERE status IN ('SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'POSTPONED');
    
    IF uppercase_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: % rounds still have UPPERCASE status values', uppercase_count;
    END IF;
END $$;
