#!/bin/bash
set -euo pipefail

# SLAM25 Info Pages Migration Deployment Script
# Safely deploys the info_pages migration to production
# Follows project simplicity standards and security best practices

log_info() { echo -e "\033[0;34m[INFO]\033[0m $1"; }
log_success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }
log_warning() { echo -e "\033[1;33m[WARNING]\033[0m $1"; }

# Configuration
UBERSPACE_USER="${UBERSPACE_USER:-}"
UBERSPACE_HOST="${UBERSPACE_HOST:-}"
MIGRATION_FILE="20251026162000_add_info_page_universal_file.sql"

# Validate required environment variables
if [ -z "$UBERSPACE_USER" ] || [ -z "$UBERSPACE_HOST" ]; then
    log_error "UBERSPACE_USER and UBERSPACE_HOST must be set"
    log_info "Example: UBERSPACE_USER=youruser UBERSPACE_HOST=yourhost.uberspace.de ./scripts/deploy-info-pages-migration.sh"
    exit 1
fi

log_info "🚀 Deploying info_pages migration to production..."
log_info "📊 Target: ${UBERSPACE_USER}@${UBERSPACE_HOST}"
log_info "📁 Migration: ${MIGRATION_FILE}"

# Check if migration file exists locally
if [ ! -f "database/migrations/${MIGRATION_FILE}" ]; then
    log_error "Migration file not found: database/migrations/${MIGRATION_FILE}"
    exit 1
fi

# 1. Create production backup
log_info "💾 Creating production backup..."
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_info_pages_migration_${BACKUP_TIMESTAMP}.sql"

if ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "cd ~/slam25 && pg_dump \$DATABASE_URL > ${BACKUP_FILE}"; then
    log_success "✅ Production backup created: ${BACKUP_FILE}"
else
    log_error "❌ Failed to create production backup"
    exit 1
fi

# 2. Check if migration already applied
log_info "🔍 Checking migration status..."
MIGRATION_STATUS=$(ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "cd ~/slam25 && psql \$DATABASE_URL -t -c \"SELECT COUNT(*) FROM schema_migrations WHERE migration_name = '${MIGRATION_FILE}';\"" | tr -d ' ')

if [ "$MIGRATION_STATUS" = "1" ]; then
    log_success "✅ Migration already applied to production"
    log_info "🧹 Cleaning up backup since migration is already applied..."
    ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "cd ~/slam25 && rm -f ${BACKUP_FILE}"
    exit 0
fi

log_info "📋 Migration not yet applied, proceeding with deployment..."

# 3. Upload migration file
log_info "📤 Uploading migration file..."
if scp database/migrations/${MIGRATION_FILE} ${UBERSPACE_USER}@${UBERSPACE_HOST}:~/slam25/database/migrations/; then
    log_success "✅ Migration file uploaded successfully"
else
    log_error "❌ Failed to upload migration file"
    exit 1
fi

# 4. Run migration on production
log_info "🔄 Running migration on production..."
if ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "cd ~/slam25 && source .env && ./scripts/run-migrations.sh"; then
    log_success "✅ Migration executed successfully on production"
else
    log_error "❌ Migration failed on production"
    log_warning "💾 Backup available at: ${BACKUP_FILE}"
    log_warning "🔄 Manual recovery may be required"
    exit 1
fi

# 5. Verify migration was applied
log_info "🔍 Verifying migration was applied..."
VERIFICATION_RESULT=$(ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "cd ~/slam25 && psql \$DATABASE_URL -t -c \"SELECT migration_name FROM schema_migrations WHERE migration_name = '${MIGRATION_FILE}';\"" | tr -d ' ')

if [ "$VERIFICATION_RESULT" = "${MIGRATION_FILE}" ]; then
    log_success "✅ Migration verification successful"
else
    log_error "❌ Migration verification failed"
    log_warning "💾 Backup available at: ${BACKUP_FILE}"
    exit 1
fi

# 6. Verify new columns exist
log_info "🔍 Verifying new columns in info_pages table..."
COLUMN_CHECK=$(ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "cd ~/slam25 && psql \$DATABASE_URL -t -c \"SELECT column_name FROM information_schema.columns WHERE table_name = 'info_pages' AND column_name IN ('file_url', 'file_type', 'file_description', 'additional_links');\"" | tr -d ' ')

if echo "$COLUMN_CHECK" | grep -q "additional_links"; then
    log_success "✅ New columns verified in production"
else
    log_error "❌ New columns not found in production"
    log_warning "💾 Backup available at: ${BACKUP_FILE}"
    exit 1
fi

# 7. Restart production server
log_info "🔄 Restarting production server..."
if ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "cd ~/slam25 && supervisorctl restart slam25"; then
    log_success "✅ Production server restarted"
else
    log_warning "⚠️  Server restart failed - manual restart may be required"
fi

# Wait for server to start
log_info "⏳ Waiting for server to start..."
sleep 5

# Check server status
log_info "🔍 Checking server status..."
SERVER_STATUS=$(ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "cd ~/slam25 && supervisorctl status slam25" | awk '{print $2}')

if [ "$SERVER_STATUS" = "RUNNING" ]; then
    log_success "✅ Production server is running"
else
    log_warning "⚠️  Server status: ${SERVER_STATUS} - manual check may be required"
fi

log_success "🎉 Migration deployed successfully to production!"
log_info "📊 Summary:"
log_info "   Migration: ${MIGRATION_FILE}"
log_info "   Backup: ${BACKUP_FILE}"
log_info "   Server Status: ${SERVER_STATUS}"
log_info "   New Columns: file_url, file_type, file_description, additional_links"

log_info "💡 Next steps:"
log_info "   1. Test info pages functionality in admin panel"
log_info "   2. Add additional links to existing info pages"
log_info "   3. Verify links display correctly in user interface"
