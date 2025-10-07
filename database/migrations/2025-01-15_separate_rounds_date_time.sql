-- Migration: Separate rounds date and time fields
-- Converts startDateTime and endDateTime to separate date, startTime, and endTime fields

-- Add new columns
ALTER TABLE rounds 
ADD COLUMN date DATE,
ADD COLUMN "startTime" TIME,
ADD COLUMN "endTime" TIME;

-- Migrate existing data
UPDATE rounds 
SET 
    date = "startDateTime"::DATE,
    "startTime" = "startDateTime"::TIME,
    "endTime" = "endDateTime"::TIME
WHERE "startDateTime" IS NOT NULL AND "endDateTime" IS NOT NULL;

-- Make new columns NOT NULL after data migration
ALTER TABLE rounds 
ALTER COLUMN date SET NOT NULL,
ALTER COLUMN "startTime" SET NOT NULL,
ALTER COLUMN "endTime" SET NOT NULL;

-- Drop old columns
ALTER TABLE rounds 
DROP COLUMN "startDateTime",
DROP COLUMN "endDateTime";

-- Update constraint
ALTER TABLE rounds 
DROP CONSTRAINT IF EXISTS rounds_time_check;

ALTER TABLE rounds 
ADD CONSTRAINT rounds_time_check CHECK ("endTime" > "startTime");
