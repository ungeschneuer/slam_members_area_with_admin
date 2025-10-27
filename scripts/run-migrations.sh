#!/bin/bash

# SLAM25 Database Migration Runner
# Automatically runs pending database migrations with backup and rollback support
# Improved version with better error handling and migration marking

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MIGRATIONS_DIR="database/migrations"
BACKUP_DIR=".backups"
PRE_MIGRATION_DIR="$BACKUP_DIR/pre-migration"
REGISTER_ONLY=false
DRY_RUN=false
FORCE_REGISTER=false
SKIP_BACKUP=false

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    echo "SLAM25 Database Migration Runner"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --register-only     Only register migrations in tracking table (don't execute)"
    echo "  --force-register    Force register all pending migrations as applied"
    echo "  --dry-run           Show what would be done without executing"
    echo "  --skip-backup       Skip backup creation (faster for testing)"
    echo "  --help, -h          Show this help message"
    echo ""
    echo "This script:"
    echo "  - Creates backup before running migrations"
    echo "  - Runs pending migrations in chronological order (by timestamp)"
    echo "  - Records execution time for monitoring"
    echo "  - Cleans up old backups (keeps last 5)"
    echo "  - Handles already-applied migrations gracefully"
    echo ""
    echo "Migration File Naming:"
    echo "  - Use timestamp format: YYYYMMDDHHMMSS_description.sql"
    echo "  - Example: 20251027120000_add_new_table.sql"
    echo "  - Non-timestamped files are processed first (legacy support)"
    echo ""
    echo "Environment variables:"
    echo "  DB_HOST            Database host (default: localhost)"
    echo "  DB_PORT            Database port (default: 5432)"
    echo "  DB_NAME            Database name (default: slam25_szene)"
    echo "  DB_USER            Database user"
    echo "  DB_PASSWORD        Database password"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --register-only)
            REGISTER_ONLY=true
            shift
            ;;
        --force-register)
            FORCE_REGISTER=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Load environment variables
if [ -f ".env" ]; then
    source .env
fi

# Set defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-slam25_szene}"
DB_USER="${DB_USER:-}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Validate required environment variables
if [ -z "$DB_USER" ]; then
    log_error "DB_USER environment variable is required"
    exit 1
fi

if [ -z "$DB_PASSWORD" ]; then
    log_error "DB_PASSWORD environment variable is required"
    exit 1
fi

# Set PGPASSWORD for psql (CRITICAL: Must be set before any psql commands)
export PGPASSWORD="$DB_PASSWORD"

# Validate database connection before proceeding
log_info "🔍 Testing database connection..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
    log_error "❌ Cannot connect to database: $DB_NAME@$DB_HOST:$DB_PORT"
    log_error "Please check your database configuration and credentials"
    log_error "Make sure the database user has proper permissions"
    exit 1
fi

log_success "✅ Database connection verified"

log_info "🚀 Starting database migration process..."
log_info "📊 Database: $DB_NAME@$DB_HOST:$DB_PORT"
log_info "👤 User: $DB_USER"
log_info "🔧 Mode: $([ "$DRY_RUN" = true ] && echo "Dry Run" || [ "$REGISTER_ONLY" = true ] && echo "Register Only" || [ "$FORCE_REGISTER" = true ] && echo "Force Register" || echo "Execute Migrations")"

# Create backup directories
mkdir -p "$PRE_MIGRATION_DIR"

# Create timestamp for backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$PRE_MIGRATION_DIR/backup_$TIMESTAMP.sql"

# Create backup before running migrations (skip in dry-run mode or if requested)
if [ "$DRY_RUN" = false ] && [ "$SKIP_BACKUP" = false ]; then
    log_info "💾 Creating backup: $BACKUP_FILE"
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --clean --if-exists --no-owner --no-privileges \
        -f "$BACKUP_FILE"; then
        log_success "✅ Backup created successfully"
    else
        log_error "❌ Backup creation failed"
        exit 1
    fi
elif [ "$SKIP_BACKUP" = true ]; then
    log_warning "⚠️  Skipping backup creation (--skip-backup)"
else
    log_info "💾 [DRY RUN] Would create backup: $BACKUP_FILE"
fi

# Ensure schema_migrations table exists
log_info "🔧 Ensuring schema_migrations table exists..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -f "$MIGRATIONS_DIR/000_create_migrations_table.sql" >/dev/null 2>&1; then
    log_success "✅ Schema migrations table ready"
else
    log_error "❌ Failed to create schema_migrations table"
    exit 1
fi

# Get list of applied migrations
log_info "📋 Checking applied migrations..."
APPLIED_MIGRATIONS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -t -c "SELECT migration_name FROM schema_migrations ORDER BY migration_name;" 2>/dev/null | tr -d ' ' || echo "")

# Get list of all migration files with improved sorting
# Sort by: 1) Non-timestamped files first (legacy), 2) Then by timestamp
ALL_MIGRATIONS=$(find "$MIGRATIONS_DIR" -name "*.sql" -type f | \
    grep -v "000_create_migrations_table.sql" | \
    grep -v "_rollback.sql" | \
    while read file; do
        basename "$file"
    done | \
    sort -t'_' -k1,1 -k2,2 | \
    tr '\n' ' ')

# Find pending migrations
PENDING_MIGRATIONS=""
for migration in $ALL_MIGRATIONS; do
    if ! echo "$APPLIED_MIGRATIONS" | grep -q "^$migration$"; then
        PENDING_MIGRATIONS="$PENDING_MIGRATIONS $migration"
    fi
done

# Count migrations
APPLIED_COUNT=$(echo "$APPLIED_MIGRATIONS" | grep -c . || echo "0")
PENDING_COUNT=$(echo "$PENDING_MIGRATIONS" | wc -w)

log_info "📊 Migration Status:"
log_info "   Applied: $APPLIED_COUNT"
log_info "   Pending: $PENDING_COUNT"

if [ "$PENDING_COUNT" -eq 0 ]; then
    log_success "✅ No pending migrations"
    if [ "$DRY_RUN" = false ] && [ "$SKIP_BACKUP" = false ]; then
        log_info "🧹 Cleaning up backup (no migrations to run)..."
        rm -f "$BACKUP_FILE"
    elif [ "$DRY_RUN" = true ]; then
        log_info "🧹 [DRY RUN] Would clean up backup (no migrations to run)"
    fi
    exit 0
fi

# Show pending migrations
log_info "📋 Pending migrations:"
for migration in $PENDING_MIGRATIONS; do
    log_info "   - $migration"
done

# Handle force register mode
if [ "$FORCE_REGISTER" = true ]; then
    log_info "🔄 Force registering all pending migrations..."
    for migration in $PENDING_MIGRATIONS; do
        log_info "📝 Force registering: $migration"
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -c "INSERT INTO schema_migrations (migration_name, execution_time_ms) VALUES ('$migration', 0);" >/dev/null 2>&1; then
            log_success "✅ Force registered: $migration"
        else
            log_error "❌ Failed to force register: $migration"
            exit 1
        fi
    done
    log_success "🎉 Force registration completed!"
    exit 0
fi

# Run pending migrations
if [ "$DRY_RUN" = true ]; then
    log_info "🔄 [DRY RUN] Would run pending migrations:"
    for migration in $PENDING_MIGRATIONS; do
        MIGRATION_FILE="$MIGRATIONS_DIR/$migration"
        if [ -f "$MIGRATION_FILE" ]; then
            log_info "   📝 Would process: $migration"
            log_info "      File: $MIGRATION_FILE"
            log_info "      Size: $(wc -l < "$MIGRATION_FILE") lines"
        else
            log_warning "   ⚠️  Migration file not found: $MIGRATION_FILE"
        fi
    done
    log_info "🎉 [DRY RUN] Migration preview completed"
    exit 0
fi

log_info "🔄 Running pending migrations..."
FAILED_MIGRATIONS=""
SUCCESSFUL_MIGRATIONS=""

for migration in $PENDING_MIGRATIONS; do
    log_info "📝 Processing: $migration"
    
    MIGRATION_FILE="$MIGRATIONS_DIR/$migration"
    
    if [ ! -f "$MIGRATION_FILE" ]; then
        log_error "❌ Migration file not found: $MIGRATION_FILE"
        FAILED_MIGRATIONS="$FAILED_MIGRATIONS $migration"
        continue
    fi
    
    # Start timing
    START_TIME=$(date +%s%3N)
    
    if [ "$REGISTER_ONLY" = true ]; then
        # Register-only mode: register migration without executing
        log_info "📝 Registering migration (not executing): $migration"
        
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -c "INSERT INTO schema_migrations (migration_name, execution_time_ms) VALUES ('$migration', 0);" >/dev/null 2>&1; then
            log_success "✅ Registered: $migration"
            SUCCESSFUL_MIGRATIONS="$SUCCESSFUL_MIGRATIONS $migration"
        else
            log_error "❌ Failed to register: $migration"
            FAILED_MIGRATIONS="$FAILED_MIGRATIONS $migration"
        fi
    else
        # Normal mode: execute migration with better error handling
        log_info "🔄 Executing migration: $migration"
        
        # Test the migration first by checking if it would fail
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -c "BEGIN; \i $MIGRATION_FILE; ROLLBACK;" >/dev/null 2>&1; then
            # Migration syntax is valid, now execute it for real
            if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                -c "BEGIN; \i $MIGRATION_FILE; INSERT INTO schema_migrations (migration_name, execution_time_ms) VALUES ('$migration', $(($(date +%s%3N) - START_TIME))); COMMIT;" >/dev/null 2>&1; then
                END_TIME=$(date +%s%3N)
                EXECUTION_TIME=$((END_TIME - START_TIME))
                log_success "✅ Completed: $migration (${EXECUTION_TIME}ms)"
                SUCCESSFUL_MIGRATIONS="$SUCCESSFUL_MIGRATIONS $migration"
            else
                log_error "❌ Failed to execute: $migration"
                FAILED_MIGRATIONS="$FAILED_MIGRATIONS $migration"
            fi
        else
            log_error "❌ Migration syntax error or permission issue: $migration"
            log_error "   Check the migration file for errors or ensure proper database permissions"
            FAILED_MIGRATIONS="$FAILED_MIGRATIONS $migration"
        fi
    fi
done

# Check for failures
if [ -n "$FAILED_MIGRATIONS" ]; then
    log_error "❌ Migration failures detected:"
    for migration in $FAILED_MIGRATIONS; do
        log_error "   - $migration"
    done
    if [ "$SKIP_BACKUP" = false ]; then
        log_error "💾 Backup available at: $BACKUP_FILE"
    fi
    log_error "🔄 Manual recovery may be required"
    log_error "💡 Try running individual migrations manually to debug"
    exit 1
fi

# Clean up old backups (keep last 5)
if [ "$SKIP_BACKUP" = false ]; then
    log_info "🧹 Cleaning up old backups..."
    if [ -d "$PRE_MIGRATION_DIR" ]; then
        OLD_BACKUPS=$(ls -t "$PRE_MIGRATION_DIR"/backup_*.sql 2>/dev/null | tail -n +6 || true)
        if [ -n "$OLD_BACKUPS" ]; then
            echo "$OLD_BACKUPS" | xargs rm -f
            log_info "🗑️  Removed old backup files"
        else
            log_info "📁 No old backups to clean up"
        fi
    fi
fi

log_success "🎉 Migration process completed successfully!"
log_info "📊 Summary:"
log_info "   Applied: $APPLIED_COUNT"
log_info "   Processed: $PENDING_COUNT"
log_info "   Failed: 0"
if [ "$SKIP_BACKUP" = false ]; then
    log_info "💾 Latest backup: $BACKUP_FILE"
fi

# Show successful migrations
if [ -n "$SUCCESSFUL_MIGRATIONS" ]; then
    log_info "✅ Successfully processed migrations:"
    for migration in $SUCCESSFUL_MIGRATIONS; do
        log_info "   - $migration"
    done
fi