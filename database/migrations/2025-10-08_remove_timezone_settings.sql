-- Migration: Remove timezone settings from database
-- Date: 2025-10-08
-- Description: Remove app_timezone setting as timezone is now configured via environment variable

-- Remove timezone setting from settings table
DELETE FROM settings WHERE key = 'app_timezone';

-- Log the migration
INSERT INTO settings (key, value, description, created_at, updated_at) 
VALUES ('migration_2025_10_08_timezone_to_env', 'completed', 'Timezone configuration migrated to environment variable APP_TIMEZONE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE SET 
  value = 'completed',
  updated_at = CURRENT_TIMESTAMP;
