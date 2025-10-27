-- Create schema_migrations table to track applied migrations
-- This table is used by the migration runner to determine which migrations have been applied

CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER DEFAULT 0
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_schema_migrations_name 
ON schema_migrations(migration_name);

-- Add comment for documentation
COMMENT ON TABLE schema_migrations IS 'Tracks which database migrations have been applied';
COMMENT ON COLUMN schema_migrations.migration_name IS 'Name of the migration file (e.g., 20250126143052_add_user_preferences.sql)';
COMMENT ON COLUMN schema_migrations.applied_at IS 'When the migration was applied';
COMMENT ON COLUMN schema_migrations.execution_time_ms IS 'How long the migration took to execute in milliseconds';


