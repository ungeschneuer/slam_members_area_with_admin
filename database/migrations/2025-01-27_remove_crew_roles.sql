-- Migration: Remove crew roles from round_crew table
-- Date: 2025-01-27
-- Description: Remove the role column from round_crew table since roles are no longer displayed

-- Drop the role column from round_crew table
ALTER TABLE round_crew DROP COLUMN role;

-- Add comment explaining the change
COMMENT ON TABLE round_crew IS 'Junction table for round crew relationships - roles removed as they are no longer displayed';
