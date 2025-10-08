-- Migration: Allow multiple crew roles per person in rounds
-- Date: 2025-01-27
-- Description: Remove unique constraint to allow same person to have multiple roles in a round

-- Step 1: Remove the unique constraint from round_crew table
ALTER TABLE round_crew DROP CONSTRAINT round_crew_round_id_participant_id_key;

-- Step 2: Add a new unique constraint that allows multiple roles per person
-- This ensures we don't have duplicate role assignments for the same person
ALTER TABLE round_crew ADD CONSTRAINT round_crew_round_id_participant_id_role_key 
UNIQUE (round_id, participant_id, role);

-- Step 3: Add comment explaining the change
COMMENT ON CONSTRAINT round_crew_round_id_participant_id_role_key ON round_crew 
IS 'Ensures no duplicate role assignments for the same person in a round, but allows multiple roles per person';
