#!/bin/bash

# SLAM25 Uploads Packaging Script
# Packages the uploads directory for deployment

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

# Check if uploads directory exists
if [ ! -d "public/uploads" ]; then
    log_warn "No uploads directory found at public/uploads"
    log_info "Creating empty uploads directory structure..."
    mkdir -p public/uploads/news
    mkdir -p public/uploads/info-pages
    touch public/uploads/.gitkeep
    touch public/uploads/news/.gitkeep
    touch public/uploads/info-pages/.gitkeep
fi

log_info "Packaging uploads directory..."

# Package uploads directory
tar -czf uploads_backup.tar.gz \
    -C . public/uploads/

if [ $? -eq 0 ]; then
    log_info "Uploads packaged successfully to uploads_backup.tar.gz"
    
    # Show file size
    FILE_SIZE=$(du -h uploads_backup.tar.gz | cut -f1)
    log_info "Archive size: $FILE_SIZE"
    
    # Show contents
    log_info "Archive contents:"
    tar -tzf uploads_backup.tar.gz | head -20
    
    # Count files
    FILE_COUNT=$(tar -tzf uploads_backup.tar.gz | wc -l)
    log_info "Total files in archive: $FILE_COUNT"
    
else
    log_error "Failed to package uploads directory"
    exit 1
fi

log_info "Uploads packaging completed successfully!"
