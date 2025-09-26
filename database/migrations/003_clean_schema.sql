-- Migration: Clean Schema - Rename columns for consistency
-- This migration renames existing columns to use consistent naming

-- Rename columns in participants table
ALTER TABLE participants RENAME COLUMN rolle TO role;

-- Rename columns in rounds table (if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'startdatetime') THEN
        ALTER TABLE rounds RENAME COLUMN startdatetime TO startDateTime;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'enddatetime') THEN
        ALTER TABLE rounds RENAME COLUMN enddatetime TO endDateTime;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'afterplayreport') THEN
        ALTER TABLE rounds RENAME COLUMN afterplayreport TO afterPlayReport;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'competitiontype') THEN
        ALTER TABLE rounds RENAME COLUMN competitiontype TO competitionType;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'tournamentparticipants') THEN
        ALTER TABLE rounds RENAME COLUMN tournamentparticipants TO tournamentParticipants;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'featureartists') THEN
        ALTER TABLE rounds RENAME COLUMN featureartists TO featureArtists;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'totaljurymembers') THEN
        ALTER TABLE rounds RENAME COLUMN totaljurymembers TO totalJuryMembers;
    END IF;
END $$;

-- Rename columns in timetable_entries table (if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_entries' AND column_name = 'detaileddescription') THEN
        ALTER TABLE timetable_entries RENAME COLUMN detaileddescription TO detailedDescription;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_entries' AND column_name = 'additionallinks') THEN
        ALTER TABLE timetable_entries RENAME COLUMN additionallinks TO additionalLinks;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_entries' AND column_name = 'start_time') THEN
        ALTER TABLE timetable_entries RENAME COLUMN start_time TO startTime;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_entries' AND column_name = 'end_time') THEN
        ALTER TABLE timetable_entries RENAME COLUMN end_time TO endTime;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_entries' AND column_name = 'event_type') THEN
        ALTER TABLE timetable_entries RENAME COLUMN event_type TO type;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_entries' AND column_name = 'startDate') THEN
        ALTER TABLE timetable_entries RENAME COLUMN "startDate" TO date;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_entries' AND column_name = 'desc') THEN
        ALTER TABLE timetable_entries RENAME COLUMN desc TO description;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_entries' AND column_name = 'venue') THEN
        ALTER TABLE timetable_entries RENAME COLUMN venue TO location;
    END IF;
END $$;

-- Rename columns in news table (if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'desc') THEN
        ALTER TABLE news RENAME COLUMN desc TO content;
    END IF;
END $$;

-- Rename city_locations table to city_tips if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'city_locations') THEN
        ALTER TABLE city_locations RENAME TO city_tips;
    END IF;
END $$;

-- Add missing columns to news table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'excerpt') THEN
        ALTER TABLE news ADD COLUMN excerpt TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'authorId') THEN
        ALTER TABLE news ADD COLUMN authorId VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'category') THEN
        ALTER TABLE news ADD COLUMN category VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'priority') THEN
        ALTER TABLE news ADD COLUMN priority VARCHAR(50) DEFAULT 'NORMAL';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'featuredImageUrl') THEN
        ALTER TABLE news ADD COLUMN featuredImageUrl TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'tags') THEN
        ALTER TABLE news ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'status') THEN
        ALTER TABLE news ADD COLUMN status VARCHAR(50) DEFAULT 'DRAFT';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'publishedAt') THEN
        ALTER TABLE news ADD COLUMN publishedAt TIMESTAMP;
    END IF;
END $$;

-- Add missing columns to rounds table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'address') THEN
        ALTER TABLE rounds ADD COLUMN address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'description') THEN
        ALTER TABLE rounds ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'afterPlayReport') THEN
        ALTER TABLE rounds ADD COLUMN afterPlayReport TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'competitionType') THEN
        ALTER TABLE rounds ADD COLUMN competitionType VARCHAR(100) DEFAULT 'Einzelwettbewerb';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'crew') THEN
        ALTER TABLE rounds ADD COLUMN crew JSONB DEFAULT '[]';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'tournamentParticipants') THEN
        ALTER TABLE rounds ADD COLUMN tournamentParticipants INTEGER[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'groups') THEN
        ALTER TABLE rounds ADD COLUMN groups JSONB DEFAULT '[]';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'featureArtists') THEN
        ALTER TABLE rounds ADD COLUMN featureArtists JSONB DEFAULT '[]';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'totalJuryMembers') THEN
        ALTER TABLE rounds ADD COLUMN totalJuryMembers INTEGER DEFAULT 5;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'status') THEN
        ALTER TABLE rounds ADD COLUMN status VARCHAR(50) DEFAULT 'SCHEDULED';
    END IF;
END $$;

-- Add missing columns to participants table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participants' AND column_name = 'role') THEN
        ALTER TABLE participants ADD COLUMN role VARCHAR(100) DEFAULT 'Teilnehmer';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participants' AND column_name = 'pronouns') THEN
        ALTER TABLE participants ADD COLUMN pronouns VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participants' AND column_name = 'instagram') THEN
        ALTER TABLE participants ADD COLUMN instagram VARCHAR(100);
    END IF;
END $$;

-- Update existing data to use new column names
UPDATE participants SET role = rolle WHERE role IS NULL AND rolle IS NOT NULL;

-- Drop old columns after migration
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participants' AND column_name = 'rolle') THEN
        ALTER TABLE participants DROP COLUMN rolle;
    END IF;
END $$;
