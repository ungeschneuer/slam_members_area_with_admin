-- Migration: Add new participant roles (Feature, DJ)
-- Date: 2024-12-19
-- Description: Adds "Feature" and "DJ" roles to the participants table constraint

-- Drop the existing constraint
ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_role_check;

-- Add the new constraint with additional roles
ALTER TABLE participants ADD CONSTRAINT participants_role_check 
CHECK ((role)::text = ANY (ARRAY[
    'Wettbewerb-Teilnehmer*in'::character varying,
    'Supporter*in'::character varying,
    'SLAM25-Team'::character varying,
    'SLAM-MC'::character varying,
    'Moderator*in'::character varying,
    'Techniker*in'::character varying,
    'Fotograf*in'::character varying,
    'Videograf*in'::character varying,
    'Organisator*in'::character varying,
    'Feature'::character varying,
    'DJ'::character varying
]));

-- Update the comment to reflect the new roles
COMMENT ON COLUMN participants.role IS 'Role of the participant: Teilnehmer*in, Supporter*in, Crew, SLAM-MC, Moderator, Technik, Fotograf*in, Feature, DJ';
