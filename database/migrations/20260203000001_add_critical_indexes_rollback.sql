-- Rollback migration for critical indexes
-- Rollback: 20260203000001_add_critical_indexes_rollback.sql

-- ============================================================================
-- RESTORE DUPLICATE INDEXES
-- ============================================================================

-- Links table - restore duplicate indexes
CREATE INDEX IF NOT EXISTS idx_links_is_active ON links(is_active);
CREATE INDEX IF NOT EXISTS idx_links_sort ON links(sort_order);

-- Team members table - restore duplicate indexes
CREATE INDEX IF NOT EXISTS idx_team_members_participant_id ON team_members(participant_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);

-- ============================================================================
-- REMOVE COMPOSITE INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_info_pages_status_order;
DROP INDEX IF EXISTS idx_links_active_category_sort;

-- ============================================================================
-- REMOVE ROUNDS INDEX
-- ============================================================================

DROP INDEX IF EXISTS idx_rounds_date_time;

-- ============================================================================
-- REMOVE USERS FUNCTIONAL INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_users_username_lower;
DROP INDEX IF EXISTS idx_users_email_lower;

-- ============================================================================
-- REMOVE AUDIT_LOG INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_audit_log_table_created;
DROP INDEX IF EXISTS idx_audit_log_record_id;
DROP INDEX IF EXISTS idx_audit_log_created_at;
DROP INDEX IF EXISTS idx_audit_log_action;
DROP INDEX IF EXISTS idx_audit_log_table_name;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Rollback 20260203000001_add_critical_indexes completed';
  RAISE NOTICE 'Removed 11 indexes, restored 4 duplicate indexes';
END $$;
