-- Final news table cleanup migration

-- Fix news table column names to be consistent
DO $$ 
BEGIN
    -- Rename columns to use consistent camelCase naming
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'content_type') THEN
        ALTER TABLE news RENAME COLUMN content_type TO category;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'is_published') THEN
        ALTER TABLE news DROP COLUMN is_published;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'published_at') THEN
        ALTER TABLE news DROP COLUMN published_at;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'authorid') THEN
        ALTER TABLE news RENAME COLUMN authorid TO "authorId";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'featuredimageurl') THEN
        ALTER TABLE news RENAME COLUMN featuredimageurl TO "featuredImageUrl";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'publishedat') THEN
        ALTER TABLE news RENAME COLUMN publishedat TO "publishedAt";
    END IF;
END $$;

-- Add missing columns to news table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'excerpt') THEN
        ALTER TABLE news ADD COLUMN excerpt TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'authorId') THEN
        ALTER TABLE news ADD COLUMN "authorId" VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'category') THEN
        ALTER TABLE news ADD COLUMN category VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'priority') THEN
        ALTER TABLE news ADD COLUMN priority VARCHAR(50) DEFAULT 'NORMAL';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'featuredImageUrl') THEN
        ALTER TABLE news ADD COLUMN "featuredImageUrl" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'tags') THEN
        ALTER TABLE news ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'status') THEN
        ALTER TABLE news ADD COLUMN status VARCHAR(50) DEFAULT 'DRAFT';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'publishedAt') THEN
        ALTER TABLE news ADD COLUMN "publishedAt" TIMESTAMP;
    END IF;
END $$;

-- Update indexes for news table
DROP INDEX IF EXISTS idx_news_content_type;
DROP INDEX IF EXISTS idx_news_is_published;
DROP INDEX IF EXISTS idx_news_published_at;

CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
CREATE INDEX IF NOT EXISTS idx_news_publishedat ON news("publishedAt");
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);

-- Update indexes for city_tips table to use consistent naming
DROP INDEX IF EXISTS idx_city_locations_category;
DROP INDEX IF EXISTS idx_city_locations_name;
DROP INDEX IF EXISTS idx_city_locations_rating;

CREATE INDEX IF NOT EXISTS idx_city_tips_category ON city_tips(category);
CREATE INDEX IF NOT EXISTS idx_city_tips_name ON city_tips(name);
CREATE INDEX IF NOT EXISTS idx_city_tips_rating ON city_tips(rating);

-- Verify all tables have the correct structure
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('participants', 'rounds', 'news', 'timetable_entries', 'city_tips')
ORDER BY table_name, ordinal_position;









