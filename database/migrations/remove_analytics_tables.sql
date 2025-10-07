-- Remove analytics tables that are unnecessary for read-only portal
-- These tables were used for tracking page views and user activity
-- but are not needed for a medium-scale poetry slam application

-- Drop analytics tables
DROP TABLE IF EXISTS page_views CASCADE;
DROP TABLE IF EXISTS user_activity_log CASCADE;

-- Remove any indexes that might have been created for these tables
-- (PostgreSQL will automatically drop indexes when tables are dropped)

-- Note: This migration removes analytics tracking completely
-- The application will continue to work without these tables
