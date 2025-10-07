-- Migration: Update Supporter role to Supporter*in for gender neutrality
-- Date: 2024-01-30
-- Description: Updates all existing "Supporter" roles to "Supporter*in" for gender-neutral language

-- Update participants table
UPDATE participants 
SET role = 'Supporter*in' 
WHERE role = 'Supporter';

-- Update participants table for comma-separated roles
UPDATE participants 
SET role = REPLACE(role, 'Supporter', 'Supporter*in')
WHERE role LIKE '%Supporter%' AND role != 'Supporter*in';

-- Log the changes
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Count how many records were updated
    SELECT COUNT(*) INTO updated_count 
    FROM participants 
    WHERE role LIKE '%Supporter*in%';
    
    -- Log the update
    RAISE NOTICE 'Updated % participant records to use Supporter*in role', updated_count;
END $$;
