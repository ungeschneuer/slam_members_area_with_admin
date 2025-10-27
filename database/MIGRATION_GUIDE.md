# SLAM25 Database Migration System

## Overview

The SLAM25 project uses a robust database migration system that handles schema changes, data migrations, and rollbacks safely. The system includes two main scripts:

- `scripts/run-migrations.sh` - Main migration runner
- `scripts/migration-helper.sh` - Migration management utilities

## Key Improvements Made

### 1. Fixed Database Connection Issues
- **Problem**: `PGPASSWORD` was set after connection test
- **Solution**: Set `PGPASSWORD` before any database operations
- **Impact**: Eliminates connection failures during migration

### 2. Improved Migration Ordering
- **Problem**: Non-timestamped files processed after timestamped ones
- **Solution**: Sort migrations chronologically (non-timestamped first, then by timestamp)
- **Impact**: Ensures migrations run in correct order

### 3. Better Error Handling
- **Problem**: Migrations failed silently or with unclear errors
- **Solution**: Added syntax validation and detailed error reporting
- **Impact**: Easier debugging and troubleshooting

### 4. Enhanced Migration Marking
- **Problem**: No way to mark migrations as applied without executing
- **Solution**: Added `--force-register` and `--register-only` options
- **Impact**: Handles already-applied migrations gracefully

## Migration File Naming Convention

### Timestamped Migrations (Recommended)
```
YYYYMMDDHHMMSS_description.sql
```

**Examples:**
- `20251027120000_add_user_table.sql`
- `20251027120100_add_user_indexes.sql`
- `20251027120200_update_user_schema.sql`

### Non-Timestamped Migrations (Legacy)
```
description.sql
```

**Examples:**
- `add_pdf_field_to_info_pages.sql`
- `convert_opening_hours_remove_contact.sql`

**Note**: Non-timestamped migrations are processed first, then timestamped ones in chronological order.

## Migration Script Usage

### Basic Commands

```bash
# Run all pending migrations
./scripts/run-migrations.sh

# Dry run (see what would be executed)
./scripts/run-migrations.sh --dry-run

# Register migrations as applied without executing
./scripts/run-migrations.sh --register-only

# Force register all pending migrations as applied
./scripts/run-migrations.sh --force-register

# Skip backup creation (faster for testing)
./scripts/run-migrations.sh --skip-backup
```

### Migration Helper Commands

```bash
# Create a new migration
./scripts/migration-helper.sh create add_user_table

# List all migrations
./scripts/migration-helper.sh list

# Show migration status
./scripts/migration-helper.sh status

# Mark migration as applied
./scripts/migration-helper.sh mark-applied 20251027120000_add_user_table.sql

# Mark migration as pending
./scripts/migration-helper.sh mark-pending 20251027120000_add_user_table.sql

# Rename migration file
./scripts/migration-helper.sh rename old_name.sql new_name.sql

# Validate all migration files
./scripts/migration-helper.sh validate

# Clean up old backups
./scripts/migration-helper.sh cleanup
```

## Migration File Structure

### Template
```sql
-- Migration: add_user_table
-- Date: 2025-10-27 12:00:00
-- Description: Add user table with basic fields

-- Add your migration SQL here
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_users_email ON users(email);

-- Add comments
COMMENT ON TABLE users IS 'User accounts table';
COMMENT ON COLUMN users.email IS 'User email address (unique)';
```

### Best Practices

1. **Always use transactions** (handled automatically by the script)
2. **Include rollback information** in comments
3. **Add indexes after table creation**
4. **Use descriptive names** for constraints and indexes
5. **Include comments** explaining the purpose
6. **Test migrations** in development first

## Database Permissions

### Required Permissions
The migration user (`szenesql`) needs:
- **Table ownership** or **ALTER** privileges on all tables
- **CREATE** privileges for new tables/indexes
- **INSERT/UPDATE/DELETE** privileges for data migrations
- **SELECT** privileges for validation queries

### Setting Up Permissions
```sql
-- Grant all privileges on existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO szenesql;

-- Grant privileges on sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO szenesql;

-- Grant schema privileges
GRANT ALL PRIVILEGES ON SCHEMA public TO szenesql;

-- Transfer ownership (if needed)
ALTER TABLE table_name OWNER TO szenesql;
```

## Error Handling

### Common Issues and Solutions

#### 1. Permission Denied
```
ERROR: permission denied for table table_name
```
**Solution**: Ensure migration user has proper permissions or table ownership

#### 2. Column Already Exists
```
ERROR: column "column_name" of relation "table_name" already exists
```
**Solution**: Use `--force-register` to mark migration as applied

#### 3. Migration Order Issues
```
ERROR: relation "dependent_table" does not exist
```
**Solution**: Check migration order and dependencies

#### 4. Syntax Errors
```
ERROR: syntax error at or near "CREATE"
```
**Solution**: Validate migration file syntax before running

## Backup and Recovery

### Automatic Backups
- Created before each migration run
- Stored in `.backups/pre-migration/`
- Keeps last 5 backups automatically
- Can be disabled with `--skip-backup`

### Manual Recovery
```bash
# Restore from backup
psql -d database_name < .backups/pre-migration/backup_TIMESTAMP.sql

# Mark migrations as applied after restore
./scripts/run-migrations.sh --force-register
```

## Deployment Integration

### In Deployment Scripts
```bash
# Check migration status
./scripts/run-migrations.sh --dry-run

# Run migrations with backup
./scripts/run-migrations.sh

# Verify no pending migrations
./scripts/migration-helper.sh status
```

### Environment Variables
```bash
# Required
DB_HOST=localhost
DB_PORT=5432
DB_NAME=slam25_szene
DB_USER=szenesql
DB_PASSWORD=your_password

# Optional
DB_MAX_CONNECTIONS=2
DB_MIN_CONNECTIONS=1
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000
```

## Monitoring and Logging

### Migration Tracking
All migrations are tracked in the `schema_migrations` table:
```sql
SELECT * FROM schema_migrations ORDER BY applied_at DESC;
```

### Log Files
- Migration execution logs in console output
- Backup files with timestamps
- Error details for failed migrations

## Troubleshooting

### Debug Mode
```bash
# Run with verbose output
bash -x ./scripts/run-migrations.sh --dry-run
```

### Manual Migration Testing
```bash
# Test individual migration
psql -d database_name -f database/migrations/migration_file.sql

# Check migration status
./scripts/migration-helper.sh status
```

### Common Commands
```bash
# List all migrations
./scripts/migration-helper.sh list

# Validate migration files
./scripts/migration-helper.sh validate

# Clean up old backups
./scripts/migration-helper.sh cleanup
```

## Security Considerations

1. **Environment Variables**: Never commit database credentials
2. **Backup Security**: Backup files contain sensitive data
3. **Permission Management**: Use least-privilege principle
4. **Migration Validation**: Always validate before production deployment

## Recent Migrations

### 2025-10-27: Timetable Slug Constraint
- **File**: `20251027133148_add_timetable_slug_constraint.sql`
- **Purpose**: Ensures timetable events always have valid slugs
- **Constraint**: `check_slug_not_empty` prevents NULL or empty slugs
- **Impact**: Prevents broken event links and improves data integrity
- **Rollback**: `20251027133148_add_timetable_slug_constraint_rollback.sql`

## Future Improvements

1. **Rollback Support**: Automatic rollback on failure
2. **Migration Dependencies**: Handle complex migration dependencies
3. **Parallel Migrations**: Run independent migrations in parallel
4. **Migration Testing**: Automated migration testing framework
5. **Schema Validation**: Post-migration schema validation

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `./scripts/run-migrations.sh` | Run all pending migrations |
| `./scripts/run-migrations.sh --dry-run` | Preview migrations |
| `./scripts/run-migrations.sh --force-register` | Mark all as applied |
| `./scripts/migration-helper.sh create NAME` | Create new migration |
| `./scripts/migration-helper.sh status` | Show migration status |
| `./scripts/migration-helper.sh list` | List all migrations |
| `./scripts/migration-helper.sh validate` | Validate migration files |
