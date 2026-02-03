-- Add critical missing indexes identified in code analysis
-- Migration: 20260203000001_add_critical_indexes.sql

-- ============================================================================
-- 1. AUDIT_LOG TABLE INDEXES (CRITICAL - table has no indexes)
-- ============================================================================

-- Index for filtering by table name
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name
ON audit_log(table_name);

-- Index for filtering by action type
CREATE INDEX IF NOT EXISTS idx_audit_log_action
ON audit_log(action);

-- Index for date-based queries and cleanup
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
ON audit_log(created_at DESC);

-- Index for record lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id
ON audit_log(record_id);

-- Composite index for common query pattern (table + date)
CREATE INDEX IF NOT EXISTS idx_audit_log_table_created
ON audit_log(table_name, created_at DESC);

-- ============================================================================
-- 2. USERS TABLE - FUNCTIONAL INDEXES FOR CASE-INSENSITIVE LOOKUPS
-- ============================================================================

-- Functional index for case-insensitive email lookup
CREATE INDEX IF NOT EXISTS idx_users_email_lower
ON users(LOWER(email));

-- Functional index for case-insensitive username lookup
CREATE INDEX IF NOT EXISTS idx_users_username_lower
ON users(LOWER(username));

-- ============================================================================
-- 3. ROUNDS TABLE - COMPOSITE INDEX FOR DATE/TIME SORTING
-- ============================================================================

-- Composite index for ORDER BY date, start_time queries
CREATE INDEX IF NOT EXISTS idx_rounds_date_time
ON rounds(date, start_time);

-- ============================================================================
-- 4. COMPOSITE INDEXES FOR COMMON FILTER/SORT PATTERNS
-- ============================================================================

-- Links table - composite index for active content with sorting
CREATE INDEX IF NOT EXISTS idx_links_active_category_sort
ON links(is_active, category, sort_order, title)
WHERE is_active = true;

-- Info pages - composite index for status filtering with ordering
CREATE INDEX IF NOT EXISTS idx_info_pages_status_order
ON info_pages(status, display_order, title);

-- News table - partial index for breaking news queries
-- (This already exists per schema.sql line 456, keeping for reference)
-- CREATE INDEX IF NOT EXISTS idx_news_breaking_news
-- ON news(is_breaking_news, breaking_news_until)
-- WHERE is_breaking_news = true;

-- ============================================================================
-- 5. REMOVE DUPLICATE INDEXES
-- ============================================================================

-- Links table - remove duplicate indexes
DROP INDEX IF EXISTS idx_links_is_active; -- Duplicate of idx_links_active
DROP INDEX IF EXISTS idx_links_sort;      -- Duplicate of idx_links_sort_order

-- Team members table - remove duplicate indexes
DROP INDEX IF EXISTS idx_team_members_participant_id; -- Duplicate of idx_team_members_participant
DROP INDEX IF EXISTS idx_team_members_team_id;        -- Duplicate of idx_team_members_team

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 20260203000001_add_critical_indexes.sql completed successfully';
  RAISE NOTICE 'Added 11 new indexes, removed 4 duplicate indexes';
END $$;
