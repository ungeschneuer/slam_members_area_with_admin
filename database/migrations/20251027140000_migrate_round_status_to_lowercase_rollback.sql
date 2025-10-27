-- Rollback Migration: Convert round status values back to UPPERCASE
-- Date: 2025-10-27
-- Description: Rollback lowercase status values to UPPERCASE (if needed)

-- Revert status values to UPPERCASE
UPDATE rounds SET status = 'SCHEDULED' WHERE status = 'confirmed';
UPDATE rounds SET status = 'ONGOING' WHERE status = 'active';
UPDATE rounds SET status = 'COMPLETED' WHERE status = 'completed';
UPDATE rounds SET status = 'CANCELLED' WHERE status = 'cancelled';
UPDATE rounds SET status = 'POSTPONED' WHERE status = 'postponed';

-- Restore original comment
COMMENT ON COLUMN rounds.status IS 'Round status: SCHEDULED, ONGOING, COMPLETED, CANCELLED, POSTPONED';

-- Verify rollback completed successfully
DO $$
DECLARE
    lowercase_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO lowercase_count 
    FROM rounds 
    WHERE status IN ('confirmed', 'tentative', 'upcoming', 'active', 'completed', 'cancelled', 'postponed');
    
    IF lowercase_count > 0 THEN
        RAISE EXCEPTION 'Rollback failed: % rounds still have lowercase status values', lowercase_count;
    END IF;
END $$;
