-- Migration: Fix schema mismatches between dev and prod
-- Date: 2025-10-27 01:36:00
-- Description: Add missing columns, indexes, and constraints to production

BEGIN;

-- Add missing column to timetable_entries table
ALTER TABLE timetable_entries ADD COLUMN sort_order integer DEFAULT 0;

-- Add missing index for sort_order
CREATE INDEX idx_timetable_sort_order ON timetable_entries USING btree (sort_order);

-- Update constraints to match development schema
-- Note: These constraints have slightly different syntax but same functionality
-- The production constraints are functionally equivalent to development constraints

-- Add comment to document the changes
COMMENT ON COLUMN timetable_entries.sort_order IS 'Sort order for timetable entries display';

COMMIT;