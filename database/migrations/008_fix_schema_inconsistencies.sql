-- Migration: Fix Schema Inconsistencies
-- Description: Fix column naming and add missing constraints
-- Created: 2025-01-27
-- Author: SLAM25 Development Team

-- Fix participants table column naming
DO $$ 
BEGIN
    -- Rename 'rolle' to 'role' if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participants' AND column_name = 'rolle') THEN
        ALTER TABLE participants RENAME COLUMN rolle TO role;
    END IF;
END $$;

-- Add missing columns to participants table
DO $$ 
BEGIN
    -- Add role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participants' AND column_name = 'role') THEN
        ALTER TABLE participants ADD COLUMN role VARCHAR(100) DEFAULT 'Teilnehmer';
    END IF;
    
    -- Add pronouns column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participants' AND column_name = 'pronouns') THEN
        ALTER TABLE participants ADD COLUMN pronouns VARCHAR(50);
    END IF;
    
    -- Add instagram column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participants' AND column_name = 'instagram') THEN
        ALTER TABLE participants ADD COLUMN instagram VARCHAR(255);
    END IF;
END $$;

-- Fix rounds table column naming
DO $$ 
BEGIN
    -- Rename startdatetime to startDateTime
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'startdatetime') THEN
        ALTER TABLE rounds RENAME COLUMN startdatetime TO startDateTime;
    END IF;
    
    -- Rename enddatetime to endDateTime
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'enddatetime') THEN
        ALTER TABLE rounds RENAME COLUMN enddatetime TO endDateTime;
    END IF;
    
    -- Rename afterplayreport to afterPlayReport
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'afterplayreport') THEN
        ALTER TABLE rounds RENAME COLUMN afterplayreport TO afterPlayReport;
    END IF;
    
    -- Rename competitiontype to competitionType
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'competitiontype') THEN
        ALTER TABLE rounds RENAME COLUMN competitiontype TO competitionType;
    END IF;
    
    -- Rename tournamentparticipants to tournamentParticipants
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'tournamentparticipants') THEN
        ALTER TABLE rounds RENAME COLUMN tournamentparticipants TO tournamentParticipants;
    END IF;
    
    -- Rename featureartists to featureArtists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'featureartists') THEN
        ALTER TABLE rounds RENAME COLUMN featureartists TO featureArtists;
    END IF;
    
    -- Rename totaljurymembers to totalJuryMembers
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'totaljurymembers') THEN
        ALTER TABLE rounds RENAME COLUMN totaljurymembers TO totalJuryMembers;
    END IF;
END $$;

-- Add missing columns to rounds table
DO $$ 
BEGIN
    -- Add address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'address') THEN
        ALTER TABLE rounds ADD COLUMN address TEXT;
    END IF;
    
    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'description') THEN
        ALTER TABLE rounds ADD COLUMN description TEXT;
    END IF;
    
    -- Add afterPlayReport column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'afterPlayReport') THEN
        ALTER TABLE rounds ADD COLUMN afterPlayReport TEXT;
    END IF;
    
    -- Add competitionType column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'competitionType') THEN
        ALTER TABLE rounds ADD COLUMN competitionType VARCHAR(100) DEFAULT 'Einzelwettbewerb';
    END IF;
    
    -- Add crew column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'crew') THEN
        ALTER TABLE rounds ADD COLUMN crew JSONB DEFAULT '[]';
    END IF;
    
    -- Add tournamentParticipants column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'tournamentParticipants') THEN
        ALTER TABLE rounds ADD COLUMN tournamentParticipants INTEGER[] DEFAULT '{}';
    END IF;
    
    -- Add groups column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'groups') THEN
        ALTER TABLE rounds ADD COLUMN groups JSONB DEFAULT '[]';
    END IF;
    
    -- Add featureArtists column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'featureArtists') THEN
        ALTER TABLE rounds ADD COLUMN featureArtists JSONB DEFAULT '[]';
    END IF;
    
    -- Add totalJuryMembers column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'totalJuryMembers') THEN
        ALTER TABLE rounds ADD COLUMN totalJuryMembers INTEGER DEFAULT 5;
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'status') THEN
        ALTER TABLE rounds ADD COLUMN status VARCHAR(50) DEFAULT 'SCHEDULED';
    END IF;
END $$;

-- Fix news table column naming
DO $$ 
BEGIN
    -- Rename content_type to category if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'content_type') THEN
        ALTER TABLE news RENAME COLUMN content_type TO category;
    END IF;
    
    -- Rename is_published to status if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'is_published') THEN
        ALTER TABLE news RENAME COLUMN is_published TO status;
    END IF;
    
    -- Rename published_at to publishedAt if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'published_at') THEN
        ALTER TABLE news RENAME COLUMN published_at TO publishedAt;
    END IF;
END $$;

-- Add missing columns to news table
DO $$ 
BEGIN
    -- Add excerpt column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'excerpt') THEN
        ALTER TABLE news ADD COLUMN excerpt TEXT;
    END IF;
    
    -- Add authorId column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'authorId') THEN
        ALTER TABLE news ADD COLUMN authorId INTEGER REFERENCES users(id);
    END IF;
    
    -- Add category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'category') THEN
        ALTER TABLE news ADD COLUMN category VARCHAR(100) DEFAULT 'announcement';
    END IF;
    
    -- Add priority column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'priority') THEN
        ALTER TABLE news ADD COLUMN priority VARCHAR(50) DEFAULT 'NORMAL';
    END IF;
    
    -- Add featuredImageUrl column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'featuredImageUrl') THEN
        ALTER TABLE news ADD COLUMN featuredImageUrl TEXT;
    END IF;
    
    -- Add tags column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'tags') THEN
        ALTER TABLE news ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'status') THEN
        ALTER TABLE news ADD COLUMN status VARCHAR(50) DEFAULT 'DRAFT';
    END IF;
    
    -- Add publishedAt column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'publishedAt') THEN
        ALTER TABLE news ADD COLUMN publishedAt TIMESTAMP;
    END IF;
END $$;

-- Fix timetable_entries table column naming
DO $$ 
BEGIN
    -- Rename detaileddescription to detailedDescription
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_entries' AND column_name = 'detaileddescription') THEN
        ALTER TABLE timetable_entries RENAME COLUMN detaileddescription TO detailedDescription;
    END IF;
    
    -- Rename additionallinks to additionalLinks
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_entries' AND column_name = 'additionallinks') THEN
        ALTER TABLE timetable_entries RENAME COLUMN additionallinks TO additionalLinks;
    END IF;
END $$;

-- Add missing columns to timetable_entries table
DO $$ 
BEGIN
    -- Add detailedDescription column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_entries' AND column_name = 'detailedDescription') THEN
        ALTER TABLE timetable_entries ADD COLUMN detailedDescription TEXT;
    END IF;
    
    -- Add additionalLinks column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_entries' AND column_name = 'additionalLinks') THEN
        ALTER TABLE timetable_entries ADD COLUMN additionalLinks JSONB DEFAULT '[]';
    END IF;
END $$;

-- Update indexes to use new column names
DROP INDEX IF EXISTS idx_participants_rolle;
CREATE INDEX IF NOT EXISTS idx_participants_role ON participants(role);

DROP INDEX IF EXISTS idx_rounds_startdatetime;
CREATE INDEX IF NOT EXISTS idx_rounds_startDateTime ON rounds(startDateTime);

DROP INDEX IF EXISTS idx_rounds_competitiontype;
CREATE INDEX IF NOT EXISTS idx_rounds_competitionType ON rounds(competitionType);

DROP INDEX IF EXISTS idx_news_content_type;
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);

DROP INDEX IF EXISTS idx_news_is_published;
CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);

DROP INDEX IF EXISTS idx_news_published_at;
CREATE INDEX IF NOT EXISTS idx_news_publishedAt ON news(publishedAt);

-- Add foreign key constraints
DO $$ 
BEGIN
    -- Add foreign key constraint for news.authorId
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_news_author' 
        AND table_name = 'news'
    ) THEN
        ALTER TABLE news ADD CONSTRAINT fk_news_author 
        FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add check constraints for data integrity
DO $$ 
BEGIN
    -- Add check constraint for news status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'chk_news_status'
    ) THEN
        ALTER TABLE news ADD CONSTRAINT chk_news_status 
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'));
    END IF;
    
    -- Add check constraint for news priority
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'chk_news_priority'
    ) THEN
        ALTER TABLE news ADD CONSTRAINT chk_news_priority 
        CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'));
    END IF;
    
    -- Add check constraint for rounds status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'chk_rounds_status'
    ) THEN
        ALTER TABLE rounds ADD CONSTRAINT chk_rounds_status 
        CHECK (status IN ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'));
    END IF;
END $$;

-- Update existing data to use new column names
UPDATE participants SET role = rolle WHERE role IS NULL AND rolle IS NOT NULL;

-- Drop old columns after migration
DO $$ 
BEGIN
    -- Drop old rolle column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participants' AND column_name = 'rolle') THEN
        ALTER TABLE participants DROP COLUMN rolle;
    END IF;
END $$;

-- Insert migration record
INSERT INTO migrations (migration_name) VALUES ('008_fix_schema_inconsistencies.sql');





