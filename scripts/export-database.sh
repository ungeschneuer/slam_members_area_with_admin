#!/bin/bash

# SLAM25 Database Export Script
# Exports the local PostgreSQL database for deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    log_error ".env file not found. Please create it first."
    exit 1
fi

# Source environment variables
source .env

# Check if required environment variables are set
if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ]; then
    log_error "Database configuration not found in .env file"
    exit 1
fi

# Use marcel as the database user (superuser)
DB_USER="marcel"

log_info "Exporting database: $DB_NAME from $DB_HOST as user: $DB_USER"

# Export database with proper options for Uberspace
# Exclude backup schemas and use data-only for tables that might have permission issues
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --exclude-schema=backup_schema_* \
    --exclude-schema=temp_* \
    --verbose \
    -f "slam25_backup.sql"

if [ $? -eq 0 ]; then
    log_info "Database exported successfully to slam25_backup.sql"
    
    # Show file size
    FILE_SIZE=$(du -h slam25_backup.sql | cut -f1)
    log_info "Backup file size: $FILE_SIZE"
    
    # Show table count
    TABLE_COUNT=$(grep -c "CREATE TABLE" slam25_backup.sql || echo "0")
    log_info "Tables exported: $TABLE_COUNT"
    
else
    log_error "Database export failed"
    exit 1
fi

log_info "Database export completed successfully!"
