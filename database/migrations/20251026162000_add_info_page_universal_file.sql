-- Migration: Add universal file upload and additional links to info_pages
-- This migration renames featured_image_url to file_url and adds new columns

-- Step 1: Add new columns
ALTER TABLE info_pages 
  ADD COLUMN file_type VARCHAR(10) CHECK (file_type IN ('image', 'pdf')),
  ADD COLUMN file_description TEXT,
  ADD COLUMN additional_links JSONB DEFAULT '[]'::jsonb;

-- Step 2: Rename featured_image_url to file_url for clarity
ALTER TABLE info_pages 
  RENAME COLUMN featured_image_url TO file_url;

-- Step 3: Set file_type for existing records
UPDATE info_pages 
SET file_type = 'image' 
WHERE file_url IS NOT NULL;

-- Step 4: Add index for additional_links
CREATE INDEX idx_info_pages_additional_links 
  ON info_pages USING gin (additional_links);

-- Step 5: Add comments for clarity
COMMENT ON COLUMN info_pages.file_url IS 'Universal file URL - can be image or PDF';
COMMENT ON COLUMN info_pages.file_type IS 'Type of file: image or pdf';
COMMENT ON COLUMN info_pages.file_description IS 'Custom description text for the uploaded file';
COMMENT ON COLUMN info_pages.additional_links IS 'Array of additional links with title and URL';

