-- Migration: Fix typo in Wettberwerbsleitung role name
-- Date: 2025-01-27
-- Description: Corrects the misspelling "Wettberwerbsleitung" to "Wettbewerbsleitung"

-- Update round_crew table
UPDATE round_crew 
SET role = 'Wettbewerbsleitung' 
WHERE role = 'Wettberwerbsleitung';

-- Update participants table if it exists there
UPDATE participants 
SET role = 'Wettbewerbsleitung' 
WHERE role = 'Wettberwerbsleitung';

-- Update round_participants table if it exists there
UPDATE round_participants 
SET role = 'Wettbewerbsleitung' 
WHERE role = 'Wettberwerbsleitung';

-- Update timetable_participants table if it exists there
UPDATE timetable_participants 
SET role = 'Wettbewerbsleitung' 
WHERE role = 'Wettberwerbsleitung';

-- Log the changes
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Count how many records were updated
    SELECT COUNT(*) INTO updated_count 
    FROM round_crew 
    WHERE role = 'Wettbewerbsleitung';
    
    RAISE NOTICE 'Fixed typo in % round_crew records: Wettberwerbsleitung -> Wettbewerbsleitung', updated_count;
END $$;
