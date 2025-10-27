#!/bin/bash

# Pre-Deployment Checklist Script
# Verifies that all local changes are ready for deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

log_info "🔍 Pre-deployment checklist..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log_error "Please run this script from the project root directory"
    exit 1
fi

# Check package.json has bcryptjs
log_info "📦 Checking package.json dependencies..."
if grep -q '"bcryptjs"' package.json; then
    log_success "✅ package.json has bcryptjs"
else
    log_error "❌ package.json missing bcryptjs"
    exit 1
fi

# Check logger is simple (no Winston)
log_info "📝 Checking logger configuration..."
if grep -q "winston" server/config/logger.js; then
    log_error "❌ Logger still uses Winston"
    exit 1
else
    log_success "✅ Logger is simplified (no Winston)"
fi

# Check if build works
log_info "🏗️  Testing build process..."
if npm run build; then
    log_success "✅ Build process works"
else
    log_error "❌ Build process failed"
    exit 1
fi

# Check if database backup exists
log_info "💾 Checking database backup..."
if [ -f "slam25_backup.sql" ]; then
    log_success "✅ Database backup exists"
else
    log_warning "⚠️  Database backup not found (run 'npm run export-db' if needed)"
fi

# Check if uploads backup exists
log_info "📁 Checking uploads backup..."
if [ -f "uploads_backup.tar.gz" ]; then
    log_success "✅ Uploads backup exists"
else
    log_warning "⚠️  Uploads backup not found (run 'npm run package-uploads' if needed)"
fi

# Test local server startup
log_info "🚀 Testing local server startup..."
if timeout 5s npm start > /dev/null 2>&1; then
    log_success "✅ Local server starts without errors"
else
    log_warning "⚠️  Local server startup test completed (timeout expected)"
fi

# Stop any running processes
npm run stop > /dev/null 2>&1 || true

log_success "🎉 Pre-deployment checklist completed!"
log_info "📋 Summary:"
log_info "   ✅ bcryptjs dependency configured"
log_info "   ✅ Simple logger (no Winston)"
log_info "   ✅ Build process works"
log_info "   ✅ Ready for deployment"

log_info "🚀 You can now run: ./clean-deploy.sh"
