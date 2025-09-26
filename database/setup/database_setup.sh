#!/bin/bash

# SLAM25 Database Setup Script
# This script sets up the PostgreSQL database for the SLAM25 application

set -e  # Exit on any error

# Configuration
DB_NAME="slam25_db"
DB_USER="slam_user"
DB_PASSWORD="slam25_secure_password_2025"
DB_HOST="localhost"
DB_PORT="5432"
BACKUP_DIR="/var/backups/slam25"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if PostgreSQL is running
check_postgres() {
    print_status "Checking PostgreSQL connection..."
    if pg_isready -h $DB_HOST -p $DB_PORT -U postgres; then
        print_success "PostgreSQL is running and accessible"
    else
        print_error "PostgreSQL is not running or not accessible"
        exit 1
    fi
}

# Function to create database user
create_user() {
    print_status "Creating database user..."
    
    # Check if user already exists
    if psql -h $DB_HOST -p $DB_PORT -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
        print_warning "User $DB_USER already exists"
    else
        psql -h $DB_HOST -p $DB_PORT -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
        print_success "User $DB_USER created successfully"
    fi
}

# Function to create database
create_database() {
    print_status "Creating database..."
    
    # Check if database already exists
    if psql -h $DB_HOST -p $DB_PORT -U postgres -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        print_warning "Database $DB_NAME already exists"
    else
        psql -h $DB_HOST -p $DB_PORT -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
        print_success "Database $DB_NAME created successfully"
    fi
}

# Function to grant permissions
grant_permissions() {
    print_status "Granting permissions..."
    
    psql -h $DB_HOST -p $DB_PORT -U postgres -d $DB_NAME -c "
        GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
        GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
        GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $DB_USER;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $DB_USER;
    "
    print_success "Permissions granted successfully"
}

# Function to run migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Create migrations table if it doesn't exist
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            migration_name VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    "
    
    # Run migration files in order
    for migration_file in ../migrations/*.sql; do
        if [ -f "$migration_file" ]; then
            migration_name=$(basename "$migration_file")
            print_status "Running migration: $migration_name"
            
            # Check if migration has already been applied
            if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT 1 FROM migrations WHERE migration_name='$migration_name'" | grep -q 1; then
                print_warning "Migration $migration_name already applied, skipping"
            else
                psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$migration_file"
                print_success "Migration $migration_name applied successfully"
            fi
        fi
    done
}

# Function to create backup directory
create_backup_dir() {
    print_status "Creating backup directory..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        sudo mkdir -p "$BACKUP_DIR"
        sudo chown postgres:postgres "$BACKUP_DIR"
        sudo chmod 755 "$BACKUP_DIR"
        print_success "Backup directory created: $BACKUP_DIR"
    else
        print_warning "Backup directory already exists: $BACKUP_DIR"
    fi
}

# Function to set up automated backups
setup_automated_backups() {
    print_status "Setting up automated backups..."
    
    # Create backup script
    cat > /tmp/slam25_backup.sh << 'EOF'
#!/bin/bash

# SLAM25 Automated Backup Script
DB_NAME="slam25_db"
DB_USER="slam_user"
BACKUP_DIR="/var/backups/slam25"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/slam25_auto_backup_$DATE.sql.gz"

# Create backup
pg_dump -h localhost -U $DB_USER -d $DB_NAME | gzip > "$BACKUP_FILE"

# Log backup
psql -h localhost -U $DB_USER -d $DB_NAME -c "
    SELECT log_backup_attempt(
        'automated',
        '$BACKUP_FILE',
        pg_size_pretty(pg_database_size('$DB_NAME')),
        'completed'
    );
"

# Clean up old backups (keep last 7 days)
find $BACKUP_DIR -name "slam25_auto_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
EOF

    # Make script executable
    chmod +x /tmp/slam25_backup.sh
    
    # Move to proper location
    sudo mv /tmp/slam25_backup.sh /usr/local/bin/slam25_backup.sh
    
    # Add to crontab (daily at 2 AM)
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/slam25_backup.sh") | crontab -
    
    print_success "Automated backups configured (daily at 2 AM)"
}

# Function to create environment file
create_env_file() {
    print_status "Creating environment configuration..."
    
    cat > ../../.env.database << EOF
# SLAM25 Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME

# Backup Configuration
BACKUP_DIR=$BACKUP_DIR
BACKUP_RETENTION_DAYS=30

# Security
ENCRYPTION_KEY=slam25_encryption_key_2025_secure_random_string
JWT_SECRET=slam25_jwt_secret_2025_secure_random_string

# Application Settings
NODE_ENV=production
PORT=3000
EOF

    print_success "Environment file created: ../../.env.database"
    print_warning "Please review and secure the .env.database file"
}

# Function to run health checks
run_health_checks() {
    print_status "Running database health checks..."
    
    # Check database connection
    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "Database connection successful"
    else
        print_error "Database connection failed"
        exit 1
    fi
    
    # Check tables exist
    table_count=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    print_success "Found $table_count tables in database"
    
    # Check sample data
    user_count=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM users;")
    participant_count=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM participants;")
    print_success "Sample data loaded: $user_count users, $participant_count participants"
}

# Function to display setup summary
display_summary() {
    echo
    echo "=========================================="
    echo "SLAM25 Database Setup Complete"
    echo "=========================================="
    echo
    echo "Database Information:"
    echo "  Name: $DB_NAME"
    echo "  User: $DB_USER"
    echo "  Host: $DB_HOST:$DB_PORT"
    echo
    echo "Backup Configuration:"
    echo "  Directory: $BACKUP_DIR"
    echo "  Automated: Daily at 2 AM"
    echo "  Retention: 7 days"
    echo
    echo "Next Steps:"
    echo "  1. Review the .env.database file"
    echo "  2. Update your application configuration"
    echo "  3. Test the database connection"
    echo "  4. Run the application"
    echo
    echo "Connection String:"
    echo "  postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
    echo
}

# Main execution
main() {
    echo "=========================================="
    echo "SLAM25 Database Setup Script"
    echo "=========================================="
    echo
    
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        print_error "Please do not run this script as root"
        exit 1
    fi
    
    # Check PostgreSQL installation
    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL client (psql) is not installed"
        print_status "Please install PostgreSQL client tools"
        exit 1
    fi
    
    # Run setup steps
    check_postgres
    create_user
    create_database
    grant_permissions
    run_migrations
    create_backup_dir
    setup_automated_backups
    create_env_file
    run_health_checks
    display_summary
    
    print_success "Database setup completed successfully!"
}

# Run main function
main "$@"
