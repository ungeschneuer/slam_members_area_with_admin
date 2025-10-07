-- Migration: Add round_id to timetable_entries table
-- This migration adds a foreign key relationship between timetable_entries and rounds

-- Add round_id foreign key to timetable_entries
ALTER TABLE timetable_entries 
ADD COLUMN round_id INTEGER REFERENCES rounds(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_timetable_round_id ON timetable_entries(round_id);

-- Update existing entries if any rounds match by title/date/time
UPDATE timetable_entries te
SET round_id = r.id, internal_link = r.slug
FROM rounds r
WHERE te.title = r.title 
  AND te.date = r.date 
  AND te.time = r."startTime"
  AND te.round_id IS NULL;
