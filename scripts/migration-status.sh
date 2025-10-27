#!/bin/bash

# SLAM25 Database Migration Status Script
# Shows applied and pending migrations with color-coded output

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
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
    echo "SLAM25 Database Migration Status Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --help, -h         Show this help message"
    echo ""
    echo "This script shows:"
    echo "  - Applied migrations with timestamps and execution times"
    echo "  - Pending migrations"
    echo "  - Total counts"
    echo "  - Color-coded output (green=applied, yellow=pending)"
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

log_info "📊 Checking migration status..."
log_info "📊 Database: $DB_NAME@$DB_HOST:$DB_PORT"
log_info "👤 User: $DB_USER"

# Check if schema_migrations table exists
log_info "🔍 Checking schema_migrations table..."
TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'schema_migrations';" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$TABLE_EXISTS" -eq 0 ]; then
    log_warning "⚠️  Schema migrations table does not exist"
    log_info "💡 Run migrations first to create the tracking table"
    exit 0
fi

# Get applied migrations with details
log_info "📋 Fetching applied migrations..."
APPLIED_MIGRATIONS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -t -c "SELECT migration_name, applied_at, execution_time_ms FROM schema_migrations ORDER BY applied_at;" 2>/dev/null || echo "")

# Get all migration files
ALL_MIGRATIONS=$(find "$MIGRATIONS_DIR" -name "*.sql" -type f | \
    grep -v "000_create_migrations_table.sql" | \
    grep -v "_rollback.sql" | \
    sort | \
    xargs -I {} basename {})

# Extract applied migration names
APPLIED_NAMES=$(echo "$APPLIED_MIGRATIONS" | awk '{print $1}' | grep -v "^$" || echo "")

# Find pending migrations
PENDING_MIGRATIONS=""
for migration in $ALL_MIGRATIONS; do
    if ! echo "$APPLIED_NAMES" | grep -q "^$migration$"; then
        PENDING_MIGRATIONS="$PENDING_MIGRATIONS $migration"
    fi
done

# Count migrations
APPLIED_COUNT=$(echo "$APPLIED_MIGRATIONS" | grep -c . || echo "0")
PENDING_COUNT=$(echo "$PENDING_MIGRATIONS" | wc -w)

# Display results
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}                    MIGRATION STATUS REPORT                    ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Summary
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "   ${GREEN}Applied:${NC} $APPLIED_COUNT"
echo -e "   ${YELLOW}Pending:${NC} $PENDING_COUNT"
echo ""

# Applied migrations
if [ "$APPLIED_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Applied Migrations:${NC}"
    echo "$APPLIED_MIGRATIONS" | while IFS=$'\t' read -r name applied_at execution_time; do
        if [ -n "$name" ]; then
            # Format timestamp
            FORMATTED_DATE=$(date -d "$applied_at" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "$applied_at")
            # Format execution time
            if [ "$execution_time" -gt 0 ]; then
                TIME_DISPLAY="${execution_time}ms"
            else
                TIME_DISPLAY="N/A"
            fi
            echo -e "   ${GREEN}✓${NC} $name"
            echo -e "      Applied: $FORMATTED_DATE"
            echo -e "      Duration: $TIME_DISPLAY"
            echo ""
        fi
    done
else
    echo -e "${YELLOW}⚠️  No migrations applied yet${NC}"
    echo ""
fi

# Pending migrations
if [ "$PENDING_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⏳ Pending Migrations:${NC}"
    for migration in $PENDING_MIGRATIONS; do
        echo -e "   ${YELLOW}○${NC} $migration"
    done
    echo ""
else
    echo -e "${GREEN}✅ No pending migrations${NC}"
    echo ""
fi

# Migration files check
echo -e "${BLUE}📁 Migration Files Check:${NC}"
TOTAL_FILES=$(echo "$ALL_MIGRATIONS" | wc -w)
ROLLBACK_FILES=$(find "$MIGRATIONS_DIR" -name "*_rollback.sql" -type f | wc -l)
echo -e "   Total migration files: $TOTAL_FILES"
echo -e "   Rollback files: $ROLLBACK_FILES"

if [ "$ROLLBACK_FILES" -lt "$TOTAL_FILES" ]; then
    echo -e "   ${YELLOW}⚠️  Some migrations missing rollback files${NC}"
else
    echo -e "   ${GREEN}✅ All migrations have rollback files${NC}"
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"

# Exit with appropriate code
if [ "$PENDING_COUNT" -gt 0 ]; then
    log_info "💡 Run 'npm run migrate' to apply pending migrations"
    exit 1
else
    log_success "✅ All migrations are up to date"
    exit 0
fi

