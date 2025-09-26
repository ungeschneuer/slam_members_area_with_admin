-- Remove duplicate columns in news table

-- Remove old columns that have been replaced
DO $$ 
BEGIN
    -- Remove old content_type column (replaced by category)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'content_type') THEN
        ALTER TABLE news DROP COLUMN content_type;
    END IF;
    
    -- Remove old is_published column (replaced by status)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'is_published') THEN
        ALTER TABLE news DROP COLUMN is_published;
    END IF;
    
    -- Remove old published_at column (replaced by publishedAt)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'published_at') THEN
        ALTER TABLE news DROP COLUMN published_at;
    END IF;
    
    -- Remove old authorid column (replaced by authorId)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'authorid') THEN
        ALTER TABLE news DROP COLUMN authorid;
    END IF;
    
    -- Remove old featuredimageurl column (replaced by featuredImageUrl)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'featuredimageurl') THEN
        ALTER TABLE news DROP COLUMN featuredimageurl;
    END IF;
    
    -- Remove old publishedat column (replaced by publishedAt)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'publishedat') THEN
        ALTER TABLE news DROP COLUMN publishedat;
    END IF;
END $$;

-- Verify final structure
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('participants', 'rounds', 'news', 'timetable_entries', 'city_tips')
ORDER BY table_name, ordinal_position;









