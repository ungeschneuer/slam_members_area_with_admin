-- Migration: Add slug columns to all content types
-- This migration adds slug columns to news, participants, and timetable_entries tables
-- and generates slugs for all existing content

-- Add slug columns to tables
ALTER TABLE news ADD COLUMN slug VARCHAR(255);
ALTER TABLE participants ADD COLUMN slug VARCHAR(255);
ALTER TABLE timetable_entries ADD COLUMN slug VARCHAR(255);

-- Create indexes for performance
CREATE INDEX idx_news_slug ON news(slug);
CREATE INDEX idx_participants_slug ON participants(slug);
CREATE INDEX idx_timetable_slug ON timetable_entries(slug);

-- Function to generate slug from text (simplified version for migration)
CREATE OR REPLACE FUNCTION generate_slug(text)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    -- Convert to lowercase
    result := LOWER($1);
    
    -- Replace German umlauts
    result := REPLACE(result, 'ä', 'ae');
    result := REPLACE(result, 'ö', 'oe');
    result := REPLACE(result, 'ü', 'ue');
    result := REPLACE(result, 'ß', 'ss');
    result := REPLACE(result, 'Ä', 'ae');
    result := REPLACE(result, 'Ö', 'oe');
    result := REPLACE(result, 'Ü', 'ue');
    
    -- Replace special characters with spaces
    result := REGEXP_REPLACE(result, '[^a-z0-9\s-]', ' ', 'g');
    
    -- Replace multiple spaces with single space
    result := REGEXP_REPLACE(result, '\s+', ' ', 'g');
    
    -- Replace spaces with hyphens
    result := REPLACE(result, ' ', '-');
    
    -- Remove multiple consecutive hyphens
    result := REGEXP_REPLACE(result, '-+', '-', 'g');
    
    -- Remove leading/trailing hyphens
    result := TRIM(BOTH '-' FROM result);
    
    -- Limit length to 50 characters
    IF LENGTH(result) > 50 THEN
        result := LEFT(result, 50);
        -- Remove partial word at the end
        result := REGEXP_REPLACE(result, '-[^-]*$', '');
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION generate_unique_slug(base_slug TEXT, table_name TEXT, id_column TEXT)
RETURNS TEXT AS $$
DECLARE
    unique_slug TEXT;
    counter INTEGER := 1;
    exists_count INTEGER;
BEGIN
    unique_slug := base_slug;
    
    LOOP
        -- Check if slug exists in the table
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE slug = $1', table_name) 
        INTO exists_count USING unique_slug;
        
        -- If slug doesn't exist, we're done
        IF exists_count = 0 THEN
            EXIT;
        END IF;
        
        -- If slug exists, append counter
        unique_slug := base_slug || '-' || counter;
        counter := counter + 1;
        
        -- Safety check to prevent infinite loop
        IF counter > 1000 THEN
            unique_slug := base_slug || '-' || EXTRACT(EPOCH FROM NOW())::INTEGER;
            EXIT;
        END IF;
    END LOOP;
    
    RETURN unique_slug;
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing news articles
UPDATE news 
SET slug = generate_unique_slug(
    generate_slug(title), 
    'news', 
    'id'
)
WHERE slug IS NULL;

-- Generate slugs for existing participants
UPDATE participants 
SET slug = generate_unique_slug(
    generate_slug(name), 
    'participants', 
    'id'
)
WHERE slug IS NULL;

-- Generate slugs for existing timetable entries
UPDATE timetable_entries 
SET slug = generate_unique_slug(
    generate_slug(title), 
    'timetable_entries', 
    'id'
)
WHERE slug IS NULL;

-- Make slug columns NOT NULL and UNIQUE
ALTER TABLE news ALTER COLUMN slug SET NOT NULL;
ALTER TABLE participants ALTER COLUMN slug SET NOT NULL;
ALTER TABLE timetable_entries ALTER COLUMN slug SET NOT NULL;

-- Add unique constraints
ALTER TABLE news ADD CONSTRAINT news_slug_unique UNIQUE (slug);
ALTER TABLE participants ADD CONSTRAINT participants_slug_unique UNIQUE (slug);
ALTER TABLE timetable_entries ADD CONSTRAINT timetable_entries_slug_unique UNIQUE (slug);

-- Clean up helper functions
DROP FUNCTION generate_slug(TEXT);
DROP FUNCTION generate_unique_slug(TEXT, TEXT, TEXT);
