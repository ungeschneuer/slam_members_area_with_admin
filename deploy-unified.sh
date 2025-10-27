#!/bin/bash

# SLAM25 Unified Deployment Script
# Follows project simplicity standards and security best practices
# Replaces both deploy.sh and clean-deploy.sh

set -uo pipefail  # Exit on undefined vars, pipe failures (handle errors manually)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Deployment logging
DEPLOYMENT_LOG="deployment.log"

# Logging functions
log_info() {
    local message="$1"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo -e "${BLUE}[INFO]${NC} $message"
    echo "$timestamp,INFO,$message" >> "$DEPLOYMENT_LOG"
}

log_success() {
    local message="$1"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo -e "${GREEN}[SUCCESS]${NC} $message"
    echo "$timestamp,SUCCESS,$message" >> "$DEPLOYMENT_LOG"
}

log_warning() {
    local message="$1"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo -e "${YELLOW}[WARNING]${NC} $message"
    echo "$timestamp,WARNING,$message" >> "$DEPLOYMENT_LOG"
}

log_error() {
    local message="$1"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo -e "${RED}[ERROR]${NC} $message"
    echo "$timestamp,ERROR,$message" >> "$DEPLOYMENT_LOG"
}

# Safe SSH command wrapper
safe_ssh_command() {
    local description="$1"
    local command="$2"
    local allow_failure="${3:-false}"
    
    log_info "Executing: $description"
    
    if ssh -o ConnectTimeout=30 -o ServerAliveInterval=10 \
        ${UBERSPACE_USER}@${UBERSPACE_HOST} "$command" 2>&1 | tee -a "$DEPLOYMENT_LOG"; then
        log_success "$description completed"
        return 0
    else
        local exit_code=$?
        if [ "$allow_failure" = "true" ]; then
            log_warning "$description failed but continuing (exit code: $exit_code)"
            return 0
        else
            log_error "$description failed (exit code: $exit_code)"
            return $exit_code
        fi
    fi
}

# Initialize deployment log
init_deployment_log() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "$timestamp,INFO,Deployment started - Mode: $DEPLOYMENT_MODE" > "$DEPLOYMENT_LOG"
    log_info "🚀 Deployment logging initialized"
}

# Configuration - Use environment variables for security
UBERSPACE_USER="${UBERSPACE_USER:-}"
UBERSPACE_HOST="${UBERSPACE_HOST:-}"
PROJECT_NAME="${PROJECT_NAME:-slam25}"
DOMAIN="${DOMAIN:-szene.slam25.de}"
PORT="${PORT:-47180}"
DEPLOYMENT_MODE="${DEPLOYMENT_MODE:-incremental}"  # clean, incremental

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log_error "Please run this script from the project root directory"
    exit 1
fi

# Load environment variables from .env.deployment if it exists
load_environment() {
    if [ -f ".env.deployment" ]; then
        log_info "📋 Loading environment from .env.deployment..."
        source .env.deployment
    else
        log_warning "⚠️  No .env.deployment file found"
        log_info "💡 Create .env.deployment from .env.deployment.template"
        log_info "   cp .env.deployment.template .env.deployment"
        log_info "   # Edit .env.deployment with your values"
    fi
}

# Validate required environment variables
validate_environment() {
    log_info "🔍 Validating environment variables..."
    
    local required_vars=("UBERSPACE_USER" "UBERSPACE_HOST" "DB_USER" "DB_PASSWORD")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "❌ Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            log_error "   • $var"
        done
        log_error "Please set these variables in .env.deployment or as environment variables"
        exit 1
    fi
    
    log_success "✅ Environment validation passed"
}

# Pre-deployment validation
validate_prerequisites() {
    log_info "📋 Pre-deployment validation..."
    
    # Check if database backup exists
    if [ ! -f "slam25_backup.sql" ]; then
        log_warning "⚠️  Database backup not found. Checking if data exists on server..."
        
        # Check if data already exists on server
        local server_has_data=false
        if ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "psql slam25_szene -t -c 'SELECT COUNT(*) FROM participants;' 2>/dev/null | grep -q '[1-9]'"; then
            server_has_data=true
        fi
        
        if [ "$server_has_data" = true ]; then
            log_success "✅ Server already has data, skipping database backup requirement"
        else
            log_error "❌ No database backup found and server has no data. Please run 'npm run export-db' first"
            exit 1
        fi
    else
        log_success "✅ Database backup found"
    fi
    
    # Check if uploads backup exists
    if [ ! -f "uploads_backup.tar.gz" ]; then
        log_warning "⚠️  Uploads backup not found. Checking if uploads exist on server..."
        
        # Check if uploads already exist on server
        local server_has_uploads=false
        if ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "[ -d ~/${PROJECT_NAME}/public/uploads ] && [ \"\$(ls -A ~/${PROJECT_NAME}/public/uploads 2>/dev/null)\" ]"; then
            server_has_uploads=true
        fi
        
        if [ "$server_has_uploads" = true ]; then
            log_success "✅ Server already has uploads, skipping uploads backup requirement"
        else
            log_warning "⚠️  No uploads backup found and server has no uploads. Uploads will be empty."
        fi
    else
        log_success "✅ Uploads backup found"
    fi
    
    log_success "✅ Pre-deployment validation passed"
}

# Build frontend locally
build_frontend() {
    log_info "🏗️  Building frontend locally..."
    
    if ! npm run build; then
        log_error "Local build failed"
        exit 1
    fi
    
    # Validate local build output
    if [ ! -d "dist" ] || [ -z "$(ls -A dist 2>/dev/null)" ]; then
        log_error "Local build failed - dist directory is empty or missing"
        exit 1
    fi
    
    log_success "✅ Frontend built successfully"
}

# Handle database and migrations
handle_database_and_migrations() {
    log_info "📊 Handling database and migrations..."
    
    # Check if database has data
    safe_ssh_command "Check database state" \
        "cd ~/${PROJECT_NAME} && PARTICIPANT_COUNT=\$(psql slam25_szene -t -c 'SELECT COUNT(*) FROM participants;' 2>/dev/null || echo '0') && echo \"Database has \$PARTICIPANT_COUNT participants\"" \
        "true"
    
    # Determine database state
    local db_has_data=false
    local backup_exists=false
    
    if ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "cd ~/${PROJECT_NAME} && PARTICIPANT_COUNT=\$(psql slam25_szene -t -c 'SELECT COUNT(*) FROM participants;' 2>/dev/null || echo '0') && [ \"\$PARTICIPANT_COUNT\" -gt 0 ]"; then
        db_has_data=true
    fi
    
    if ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "[ -f ~/${PROJECT_NAME}/slam25_backup.sql ]"; then
        backup_exists=true
    fi
    
    # Handle three scenarios
    if [ "$db_has_data" = true ]; then
        # Scenario 1: Database has data - run new migrations only
        log_info "📊 Database has data - running new migrations only"
        if ! safe_ssh_command "Run new migrations" \
            "cd ~/${PROJECT_NAME} && ./scripts/run-migrations.sh" \
            "false"; then
            log_error "❌ Migrations failed - initiating deployment rollback"
            rollback_deployment
            exit 1
        fi
        
    elif [ "$backup_exists" = true ]; then
        # Scenario 2: Database empty + backup exists - import and register migrations
        log_info "📊 Database empty, importing backup and registering migrations"
        
        if ! safe_ssh_command "Import database backup" \
            "cd ~/${PROJECT_NAME} && psql slam25_szene < slam25_backup.sql && rm -f slam25_backup.sql" \
            "false"; then
            log_error "❌ Database import failed - initiating deployment rollback"
            rollback_deployment
            exit 1
        fi
        
        if ! safe_ssh_command "Register existing migrations" \
            "cd ~/${PROJECT_NAME} && ./scripts/run-migrations.sh --register-only" \
            "false"; then
            log_error "❌ Migration registration failed - initiating deployment rollback"
            rollback_deployment
            exit 1
        fi
        
    else
        # Scenario 3: Database empty + no backup - fail deployment
        log_error "❌ Database is empty and no backup found"
        log_error "Please run 'npm run export-db' locally first"
        exit 1
    fi
    
    log_success "✅ Database and migrations handled successfully"
}

# Create deployment backup
create_backup() {
    log_info "💾 Creating backup of current deployment..."
    
    ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "
        if [ -d ~/${PROJECT_NAME} ]; then
            mv ~/${PROJECT_NAME} ~/${PROJECT_NAME}_backup_\$(date +%Y%m%d_%H%M%S)
            echo 'Deployment backup created'
        else
            echo 'No existing deployment to backup'
        fi
    " || log_warning "No existing deployment to backup"
}

# Upload project files
upload_files() {
    log_info "📤 Uploading project files..."
    
    # Upload project files (excluding sensitive files)
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'logs' \
        --exclude '*.log' \
        --exclude '.env' \
        --exclude 'public/uploads' \
        --exclude 'dist' \
        --exclude 'slam25_backup.sql' \
        --exclude 'uploads_backup.tar.gz' \
        ./ ${UBERSPACE_USER}@${UBERSPACE_HOST}:~/${PROJECT_NAME}/
    
    # Upload database backup (if exists)
    if [ -f "slam25_backup.sql" ]; then
        log_info "📤 Uploading database backup..."
        scp slam25_backup.sql ${UBERSPACE_USER}@${UBERSPACE_HOST}:~/${PROJECT_NAME}/
    else
        log_info "📤 Skipping database backup upload (not found)"
    fi
    
    # Upload uploads backup (if exists)
    if [ -f "uploads_backup.tar.gz" ]; then
        log_info "📤 Uploading uploads backup..."
        scp uploads_backup.tar.gz ${UBERSPACE_USER}@${UBERSPACE_HOST}:~/${PROJECT_NAME}/
    else
        log_info "📤 Skipping uploads backup upload (not found)"
    fi
    
    log_success "✅ Files uploaded successfully"
}

# Deploy on Uberspace
deploy_on_uberspace() {
    log_info "🔧 Deploying on Uberspace..."
    
    # Stop service first
    log_info "🛑 Stopping service..."
    ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "supervisorctl stop ${PROJECT_NAME}_szene 2>/dev/null || echo 'Service was not running (this is OK)'"
    
    # Wait for graceful shutdown
    sleep 3
    
    # Kill any lingering processes
    safe_ssh_command "Kill lingering processes" \
        "pgrep -f 'node server/server.js' && pkill -f 'node server/server.js' && sleep 2 || echo 'No processes to kill'" \
        "true"
    
    # Clean up if in clean mode
    if [ "${DEPLOYMENT_MODE}" = "clean" ]; then
        safe_ssh_command "Cleanup node_modules and logs" \
            "cd ~/${PROJECT_NAME} && rm -rf node_modules package-lock.json logs" \
            "false"
    fi
    
    # Install dependencies with retry logic and memory optimization
    log_info "📦 Installing dependencies..."
    
    # Use different strategies based on deployment mode
    if [ "${DEPLOYMENT_MODE}" = "clean" ]; then
        # Clean mode: full npm install with memory optimization
        log_info "🧹 Clean mode: Full dependency installation"
        for attempt in {1..3}; do
            if safe_ssh_command "npm install (attempt $attempt)" \
                "cd ~/${PROJECT_NAME} && npm install --ignore-scripts --no-audit --no-fund" \
                "false"; then
                break
            elif [ $attempt -eq 3 ]; then
                log_error "npm install failed after 3 attempts - trying incremental approach"
                # Fallback to incremental approach
                if safe_ssh_command "npm ci fallback" \
                    "cd ~/${PROJECT_NAME} && npm ci --only=production --ignore-scripts" \
                    "false"; then
                    log_success "✅ Fallback to npm ci succeeded"
                    break
                else
                    log_error "❌ Both npm install and npm ci failed"
                    rollback_deployment
                    exit 1
                fi
            else
                log_warning "npm install failed, retrying in 5 seconds..."
                sleep 5
            fi
        done
    else
        # Incremental mode: use npm ci for faster, more reliable installs
        log_info "🔄 Incremental mode: Using npm ci for production dependencies"
        for attempt in {1..3}; do
            if safe_ssh_command "npm ci (attempt $attempt)" \
                "cd ~/${PROJECT_NAME} && npm ci --only=production --ignore-scripts" \
                "false"; then
                break
            elif [ $attempt -eq 3 ]; then
                log_error "npm ci failed after 3 attempts"
                rollback_deployment
                exit 1
            else
                log_warning "npm ci failed, retrying in 5 seconds..."
                sleep 5
            fi
        done
    fi
    
    
    # Verify dependencies
    safe_ssh_command "Verify dependencies" \
        "cd ~/${PROJECT_NAME} && [ -d node_modules/bcryptjs ] && echo 'Dependencies verified: bcryptjs present'" \
        "false"
    
    # Create production .env file
    safe_ssh_command "Create production .env file" \
        "cd ~/${PROJECT_NAME} && cat > .env << 'ENVEOF'
NODE_ENV=production
APP_TIMEZONE=Europe/Berlin

# Server Configuration
PORT=${PORT}

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=slam25_szene
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# Database Connection Pooling (Uberspace optimized)
DB_MAX_CONNECTIONS=2
DB_MIN_CONNECTIONS=1
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000

# Security - Generated secure secrets
JWT_SECRET=\$(openssl rand -base64 48 | tr -d '\n')
JWT_REFRESH_SECRET=\$(openssl rand -base64 48 | tr -d '\n')
JWT_EXPIRES_IN=24h
SESSION_SECRET=\$(openssl rand -base64 48 | tr -d '\n')

# Frontend Configuration
FRONTEND_URL=https://${DOMAIN}
VITE_API_URL=https://${DOMAIN}/api

# Logging
LOG_LEVEL=info
LOG_SENSITIVE_DATA=false

# Monitoring
MONITORING_ENABLED=true
ENVEOF
        chmod 600 .env && echo 'Production .env file created'" \
        "false"
    
    # Handle uploads
    safe_ssh_command "Handle uploads" \
        "cd ~/${PROJECT_NAME} && if [ -f uploads_backup.tar.gz ]; then if [ ! -d public/uploads ] || [ -z \"\$(ls -A public/uploads 2>/dev/null)\" ]; then tar -xzf uploads_backup.tar.gz && echo 'Uploads extracted'; else echo 'Uploads exist, skipping'; fi; rm -f uploads_backup.tar.gz; else mkdir -p public/uploads && echo 'Empty uploads created'; fi" \
        "true"
    
    # Handle database and migrations
    handle_database_and_migrations
    
    # Configure supervisord
    safe_ssh_command "Configure supervisord" \
        "if [ -f ~/etc/services.d/${PROJECT_NAME}_szene.ini ] && grep -q 'command=node server/server.js' ~/etc/services.d/${PROJECT_NAME}_szene.ini; then echo 'Supervisord config up to date'; else cat > ~/etc/services.d/${PROJECT_NAME}_szene.ini << 'SUPEOF'
[program:${PROJECT_NAME}_szene]
command=node server/server.js
directory=%(ENV_HOME)s/${PROJECT_NAME}
autostart=true
autorestart=true
stderr_logfile=%(ENV_HOME)s/logs/${PROJECT_NAME}_error.log
stdout_logfile=%(ENV_HOME)s/logs/${PROJECT_NAME}.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=10
user=%(ENV_USER)s
environment=NODE_ENV=production
SUPEOF
echo 'Supervisord configuration created/updated'; fi" \
        "false"
    
    # Simple service restart
    safe_ssh_command "Restart service" \
        "supervisorctl stop ${PROJECT_NAME}_szene || true && sleep 3 && supervisorctl start ${PROJECT_NAME}_szene && echo 'Service restarted'" \
        "false"
    
# Wait for service to fully initialize with progress indicator
wait_for_service_startup() {
    log_info "🚀 Starting service and waiting for initialization..."
    
    local max_wait_time=60  # Maximum wait time in seconds
    local check_interval=2  # Check every 2 seconds
    local elapsed=0
    local spinner_chars=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
    local spinner_index=0
    
    echo -n "   "
    
    while [ $elapsed -lt $max_wait_time ]; do
        # Show animated spinner
        printf "\r   ${spinner_chars[$spinner_index]} Waiting for supervisor service to start... (${elapsed}s)"
        spinner_index=$(( (spinner_index + 1) % ${#spinner_chars[@]} ))
        
        # Check if service is running
        if ssh -o ConnectTimeout=5 ${UBERSPACE_USER}@${UBERSPACE_HOST} \
            "supervisorctl status ${PROJECT_NAME}_szene 2>/dev/null | grep -q 'RUNNING'" 2>/dev/null; then
            printf "\r   ✅ Service is running! Checking port binding...\n"
            
            # Additional check for port binding
            local port_check_attempts=0
            while [ $port_check_attempts -lt 10 ]; do
                if ssh -o ConnectTimeout=5 ${UBERSPACE_USER}@${UBERSPACE_HOST} \
                    "netstat -tlnp 2>/dev/null | grep -q ':${PORT} '" 2>/dev/null; then
                    printf "   ✅ Port ${PORT} is bound and listening\n"
                    log_success "Service startup completed successfully"
                    return 0
                fi
                
                printf "\r   🔍 Checking port binding... (attempt $((port_check_attempts + 1))/10)"
                sleep 1
                ((port_check_attempts++))
            done
            
            printf "\n   ⚠️  Service running but port not yet bound\n"
            log_warning "Service is running but port binding may need more time"
            return 0
        fi
        
        sleep $check_interval
        elapsed=$((elapsed + check_interval))
    done
    
    printf "\r   ❌ Service failed to start within ${max_wait_time} seconds\n"
    log_error "Service startup timeout - checking supervisor status"
    
    # Show supervisor status for debugging
    ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "supervisorctl status ${PROJECT_NAME}_szene" 2>&1 | tee -a "$DEPLOYMENT_LOG"
    return 1
}

    # Wait for service to fully initialize with progress indicator
    wait_for_service_startup
    
    # Additional verification (redundant but safe)
    safe_ssh_command "Final port binding verification" \
        "BINDING=\$(netstat -tlnp | grep ${PORT} | awk '{print \$4}') && if [[ \"\$BINDING\" == \"0.0.0.0:${PORT}\" ]]; then echo 'Server correctly bound to 0.0.0.0'; else echo 'ERROR: Server not bound to 0.0.0.0. Binding: '\$BINDING; exit 1; fi" \
        "false"
    
    # Simple health check
    safe_ssh_command "Health check" \
        "curl -s -f http://localhost:${PORT}/health > /dev/null && echo 'Health check passed' || (echo 'Health check failed' && exit 1)" \
        "false"
}

# Rollback deployment on failure
rollback_deployment() {
    log_info "🔄 Attempting rollback..."
    
    ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "
        BACKUP_DIR=\$(ls -d ~/${PROJECT_NAME}_backup_* 2>/dev/null | head -1)
        if [ -n \"\$BACKUP_DIR\" ] && [ -d \"\$BACKUP_DIR\" ]; then
            echo 'Rolling back to previous deployment: '\$BACKUP_DIR
            rm -rf ~/${PROJECT_NAME}
            mv \"\$BACKUP_DIR\" ~/${PROJECT_NAME}
            echo 'Starting rollback service...'
            supervisorctl start ${PROJECT_NAME}_szene
            echo 'Rollback service started - waiting for initialization...'
        else
            echo 'No backup found for rollback'
        fi
    " || log_warning "Rollback failed"
    
    # Wait for rollback service to start with visual feedback
    if ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "supervisorctl status ${PROJECT_NAME}_szene 2>/dev/null | grep -q 'RUNNING'" 2>/dev/null; then
        log_success "✅ Rollback service is running"
    else
        log_warning "⚠️  Rollback service may need more time to start"
    fi
}

# Enhanced service status check with visual feedback
check_service_status() {
    log_info "📊 Checking service status..."
    
    local status_output
    status_output=$(ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "supervisorctl status ${PROJECT_NAME}_szene 2>/dev/null" 2>/dev/null)
    
    if echo "$status_output" | grep -q "RUNNING"; then
        log_success "✅ Service is RUNNING"
        return 0
    elif echo "$status_output" | grep -q "STARTING"; then
        log_warning "🔄 Service is STARTING - this is normal during deployment"
        return 0
    elif echo "$status_output" | grep -q "STOPPED"; then
        log_error "❌ Service is STOPPED"
        return 1
    elif echo "$status_output" | grep -q "FATAL"; then
        log_error "❌ Service has FATAL error"
        return 1
    else
        log_warning "⚠️  Service status unknown: $status_output"
        return 1
    fi
}

# Health monitoring with retries
monitor_health() {
    local max_attempts=10
    local attempt=1
    local endpoint="$1"
    local description="$2"
    
    log_info "🔍 Monitoring $description..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$endpoint" > /dev/null; then
            log_success "✅ $description - Health check passed"
            return 0
        fi
        
        log_warning "⚠️  $description - Health check attempt $attempt failed, retrying..."
        sleep 5
        ((attempt++))
    done
    
    log_error "❌ $description - Health check failed after $max_attempts attempts"
    return 1
}

# Post-deployment verification
verify_deployment() {
    log_info "🔍 Post-deployment verification..."
    
    # Monitor server health endpoint
    monitor_health "https://${DOMAIN}/health" "Server health endpoint"
    
    # Monitor domain access with retries
    log_info "🌐 Testing domain access..."
    if monitor_health "https://${DOMAIN}/health" "Domain health endpoint"; then
        log_success "✅ Domain accessible at https://${DOMAIN}"
    else
        log_warning "⚠️  Domain not yet accessible (DNS propagation may take time)"
    fi
    
    # Test admin access
    log_info "🔐 Testing admin access..."
    if monitor_health "https://${DOMAIN}/admin" "Admin panel"; then
        log_success "✅ Admin panel accessible"
    else
        log_warning "⚠️  Admin panel not accessible"
    fi
    
    # Final status check
    log_info "📊 Final status check..."
    check_service_status
    
    ssh ${UBERSPACE_USER}@${UBERSPACE_HOST} "
        echo 'Port binding verification:'
        BINDING=\$(netstat -tlnp | grep ${PORT} | awk '{print \$4}')
        if [[ \"\$BINDING\" == \"0.0.0.0:${PORT}\" ]]; then
            echo '✅ Server correctly bound to 0.0.0.0 (Uberspace compatible)'
        else
            echo '❌ WARNING: Server binding issue. Binding: '\$BINDING
        fi
        
        echo 'Health check:'
        curl -s http://localhost:${PORT}/health | head -1
        
        echo 'Database connection:'
        psql slam25_szene -c 'SELECT COUNT(*) FROM participants;' | tail -1
    "
}

# Cleanup local files
cleanup_local() {
    log_info "🧹 Cleaning up local files..."
    
    # Remove backup files (if they exist)
    if [ -f "slam25_backup.sql" ]; then
        rm -f slam25_backup.sql
        log_info "🗑️  Removed database backup"
    fi
    
    if [ -f "uploads_backup.tar.gz" ]; then
        rm -f uploads_backup.tar.gz
        log_info "🗑️  Removed uploads backup"
    fi
    
    log_success "✅ Local cleanup complete"
}

# Main deployment function
main() {
    # Initialize deployment logging
    init_deployment_log
    
    log_info "🚀 Starting SLAM25 deployment to Uberspace..."
    log_info "📋 Deployment mode: ${DEPLOYMENT_MODE}"
    
    # Load and validate environment
    load_environment
    validate_environment
    
    # Pre-deployment validation
    validate_prerequisites
    
    # Build frontend locally
    build_frontend
    
    # Create backup
    create_backup
    
    # Upload files
    upload_files
    
    # Deploy on Uberspace
    deploy_on_uberspace
    
    # Verify deployment
    verify_deployment
    
    # Cleanup
    cleanup_local
    
    log_success "🎉 Deployment completed successfully!"
    log_info "📋 Deployment Summary:"
    log_info "   • Domain: https://${DOMAIN}"
    log_info "   • Admin: https://${DOMAIN}/admin"
    log_info "   • Health: https://${DOMAIN}/health"
    log_info "   • Service: ${PROJECT_NAME}_szene"
    log_info "   • Port: ${PORT}"
    log_info "   • Mode: ${DEPLOYMENT_MODE}"
}

# Help function
show_help() {
    echo "SLAM25 Unified Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --clean          Clean deployment - removes all files and reinstalls"
    echo "  --incremental    Incremental deployment (default) - preserves existing files"
    echo "  --help, -h       Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  UBERSPACE_USER       Your Uberspace username"
    echo "  UBERSPACE_HOST       Your Uberspace host"
    echo "  DB_USER              Database username"
    echo "  DB_PASSWORD          Database password"
    echo "  PROJECT_NAME         Project name (default: slam25)"
    echo "  DOMAIN               Domain name (default: szene.slam25.de)"
    echo "  PORT                 Port number (default: 47180)"
    echo ""
    echo "Examples:"
    echo "  $0                   # Incremental deployment (default)"
    echo "  $0 --incremental    # Incremental deployment"
    echo "  $0 --clean          # Clean deployment"
    echo ""
    echo "Prerequisites:"
    echo "  • Run 'npm run export-db' to create database backup"
    echo "  • Run 'npm run package-uploads' to create uploads backup"
    echo "  • Create .env.deployment from .env.deployment.template"
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --clean)
        DEPLOYMENT_MODE="clean"
        ;;
    --incremental)
        DEPLOYMENT_MODE="incremental"
        ;;
    "")
        DEPLOYMENT_MODE="incremental"
        ;;
    *)
        log_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac

# Run main function
main "$@"
