-- Migration: Remove session tracking for simplified JWT authentication
-- Date: 2025-01-15
-- Description: Remove user_sessions table and related indexes since we're moving to stateless JWT authentication

-- Drop indexes first (they depend on the table)
DROP INDEX IF EXISTS idx_user_sessions_user_id;
DROP INDEX IF EXISTS idx_user_sessions_token;
DROP INDEX IF EXISTS idx_user_sessions_expires_at;

-- Drop the user_sessions table
DROP TABLE IF EXISTS user_sessions;

-- Clean up any triggers or functions related to sessions
-- (None exist in current schema, but included for completeness)

-- Note: This migration will invalidate all existing user sessions
-- Users will need to log in again after this migration is applied
-- This is intentional for the clean break approach to authentication

-- Verify the table is gone
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
        RAISE EXCEPTION 'user_sessions table still exists after migration';
    END IF;
    RAISE NOTICE 'user_sessions table successfully removed';
END $$;
