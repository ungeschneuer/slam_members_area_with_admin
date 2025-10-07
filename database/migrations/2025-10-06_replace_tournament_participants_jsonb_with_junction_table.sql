-- Migration: Replace tournamentParticipants JSONB array with junction table
-- Date: 2025-10-06
-- Description: Convert JSONB array to proper relational structure

-- Step 1: Create the new junction table
CREATE TABLE IF NOT EXISTS round_participants (
    id SERIAL PRIMARY KEY,
    round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(round_id, participant_id)
);

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_round_participants_round_id ON round_participants(round_id);
CREATE INDEX IF NOT EXISTS idx_round_participants_participant_id ON round_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_round_participants_created_at ON round_participants(created_at);

-- Step 3: Migrate existing data from INTEGER array to junction table
INSERT INTO round_participants (round_id, participant_id, created_at)
SELECT 
    r.id as round_id,
    participant_id,
    r.created_at
FROM rounds r,
     unnest(r."tournamentParticipants") as participant_id
WHERE r."tournamentParticipants" IS NOT NULL 
  AND array_length(r."tournamentParticipants", 1) > 0
  AND participant_id IN (
    SELECT id FROM participants
  );

-- Step 4: Verify migration
-- Check that all data was migrated correctly
DO $$
DECLARE
    jsonb_count INTEGER;
    junction_count INTEGER;
BEGIN
    -- Count total participants in INTEGER arrays
    SELECT COALESCE(SUM(array_length(r."tournamentParticipants", 1)), 0)
    INTO jsonb_count
    FROM rounds r
    WHERE r."tournamentParticipants" IS NOT NULL 
      AND array_length(r."tournamentParticipants", 1) > 0;
    
    -- Count participants in junction table
    SELECT COUNT(*)
    INTO junction_count
    FROM round_participants;
    
    -- Verify counts match
    IF jsonb_count != junction_count THEN
        RAISE EXCEPTION 'Migration failed: Array participant count (%) != Junction count (%)', jsonb_count, junction_count;
    END IF;
    
    RAISE NOTICE 'Migration successful: % participants migrated from INTEGER array to junction table', junction_count;
END $$;

-- Step 5: Add comments for documentation
COMMENT ON TABLE round_participants IS 'Junction table linking rounds to participants, replacing tournamentParticipants INTEGER array';
COMMENT ON COLUMN round_participants.round_id IS 'Foreign key to rounds table';
COMMENT ON COLUMN round_participants.participant_id IS 'Foreign key to participants table';
COMMENT ON COLUMN round_participants.created_at IS 'When the participant was added to the round';
COMMENT ON COLUMN round_participants.updated_at IS 'When the relationship was last modified';

-- Description: Convert JSONB array to proper relational structure

-- Step 1: Create the new junction table
CREATE TABLE IF NOT EXISTS round_participants (
    id SERIAL PRIMARY KEY,
    round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(round_id, participant_id)
);

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_round_participants_round_id ON round_participants(round_id);
CREATE INDEX IF NOT EXISTS idx_round_participants_participant_id ON round_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_round_participants_created_at ON round_participants(created_at);

-- Step 3: Migrate existing data from INTEGER array to junction table
INSERT INTO round_participants (round_id, participant_id, created_at)
SELECT 
    r.id as round_id,
    participant_id,
    r.created_at
FROM rounds r,
     unnest(r."tournamentParticipants") as participant_id
WHERE r."tournamentParticipants" IS NOT NULL 
  AND array_length(r."tournamentParticipants", 1) > 0
  AND participant_id IN (
    SELECT id FROM participants
  );

-- Step 4: Verify migration
-- Check that all data was migrated correctly
DO $$
DECLARE
    jsonb_count INTEGER;
    junction_count INTEGER;
BEGIN
    -- Count total participants in INTEGER arrays
    SELECT COALESCE(SUM(array_length(r."tournamentParticipants", 1)), 0)
    INTO jsonb_count
    FROM rounds r
    WHERE r."tournamentParticipants" IS NOT NULL 
      AND array_length(r."tournamentParticipants", 1) > 0;
    
    -- Count participants in junction table
    SELECT COUNT(*)
    INTO junction_count
    FROM round_participants;
    
    -- Verify counts match
    IF jsonb_count != junction_count THEN
        RAISE EXCEPTION 'Migration failed: Array participant count (%) != Junction count (%)', jsonb_count, junction_count;
    END IF;
    
    RAISE NOTICE 'Migration successful: % participants migrated from INTEGER array to junction table', junction_count;
END $$;

-- Step 5: Add comments for documentation
COMMENT ON TABLE round_participants IS 'Junction table linking rounds to participants, replacing tournamentParticipants INTEGER array';
COMMENT ON COLUMN round_participants.round_id IS 'Foreign key to rounds table';
COMMENT ON COLUMN round_participants.participant_id IS 'Foreign key to participants table';
COMMENT ON COLUMN round_participants.created_at IS 'When the participant was added to the round';
COMMENT ON COLUMN round_participants.updated_at IS 'When the relationship was last modified';
