-- Migration: Add round_moderation table
-- Date: 2025-01-27
-- Description: Create table for round moderation relationships

-- Create round_moderation table
CREATE TABLE round_moderation (
    id SERIAL PRIMARY KEY,
    round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 1,
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT round_moderation_round_id_participant_id_key UNIQUE (round_id, participant_id)
);

-- Add comment explaining the table
COMMENT ON TABLE round_moderation IS 'Junction table for round moderation relationships';
COMMENT ON COLUMN round_moderation.display_order IS 'Order in which moderators are displayed';
COMMENT ON COLUMN round_moderation.description IS 'Optional description for the moderator role';
