#!/bin/bash

# SLAM25 Database Migration Rollback Script
# Rolls back a specific migration with backup and safety checks

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
ROLLBACK_DIR="$BACKUP_DIR/rollbacks"

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
    echo "SLAM25 Database Migration Rollback Script"
    echo ""
    echo "Usage: $0 <migration_name>"
    echo ""
    echo "Arguments:"
    echo "  migration_name     Name of the migration to rollback (e.g., 20250126143052_add_user_preferences.sql)"
    echo ""
    echo "This script:"
    echo "  - Creates backup before rollback"
    echo "  - Validates migration exists in tracking table"
    echo "  - Executes rollback SQL in transaction"
    echo "  - Removes migration from tracking table"
    echo "  - Cleans up old rollback backups (keeps last 5)"
    echo ""
    echo "Environment variables:"
    echo "  DB_HOST            Database host (default: localhost)"
    echo "  DB_PORT            Database port (default: 5432)"
    echo "  DB_NAME            Database name (default: slam25_szene)"
    echo "  DB_USER            Database user"
    echo "  DB_PASSWORD        Database password"
    echo ""
    echo "Examples:"
    echo "  $0 20250126143052_add_user_preferences.sql"
    echo "  $0 20251026104400_remove_is_published_from_info_pages.sql"
}

# Check arguments
if [ $# -eq 0 ]; then
    log_error "❌ Migration name is required"
    show_help
    exit 1
fi

if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

MIGRATION_NAME="$1"

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

# Validate database connection before proceeding
log_info "🔍 Testing database connection..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
    log_error "❌ Cannot connect to database: $DB_NAME@$DB_HOST:$DB_PORT"
    log_error "Please check your database configuration and credentials"
    exit 1
fi

log_success "✅ Database connection verified"

# Set PGPASSWORD for psql
export PGPASSWORD="$DB_PASSWORD"

log_info "🔄 Starting migration rollback process..."
log_info "📊 Database: $DB_NAME@$DB_HOST:$DB_PORT"
log_info "👤 User: $DB_USER"
log_info "📝 Migration: $MIGRATION_NAME"

# Create backup directory
mkdir -p "$ROLLBACK_DIR"

# Create timestamp for backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$ROLLBACK_DIR/backup_$TIMESTAMP.sql"

# Create backup before rollback
log_info "💾 Creating backup: $BACKUP_FILE"
if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --clean --if-exists --no-owner --no-privileges \
    -f "$BACKUP_FILE"; then
    log_success "✅ Backup created successfully"
else
    log_error "❌ Backup creation failed"
    exit 1
fi

# Check if migration exists in tracking table
log_info "🔍 Checking if migration exists in tracking table..."
MIGRATION_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -t -c "SELECT COUNT(*) FROM schema_migrations WHERE migration_name = '$MIGRATION_NAME';" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$MIGRATION_EXISTS" -eq 0 ]; then
    log_error "❌ Migration '$MIGRATION_NAME' not found in tracking table"
    log_error "💡 Use 'npm run migrate:status' to see applied migrations"
    exit 1
fi

log_success "✅ Migration found in tracking table"

# Find rollback file
ROLLBACK_FILE="$MIGRATIONS_DIR/${MIGRATION_NAME%.sql}_rollback.sql"

if [ ! -f "$ROLLBACK_FILE" ]; then
    log_error "❌ Rollback file not found: $ROLLBACK_FILE"
    log_error "💡 Rollback file must be named: ${MIGRATION_NAME%.sql}_rollback.sql"
    log_error "💾 Backup available at: $BACKUP_FILE"
    exit 1
fi

log_success "✅ Rollback file found: $ROLLBACK_FILE"

# Show migration details for confirmation
log_info "📋 Migration details:"
log_info "   Migration: $MIGRATION_NAME"
log_info "   Rollback file: $ROLLBACK_FILE"
log_info "   Backup: $BACKUP_FILE"

# Show rollback file content for confirmation
log_info "📋 Rollback SQL that will be executed:"
echo "----------------------------------------"
cat "$ROLLBACK_FILE"
echo "----------------------------------------"

# Confirm rollback
log_warning "⚠️  This will rollback migration: $MIGRATION_NAME"
log_warning "⚠️  The above SQL will be executed in a transaction"
log_warning "⚠️  Backup available at: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to proceed? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "❌ Rollback cancelled by user"
    exit 0
fi

# Execute rollback in transaction
log_info "🔄 Executing rollback..."
START_TIME=$(date +%s%3N)

if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -c "BEGIN; \i $ROLLBACK_FILE; DELETE FROM schema_migrations WHERE migration_name = '$MIGRATION_NAME'; COMMIT;" >/dev/null 2>&1; then
    END_TIME=$(date +%s%3N)
    EXECUTION_TIME=$((END_TIME - START_TIME))
    log_success "✅ Rollback completed successfully (${EXECUTION_TIME}ms)"
else
    log_error "❌ Rollback failed"
    log_error "💾 Backup available at: $BACKUP_FILE"
    log_error "🔄 Manual recovery may be required"
    exit 1
fi

# Clean up old rollback backups (keep last 5)
log_info "🧹 Cleaning up old rollback backups..."
if [ -d "$ROLLBACK_DIR" ]; then
    OLD_BACKUPS=$(ls -t "$ROLLBACK_DIR"/backup_*.sql 2>/dev/null | tail -n +6 || true)
    if [ -n "$OLD_BACKUPS" ]; then
        echo "$OLD_BACKUPS" | xargs rm -f
        log_info "🗑️  Removed old rollback backup files"
    else
        log_info "📁 No old rollback backups to clean up"
    fi
fi

log_success "🎉 Rollback process completed successfully!"
log_info "📊 Summary:"
log_info "   Rolled back: $MIGRATION_NAME"
log_info "   Execution time: ${EXECUTION_TIME}ms"
log_info "💾 Backup: $BACKUP_FILE"

