-- Remove internal_link column from timetable_entries
ALTER TABLE timetable_entries DROP COLUMN IF EXISTS internal_link;

