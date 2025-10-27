#!/bin/bash

# Verify Uberspace Port Binding
# This script checks that the Node.js server is correctly bound to 0.0.0.0 for Uberspace compatibility

set -e

# Configuration
PORT=${PORT:-47180}
PROJECT_NAME=${PROJECT_NAME:-slam25}

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

log_info "🔍 Verifying Uberspace port binding configuration..."

# Check if running on Uberspace
if [ -z "$UBERSPACE_USER" ]; then
    log_warning "Not running on Uberspace (UBERSPACE_USER not set)"
    log_info "This script is designed for Uberspace deployment verification"
    exit 0
fi

# Check if service is running
if ! supervisorctl status ${PROJECT_NAME}_szene >/dev/null 2>&1; then
    log_error "Service ${PROJECT_NAME}_szene is not running"
    exit 1
fi

# Check port binding
log_info "Checking port binding for port ${PORT}..."
BINDING=$(netstat -tlnp | grep ":${PORT} " | awk '{print $4}' | head -1)

if [ -z "$BINDING" ]; then
    log_error "No process found listening on port ${PORT}"
    exit 1
fi

log_info "Current binding: $BINDING"

# Verify correct binding
if [[ "$BINDING" == "0.0.0.0:${PORT}" ]]; then
    log_success "✅ Server correctly bound to 0.0.0.0:${PORT} (Uberspace compatible)"
    
    # Additional verification
    log_info "Testing application accessibility..."
    if curl -s -I https://szene.slam25.de/ | grep -q "HTTP/2 200"; then
        log_success "✅ Application accessible via domain"
    else
        log_warning "⚠️  Application not accessible via domain (may need time to propagate)"
    fi
    
    # Test health endpoint
    if curl -s http://localhost:${PORT}/health >/dev/null; then
        log_success "✅ Health endpoint responding"
    else
        log_warning "⚠️  Health endpoint not responding"
    fi
    
else
    log_error "❌ CRITICAL: Server not bound to 0.0.0.0:${PORT}"
    log_error "Current binding: $BINDING"
    log_error "This will cause 502 Bad Gateway errors on Uberspace!"
    log_error ""
    log_error "To fix this issue:"
    log_error "1. Check server/server.js line 316-317"
    log_error "2. Ensure bindAddress is set to '0.0.0.0' in production"
    log_error "3. Start the service: supervisorctl start ${PROJECT_NAME}_szene"
    exit 1
fi

log_success "🎉 Uberspace port binding verification passed!"
