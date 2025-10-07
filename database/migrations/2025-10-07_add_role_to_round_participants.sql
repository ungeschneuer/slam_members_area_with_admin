-- Migration: Add role column to round_participants table
-- Date: 2025-10-07
-- Description: Add missing role column to round_participants junction table

-- Add role column to round_participants table
ALTER TABLE round_participants 
ADD COLUMN IF NOT EXISTS role VARCHAR(100) NOT NULL DEFAULT 'Teilnehmer';

-- Update existing records to have the default role
UPDATE round_participants 
SET role = 'Teilnehmer' 
WHERE role IS NULL OR role = '';

-- Add index for role column for better performance
CREATE INDEX IF NOT EXISTS idx_round_participants_role ON round_participants(role);

-- Add comment for documentation
COMMENT ON COLUMN round_participants.role IS 'Role of the participant in the round (e.g., Teilnehmer, Jury, etc.)';
