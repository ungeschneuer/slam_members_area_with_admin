#!/bin/bash

# SLAM25 Deployment Verification Script
# Verifies that the deployment is working correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_section() {
    echo -e "${BLUE}[SECTION]${NC} $1"
}

# Configuration
UBERSPACE_USER="${UBERSPACE_USER:-}"
UBERSPACE_HOST="${UBERSPACE_HOST:-}"
PROJECT_DIR="~/slam25"

# Check requirements
if [ -z "$UBERSPACE_USER" ] || [ -z "$UBERSPACE_HOST" ]; then
    log_error "UBERSPACE_USER and UBERSPACE_HOST environment variables must be set"
    exit 1
fi

# Get port number
read -p "Enter the port number for verification: " PORT_NUMBER

log_section "SLAM25 Deployment Verification"
log_info "Verifying deployment on $UBERSPACE_HOST..."

# Run verification on Uberspace
ssh "$UBERSPACE_USER@$UBERSPACE_HOST" << EOF
    echo "=== Uberspace Deployment Verification ==="
    
    # Check if project directory exists
    if [ ! -d "$PROJECT_DIR" ]; then
        echo "❌ Project directory not found: $PROJECT_DIR"
        exit 1
    else
        echo "✅ Project directory exists"
    fi
    
    # Check if .env file exists and has correct permissions
    if [ -f "$PROJECT_DIR/.env" ]; then
        PERMS=\$(stat -c "%a" $PROJECT_DIR/.env)
        if [ "\$PERMS" = "600" ]; then
            echo "✅ .env file exists with secure permissions (600)"
        else
            echo "⚠️  .env file exists but permissions are \$PERMS (should be 600)"
        fi
    else
        echo "❌ .env file not found"
        exit 1
    fi
    
    # Check if dist directory exists
    if [ -d "$PROJECT_DIR/dist" ]; then
        echo "✅ Frontend build directory exists"
        echo "   Build files: \$(ls $PROJECT_DIR/dist/ | wc -l)"
    else
        echo "❌ Frontend build directory not found"
        exit 1
    fi
    
    # Check if uploads directory exists
    if [ -d "$PROJECT_DIR/public/uploads" ]; then
        echo "✅ Uploads directory exists"
        echo "   Upload files: \$(find $PROJECT_DIR/public/uploads -type f | wc -l)"
    else
        echo "⚠️  Uploads directory not found"
    fi
    
    # Check supervisord service status
    echo ""
    echo "=== Service Status ==="
    supervisorctl status slam25_szene
    
    # Check if service is running
    if supervisorctl status slam25_szene | grep -q "RUNNING"; then
        echo "✅ Service is running"
    else
        echo "❌ Service is not running"
        echo "Error logs:"
        supervisorctl tail slam25_szene stderr | tail -10
        exit 1
    fi
    
    # Check logs for errors
    echo ""
    echo "=== Recent Logs ==="
    echo "Application logs (last 10 lines):"
    tail -n 10 ~/logs/slam25_szene.log
    
    echo ""
    echo "Error logs (last 5 lines):"
    tail -n 5 ~/logs/slam25_szene_error.log
    
    # Test health endpoint
    echo ""
    echo "=== Health Check ==="
    if curl -f -s http://localhost:$PORT_NUMBER/health > /dev/null; then
        echo "✅ Health endpoint responding"
        curl -s http://localhost:$PORT_NUMBER/health | jq . 2>/dev/null || curl -s http://localhost:$PORT_NUMBER/health
    else
        echo "❌ Health endpoint not responding"
        echo "Trying to connect to port $PORT_NUMBER..."
        netstat -tulpn | grep $PORT_NUMBER || echo "Port $PORT_NUMBER not listening"
    fi
    
    # Test database connection
    echo ""
    echo "=== Database Check ==="
    if psql slam25_szene -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Database connection working"
        
        # Check table count
        TABLE_COUNT=\$(psql slam25_szene -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
        echo "   Tables: \$TABLE_COUNT"
        
        # Check participants count
        if psql slam25_szene -c "SELECT COUNT(*) FROM participants;" > /dev/null 2>&1; then
            PARTICIPANT_COUNT=\$(psql slam25_szene -t -c "SELECT COUNT(*) FROM participants;")
            echo "   Participants: \$PARTICIPANT_COUNT"
        fi
        
        # Check rounds count
        if psql slam25_szene -c "SELECT COUNT(*) FROM rounds;" > /dev/null 2>&1; then
            ROUND_COUNT=\$(psql slam25_szene -t -c "SELECT COUNT(*) FROM rounds;")
            echo "   Rounds: \$ROUND_COUNT"
        fi
        
    else
        echo "❌ Database connection failed"
    fi
    
    # Check file permissions
    echo ""
    echo "=== File Permissions ==="
    echo "Project directory permissions:"
    ls -la $PROJECT_DIR/ | head -5
    
    echo ""
    echo "Uploads directory permissions:"
    ls -la $PROJECT_DIR/public/uploads/ 2>/dev/null | head -5 || echo "No uploads directory"
    
    # Check disk space
    echo ""
    echo "=== System Resources ==="
    echo "Disk usage:"
    df -h ~ | tail -1
    
    echo ""
    echo "Memory usage:"
    free -h | head -2
    
    # Check Node.js version
    echo ""
    echo "=== Node.js Version ==="
    node -v
    npm -v
    
    echo ""
    echo "=== Verification Complete ==="
EOF

# Test external access
log_section "External Access Test"
log_info "Testing external access to https://szene.slam25.de..."

if curl -f -s https://szene.slam25.de/health > /dev/null; then
    log_info "✅ External health check successful"
    curl -s https://szene.slam25.de/health | jq . 2>/dev/null || curl -s https://szene.slam25.de/health
else
    log_warn "⚠️  External health check failed"
    log_info "This might be normal if DNS hasn't propagated yet"
fi

# Test admin endpoint
log_info "Testing admin endpoint..."
if curl -f -s https://szene.slam25.de/admin > /dev/null; then
    log_info "✅ Admin endpoint accessible"
else
    log_warn "⚠️  Admin endpoint not accessible"
fi

log_section "Verification Summary"
log_info "Deployment verification completed!"
log_info "Your application should be accessible at: https://szene.slam25.de"
log_info "Admin panel: https://szene.slam25.de/admin"
log_info "Health check: https://szene.slam25.de/health"

log_info ""
log_info "Next steps:"
log_info "1. Test the application in your browser"
log_info "2. Log in to the admin panel"
log_info "3. Verify all features work correctly"
log_info "4. Monitor logs for the first 24 hours"
log_info "5. Set up monitoring if needed"
