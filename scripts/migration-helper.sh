#!/bin/bash

# SLAM25 Migration Management Helper
# Provides utilities for managing database migrations

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

MIGRATIONS_DIR="database/migrations"

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
    echo "SLAM25 Migration Management Helper"
    echo ""
    echo "Usage: $0 COMMAND [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  create NAME          Create a new migration file with timestamp"
    echo "  list                 List all migration files"
    echo "  status               Show migration status"
    echo "  mark-applied NAME    Mark a migration as applied without executing"
    echo "  mark-pending NAME    Mark a migration as pending (remove from applied)"
    echo "  rename OLD NEW       Rename a migration file"
    echo "  validate             Validate all migration files"
    echo "  cleanup              Clean up old backup files"
    echo ""
    echo "Examples:"
    echo "  $0 create add_user_table"
    echo "  $0 mark-applied 20251027120000_add_user_table.sql"
    echo "  $0 status"
    echo "  $0 list"
}

# Create a new migration file
create_migration() {
    local name="$1"
    local timestamp=$(date +"%Y%m%d%H%M%S")
    local filename="${timestamp}_${name}.sql"
    local filepath="$MIGRATIONS_DIR/$filename"
    
    if [ -f "$filepath" ]; then
        log_error "Migration file already exists: $filename"
        exit 1
    fi
    
    cat > "$filepath" << EOF
-- Migration: $name
-- Date: $(date +"%Y-%m-%d %H:%M:%S")
-- Description: [Add description here]

-- Add your migration SQL here
-- Example:
-- CREATE TABLE example_table (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Add indexes if needed
-- CREATE INDEX idx_example_table_name ON example_table(name);

-- Add comments
-- COMMENT ON TABLE example_table IS 'Example table for migration';
EOF
    
    log_success "Created migration: $filename"
    log_info "Edit the file to add your migration SQL: $filepath"
}

# List all migration files
list_migrations() {
    log_info "Migration files in $MIGRATIONS_DIR:"
    echo ""
    
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        log_error "Migrations directory not found: $MIGRATIONS_DIR"
        exit 1
    fi
    
    # List files with details
    ls -la "$MIGRATIONS_DIR"/*.sql 2>/dev/null | while read line; do
        if [[ "$line" =~ .*000_create_migrations_table\.sql ]]; then
            echo -e "${YELLOW}$line${NC} (system table)"
        elif [[ "$line" =~ .*_rollback\.sql ]]; then
            echo -e "${RED}$line${NC} (rollback)"
        else
            echo -e "${GREEN}$line${NC}"
        fi
    done
}

# Show migration status
show_status() {
    log_info "Migration Status:"
    echo ""
    
    # Run the migration script in dry-run mode to get status
    if [ -f "scripts/run-migrations.sh" ]; then
        ./scripts/run-migrations.sh --dry-run
    else
        log_error "Migration script not found: scripts/run-migrations.sh"
        exit 1
    fi
}

# Mark migration as applied
mark_applied() {
    local migration_name="$1"
    
    if [ ! -f "$MIGRATIONS_DIR/$migration_name" ]; then
        log_error "Migration file not found: $migration_name"
        exit 1
    fi
    
    log_info "Marking migration as applied: $migration_name"
    
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
    
    if [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
        log_error "Database credentials not found in environment"
        exit 1
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -c "INSERT INTO schema_migrations (migration_name, execution_time_ms) VALUES ('$migration_name', 0);" >/dev/null 2>&1; then
        log_success "✅ Marked as applied: $migration_name"
    else
        log_error "❌ Failed to mark as applied: $migration_name"
        exit 1
    fi
}

# Mark migration as pending
mark_pending() {
    local migration_name="$1"
    
    log_info "Marking migration as pending: $migration_name"
    
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
    
    if [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
        log_error "Database credentials not found in environment"
        exit 1
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -c "DELETE FROM schema_migrations WHERE migration_name = '$migration_name';" >/dev/null 2>&1; then
        log_success "✅ Marked as pending: $migration_name"
    else
        log_error "❌ Failed to mark as pending: $migration_name"
        exit 1
    fi
}

# Rename migration file
rename_migration() {
    local old_name="$1"
    local new_name="$2"
    
    local old_file="$MIGRATIONS_DIR/$old_name"
    local new_file="$MIGRATIONS_DIR/$new_name"
    
    if [ ! -f "$old_file" ]; then
        log_error "Migration file not found: $old_name"
        exit 1
    fi
    
    if [ -f "$new_file" ]; then
        log_error "Target migration file already exists: $new_name"
        exit 1
    fi
    
    mv "$old_file" "$new_file"
    log_success "Renamed migration: $old_name -> $new_name"
    
    # Update the migration name in the file
    sed -i "s/-- Migration: .*/-- Migration: $new_name/" "$new_file"
    log_info "Updated migration comment in file"
}

# Validate migration files
validate_migrations() {
    log_info "Validating migration files..."
    
    local errors=0
    
    for file in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$file" ]; then
            local basename_file=$(basename "$file")
            
            # Skip system files
            if [[ "$basename_file" =~ ^000_ ]] || [[ "$basename_file" =~ _rollback\.sql$ ]]; then
                continue
            fi
            
            # Check if file has proper timestamp format
            if [[ ! "$basename_file" =~ ^[0-9]{14}_ ]]; then
                log_warning "⚠️  Non-timestamped migration: $basename_file"
            fi
            
            # Check if file is not empty
            if [ ! -s "$file" ]; then
                log_error "❌ Empty migration file: $basename_file"
                ((errors++))
            fi
            
            # Check for basic SQL syntax (simple check)
            if ! grep -q ";" "$file"; then
                log_warning "⚠️  No semicolons found in: $basename_file"
            fi
        fi
    done
    
    if [ $errors -eq 0 ]; then
        log_success "✅ All migration files validated successfully"
    else
        log_error "❌ Found $errors validation errors"
        exit 1
    fi
}

# Clean up old backup files
cleanup_backups() {
    log_info "Cleaning up old backup files..."
    
    local backup_dir=".backups/pre-migration"
    
    if [ ! -d "$backup_dir" ]; then
        log_info "No backup directory found"
        return 0
    fi
    
    # Keep last 5 backups
    local old_backups=$(ls -t "$backup_dir"/backup_*.sql 2>/dev/null | tail -n +6 || true)
    
    if [ -n "$old_backups" ]; then
        echo "$old_backups" | xargs rm -f
        log_success "🗑️  Removed old backup files"
    else
        log_info "📁 No old backups to clean up"
    fi
}

# Main command handling
case "${1:-}" in
    create)
        if [ -z "${2:-}" ]; then
            log_error "Migration name required"
            echo "Usage: $0 create MIGRATION_NAME"
            exit 1
        fi
        create_migration "$2"
        ;;
    list)
        list_migrations
        ;;
    status)
        show_status
        ;;
    mark-applied)
        if [ -z "${2:-}" ]; then
            log_error "Migration name required"
            echo "Usage: $0 mark-applied MIGRATION_NAME"
            exit 1
        fi
        mark_applied "$2"
        ;;
    mark-pending)
        if [ -z "${2:-}" ]; then
            log_error "Migration name required"
            echo "Usage: $0 mark-pending MIGRATION_NAME"
            exit 1
        fi
        mark_pending "$2"
        ;;
    rename)
        if [ -z "${2:-}" ] || [ -z "${3:-}" ]; then
            log_error "Old and new names required"
            echo "Usage: $0 rename OLD_NAME NEW_NAME"
            exit 1
        fi
        rename_migration "$2" "$3"
        ;;
    validate)
        validate_migrations
        ;;
    cleanup)
        cleanup_backups
        ;;
    --help|-h)
        show_help
        ;;
    "")
        log_error "Command required"
        show_help
        exit 1
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
