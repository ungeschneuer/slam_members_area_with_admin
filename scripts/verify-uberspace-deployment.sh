#!/bin/bash

# Verification Script for Uberspace Deployment
# Checks that bcryptjs is working and service is healthy

set -e

# Configuration
UBERSPACE_USER="slam25"
UBERSPACE_HOST="octans.uberspace.de"
PROJECT_NAME="slam25"
PORT="47180"

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

log_info "🔍 Verifying Uberspace deployment..."

ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "
    cd ~/${PROJECT_NAME}
    
    echo '=== Dependency Check ==='
    if [ -d node_modules/bcryptjs ]; then
        echo 'OK: bcryptjs present'
    else
        echo 'ERROR: bcryptjs missing!'
        exit 1
    fi
    
    echo '=== Testing bcryptjs Loading ==='
    if node -e \"const bcryptjs = require('bcryptjs'); console.log('bcryptjs loaded successfully');\"; then
        echo 'OK: bcryptjs loads without errors'
    else
        echo 'ERROR: bcryptjs failed to load!'
        exit 1
    fi
    
    echo '=== Service Status ==='
    supervisorctl status ${PROJECT_NAME}_szene
    
    echo '=== Health Check ==='
    HEALTH_RESPONSE=\$(curl -s http://localhost:${PORT}/health)
    echo \"Health response: \$HEALTH_RESPONSE\"
    
    # Extract status from JSON response
    STATUS=\$(echo \"\$HEALTH_RESPONSE\" | grep -o '\"status\":\"[^\"]*\"' | cut -d'\"' -f4)
    if [ \"\$STATUS\" = \"OK\" ]; then
        echo 'OK: Health check passed'
    else
        echo 'ERROR: Health check failed'
        echo \"Status: \$STATUS\"
    fi
    
    echo '=== Database Connection ==='
    DB_STATUS=\$(echo \"\$HEALTH_RESPONSE\" | grep -o '\"database\":{[^}]*}' | grep -o '\"status\":\"[^\"]*\"' | cut -d'\"' -f4)
    if [ \"\$DB_STATUS\" = \"healthy\" ]; then
        echo 'OK: Database connection healthy'
    else
        echo 'WARNING: Database connection degraded'
        echo \"Database status: \$DB_STATUS\"
    fi
    
    echo '=== Recent Errors ==='
    echo 'Last 10 lines of error log:'
    supervisorctl tail ${PROJECT_NAME}_szene stderr | tail -10
    
    echo '=== Recent Logs ==='
    echo 'Last 10 lines of application log:'
    supervisorctl tail ${PROJECT_NAME}_szene | tail -10
    
    echo '=== File Permissions ==='
    ls -la .env
    ls -la public/uploads/ | head -5
    
    echo '=== Process Check ==='
    ps aux | grep 'node server/server.js' | grep -v grep || echo 'No Node.js processes found'
"

if [ $? -eq 0 ]; then
    log_success "✅ Deployment verification completed successfully!"
    log_info "🌐 Application should be accessible at: https://szene.slam25.de"
    log_info "🔐 Admin panel: https://szene.slam25.de/admin"
    log_info "❤️  Health check: https://szene.slam25.de/health"
else
    log_error "❌ Deployment verification failed!"
    log_info "Check the output above for specific error details"
    exit 1
fi
