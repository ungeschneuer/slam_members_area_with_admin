-- Migration: Convert all JSONB arrays to junction tables
-- Date: 2025-10-06
-- Description: Convert timetable_entries.participants, rounds.crew, and rounds.featureArtists to junction tables

-- ============================================================================
-- STEP 1: CREATE JUNCTION TABLES
-- ============================================================================

-- 1.1: Create timetable_participants junction table
CREATE TABLE IF NOT EXISTS timetable_participants (
    id SERIAL PRIMARY KEY,
    timetable_entry_id INTEGER NOT NULL REFERENCES timetable_entries(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(timetable_entry_id, participant_id)
);

-- 1.2: Create round_crew junction table
CREATE TABLE IF NOT EXISTS round_crew (
    id SERIAL PRIMARY KEY,
    round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(round_id, participant_id)
);

-- 1.3: Create round_feature_artists junction table
CREATE TABLE IF NOT EXISTS round_feature_artists (
    id SERIAL PRIMARY KEY,
    round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(round_id, participant_id)
);

-- ============================================================================
-- STEP 2: ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- Timetable participants indexes
CREATE INDEX IF NOT EXISTS idx_timetable_participants_entry_id ON timetable_participants(timetable_entry_id);
CREATE INDEX IF NOT EXISTS idx_timetable_participants_participant_id ON timetable_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_timetable_participants_role ON timetable_participants(role);

-- Round crew indexes
CREATE INDEX IF NOT EXISTS idx_round_crew_round_id ON round_crew(round_id);
CREATE INDEX IF NOT EXISTS idx_round_crew_participant_id ON round_crew(participant_id);
CREATE INDEX IF NOT EXISTS idx_round_crew_role ON round_crew(role);

-- Round feature artists indexes
CREATE INDEX IF NOT EXISTS idx_round_feature_artists_round_id ON round_feature_artists(round_id);
CREATE INDEX IF NOT EXISTS idx_round_feature_artists_participant_id ON round_feature_artists(participant_id);
CREATE INDEX IF NOT EXISTS idx_round_feature_artists_order ON round_feature_artists(display_order);

-- ============================================================================
-- STEP 3: CREATE BACKUP TABLES
-- ============================================================================

-- Backup timetable_entries.participants
CREATE TABLE IF NOT EXISTS timetable_participants_backup AS
SELECT 
    id as timetable_entry_id,
    title,
    participants,
    created_at,
    updated_at
FROM timetable_entries 
WHERE participants IS NOT NULL 
  AND jsonb_array_length(participants) > 0;

-- Backup rounds.crew
CREATE TABLE IF NOT EXISTS round_crew_backup AS
SELECT 
    id as round_id,
    title,
    crew,
    created_at,
    updated_at
FROM rounds 
WHERE crew IS NOT NULL 
  AND jsonb_array_length(crew) > 0;

-- Backup rounds.featureArtists
CREATE TABLE IF NOT EXISTS round_feature_artists_backup AS
SELECT 
    id as round_id,
    title,
    "featureArtists",
    created_at,
    updated_at
FROM rounds 
WHERE "featureArtists" IS NOT NULL 
  AND jsonb_array_length("featureArtists") > 0;

-- ============================================================================
-- STEP 4: MIGRATE DATA TO JUNCTION TABLES
-- ============================================================================

-- 4.1: Migrate timetable_entries.participants
INSERT INTO timetable_participants (timetable_entry_id, participant_id, role, created_at)
SELECT 
    te.id as timetable_entry_id,
    (participant_data->>'participantId')::int as participant_id,
    participant_data->>'role' as role,
    te.created_at
FROM timetable_entries te,
     jsonb_array_elements(te.participants) as participant_data
WHERE te.participants IS NOT NULL 
  AND jsonb_array_length(te.participants) > 0
  AND (participant_data->>'participantId')::int IN (
    SELECT id FROM participants
  );

-- 4.2: Migrate rounds.crew
INSERT INTO round_crew (round_id, participant_id, role, created_at)
SELECT 
    r.id as round_id,
    (crew_data->>'participantId')::int as participant_id,
    crew_data->>'role' as role,
    r.created_at
FROM rounds r,
     jsonb_array_elements(r.crew) as crew_data
WHERE r.crew IS NOT NULL 
  AND jsonb_array_length(r.crew) > 0
  AND (crew_data->>'participantId')::int IN (
    SELECT id FROM participants
  );

-- 4.3: Migrate rounds.featureArtists
INSERT INTO round_feature_artists (round_id, participant_id, name, display_order, description, created_at)
SELECT 
    r.id as round_id,
    (artist_data->>'participantId')::int as participant_id,
    artist_data->>'name' as name,
    COALESCE((artist_data->>'order')::int, 1) as display_order,
    artist_data->>'description' as description,
    r.created_at
FROM rounds r,
     jsonb_array_elements(r."featureArtists") as artist_data
WHERE r."featureArtists" IS NOT NULL 
  AND jsonb_array_length(r."featureArtists") > 0
  AND (artist_data->>'participantId')::int IN (
    SELECT id FROM participants
  );

-- ============================================================================
-- STEP 5: VERIFY MIGRATION
-- ============================================================================

DO $$
DECLARE
    timetable_original_count INTEGER;
    timetable_junction_count INTEGER;
    crew_original_count INTEGER;
    crew_junction_count INTEGER;
    artists_original_count INTEGER;
    artists_junction_count INTEGER;
BEGIN
    -- Count original timetable participants
    SELECT COALESCE(SUM(jsonb_array_length(participants)), 0)
    INTO timetable_original_count
    FROM timetable_entries 
    WHERE participants IS NOT NULL 
      AND jsonb_array_length(participants) > 0;
    
    -- Count junction table timetable participants
    SELECT COUNT(*)
    INTO timetable_junction_count
    FROM timetable_participants;
    
    -- Count original crew
    SELECT COALESCE(SUM(jsonb_array_length(crew)), 0)
    INTO crew_original_count
    FROM rounds 
    WHERE crew IS NOT NULL 
      AND jsonb_array_length(crew) > 0;
    
    -- Count junction table crew
    SELECT COUNT(*)
    INTO crew_junction_count
    FROM round_crew;
    
    -- Count original feature artists
    SELECT COALESCE(SUM(jsonb_array_length("featureArtists")), 0)
    INTO artists_original_count
    FROM rounds 
    WHERE "featureArtists" IS NOT NULL 
      AND jsonb_array_length("featureArtists") > 0;
    
    -- Count junction table feature artists
    SELECT COUNT(*)
    INTO artists_junction_count
    FROM round_feature_artists;
    
    -- Verify all counts match
    IF timetable_original_count != timetable_junction_count THEN
        RAISE EXCEPTION 'Timetable migration failed: Original count (%) != Junction count (%)', 
            timetable_original_count, timetable_junction_count;
    END IF;
    
    IF crew_original_count != crew_junction_count THEN
        RAISE EXCEPTION 'Crew migration failed: Original count (%) != Junction count (%)', 
            crew_original_count, crew_junction_count;
    END IF;
    
    IF artists_original_count != artists_junction_count THEN
        RAISE EXCEPTION 'Feature artists migration failed: Original count (%) != Junction count (%)', 
            artists_original_count, artists_junction_count;
    END IF;
    
    RAISE NOTICE 'Migration successful:';
    RAISE NOTICE '  - Timetable participants: % migrated', timetable_junction_count;
    RAISE NOTICE '  - Round crew: % migrated', crew_junction_count;
    RAISE NOTICE '  - Feature artists: % migrated', artists_junction_count;
END $$;

-- ============================================================================
-- STEP 6: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE timetable_participants IS 'Junction table linking timetable entries to participants, replacing participants JSONB array';
COMMENT ON TABLE round_crew IS 'Junction table linking rounds to crew members, replacing crew JSONB array';
COMMENT ON TABLE round_feature_artists IS 'Junction table linking rounds to feature artists, replacing featureArtists JSONB array';

COMMENT ON COLUMN timetable_participants.role IS 'Role of the participant in the timetable entry';
COMMENT ON COLUMN round_crew.role IS 'Role of the crew member in the round';
COMMENT ON COLUMN round_feature_artists.display_order IS 'Display order of the feature artist';
COMMENT ON COLUMN round_feature_artists.description IS 'Description of the feature artist';
-- Date: 2025-10-06
-- Description: Convert timetable_entries.participants, rounds.crew, and rounds.featureArtists to junction tables

-- ============================================================================
-- STEP 1: CREATE JUNCTION TABLES
-- ============================================================================

-- 1.1: Create timetable_participants junction table
CREATE TABLE IF NOT EXISTS timetable_participants (
    id SERIAL PRIMARY KEY,
    timetable_entry_id INTEGER NOT NULL REFERENCES timetable_entries(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(timetable_entry_id, participant_id)
);

-- 1.2: Create round_crew junction table
CREATE TABLE IF NOT EXISTS round_crew (
    id SERIAL PRIMARY KEY,
    round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(round_id, participant_id)
);

-- 1.3: Create round_feature_artists junction table
CREATE TABLE IF NOT EXISTS round_feature_artists (
    id SERIAL PRIMARY KEY,
    round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(round_id, participant_id)
);

-- ============================================================================
-- STEP 2: ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- Timetable participants indexes
CREATE INDEX IF NOT EXISTS idx_timetable_participants_entry_id ON timetable_participants(timetable_entry_id);
CREATE INDEX IF NOT EXISTS idx_timetable_participants_participant_id ON timetable_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_timetable_participants_role ON timetable_participants(role);

-- Round crew indexes
CREATE INDEX IF NOT EXISTS idx_round_crew_round_id ON round_crew(round_id);
CREATE INDEX IF NOT EXISTS idx_round_crew_participant_id ON round_crew(participant_id);
CREATE INDEX IF NOT EXISTS idx_round_crew_role ON round_crew(role);

-- Round feature artists indexes
CREATE INDEX IF NOT EXISTS idx_round_feature_artists_round_id ON round_feature_artists(round_id);
CREATE INDEX IF NOT EXISTS idx_round_feature_artists_participant_id ON round_feature_artists(participant_id);
CREATE INDEX IF NOT EXISTS idx_round_feature_artists_order ON round_feature_artists(display_order);

-- ============================================================================
-- STEP 3: CREATE BACKUP TABLES
-- ============================================================================

-- Backup timetable_entries.participants
CREATE TABLE IF NOT EXISTS timetable_participants_backup AS
SELECT 
    id as timetable_entry_id,
    title,
    participants,
    created_at,
    updated_at
FROM timetable_entries 
WHERE participants IS NOT NULL 
  AND jsonb_array_length(participants) > 0;

-- Backup rounds.crew
CREATE TABLE IF NOT EXISTS round_crew_backup AS
SELECT 
    id as round_id,
    title,
    crew,
    created_at,
    updated_at
FROM rounds 
WHERE crew IS NOT NULL 
  AND jsonb_array_length(crew) > 0;

-- Backup rounds.featureArtists
CREATE TABLE IF NOT EXISTS round_feature_artists_backup AS
SELECT 
    id as round_id,
    title,
    "featureArtists",
    created_at,
    updated_at
FROM rounds 
WHERE "featureArtists" IS NOT NULL 
  AND jsonb_array_length("featureArtists") > 0;

-- ============================================================================
-- STEP 4: MIGRATE DATA TO JUNCTION TABLES
-- ============================================================================

-- 4.1: Migrate timetable_entries.participants
INSERT INTO timetable_participants (timetable_entry_id, participant_id, role, created_at)
SELECT 
    te.id as timetable_entry_id,
    (participant_data->>'participantId')::int as participant_id,
    participant_data->>'role' as role,
    te.created_at
FROM timetable_entries te,
     jsonb_array_elements(te.participants) as participant_data
WHERE te.participants IS NOT NULL 
  AND jsonb_array_length(te.participants) > 0
  AND (participant_data->>'participantId')::int IN (
    SELECT id FROM participants
  );

-- 4.2: Migrate rounds.crew
INSERT INTO round_crew (round_id, participant_id, role, created_at)
SELECT 
    r.id as round_id,
    (crew_data->>'participantId')::int as participant_id,
    crew_data->>'role' as role,
    r.created_at
FROM rounds r,
     jsonb_array_elements(r.crew) as crew_data
WHERE r.crew IS NOT NULL 
  AND jsonb_array_length(r.crew) > 0
  AND (crew_data->>'participantId')::int IN (
    SELECT id FROM participants
  );

-- 4.3: Migrate rounds.featureArtists
INSERT INTO round_feature_artists (round_id, participant_id, name, display_order, description, created_at)
SELECT 
    r.id as round_id,
    (artist_data->>'participantId')::int as participant_id,
    artist_data->>'name' as name,
    COALESCE((artist_data->>'order')::int, 1) as display_order,
    artist_data->>'description' as description,
    r.created_at
FROM rounds r,
     jsonb_array_elements(r."featureArtists") as artist_data
WHERE r."featureArtists" IS NOT NULL 
  AND jsonb_array_length(r."featureArtists") > 0
  AND (artist_data->>'participantId')::int IN (
    SELECT id FROM participants
  );

-- ============================================================================
-- STEP 5: VERIFY MIGRATION
-- ============================================================================

DO $$
DECLARE
    timetable_original_count INTEGER;
    timetable_junction_count INTEGER;
    crew_original_count INTEGER;
    crew_junction_count INTEGER;
    artists_original_count INTEGER;
    artists_junction_count INTEGER;
BEGIN
    -- Count original timetable participants
    SELECT COALESCE(SUM(jsonb_array_length(participants)), 0)
    INTO timetable_original_count
    FROM timetable_entries 
    WHERE participants IS NOT NULL 
      AND jsonb_array_length(participants) > 0;
    
    -- Count junction table timetable participants
    SELECT COUNT(*)
    INTO timetable_junction_count
    FROM timetable_participants;
    
    -- Count original crew
    SELECT COALESCE(SUM(jsonb_array_length(crew)), 0)
    INTO crew_original_count
    FROM rounds 
    WHERE crew IS NOT NULL 
      AND jsonb_array_length(crew) > 0;
    
    -- Count junction table crew
    SELECT COUNT(*)
    INTO crew_junction_count
    FROM round_crew;
    
    -- Count original feature artists
    SELECT COALESCE(SUM(jsonb_array_length("featureArtists")), 0)
    INTO artists_original_count
    FROM rounds 
    WHERE "featureArtists" IS NOT NULL 
      AND jsonb_array_length("featureArtists") > 0;
    
    -- Count junction table feature artists
    SELECT COUNT(*)
    INTO artists_junction_count
    FROM round_feature_artists;
    
    -- Verify all counts match
    IF timetable_original_count != timetable_junction_count THEN
        RAISE EXCEPTION 'Timetable migration failed: Original count (%) != Junction count (%)', 
            timetable_original_count, timetable_junction_count;
    END IF;
    
    IF crew_original_count != crew_junction_count THEN
        RAISE EXCEPTION 'Crew migration failed: Original count (%) != Junction count (%)', 
            crew_original_count, crew_junction_count;
    END IF;
    
    IF artists_original_count != artists_junction_count THEN
        RAISE EXCEPTION 'Feature artists migration failed: Original count (%) != Junction count (%)', 
            artists_original_count, artists_junction_count;
    END IF;
    
    RAISE NOTICE 'Migration successful:';
    RAISE NOTICE '  - Timetable participants: % migrated', timetable_junction_count;
    RAISE NOTICE '  - Round crew: % migrated', crew_junction_count;
    RAISE NOTICE '  - Feature artists: % migrated', artists_junction_count;
END $$;

-- ============================================================================
-- STEP 6: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE timetable_participants IS 'Junction table linking timetable entries to participants, replacing participants JSONB array';
COMMENT ON TABLE round_crew IS 'Junction table linking rounds to crew members, replacing crew JSONB array';
COMMENT ON TABLE round_feature_artists IS 'Junction table linking rounds to feature artists, replacing featureArtists JSONB array';

COMMENT ON COLUMN timetable_participants.role IS 'Role of the participant in the timetable entry';
COMMENT ON COLUMN round_crew.role IS 'Role of the crew member in the round';
COMMENT ON COLUMN round_feature_artists.display_order IS 'Display order of the feature artist';
COMMENT ON COLUMN round_feature_artists.description IS 'Description of the feature artist';


