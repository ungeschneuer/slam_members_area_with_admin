# SLAM25 Database Documentation

## Overview

This directory contains the complete database infrastructure for the SLAM25 Poetry Slam application. The database is built using PostgreSQL with a comprehensive schema designed for scalability, security, and maintainability.

## Database Architecture

### Core Tables

| Table | Description | Key Features |
|-------|-------------|--------------|
| `users` | User accounts and authentication | Role-based access, email verification |
| `user_sessions` | Session management | Secure tokens, activity tracking |
| `competitions` | Poetry slam competitions | Event management, registration deadlines |
| `participants` | Competition participants | Regional tracking, status management |
| `rounds` | Competition rounds | Round types, scoring configuration |
| `round_participants` | Participant-round relationships | Order management, scoring |
| `content` | News and announcements | Content versioning, publishing workflow |
| `content_versions` | Content version history | Full audit trail |
| `events` | Timetable and scheduling | Event types, capacity management |
| `city_tips` | Local recommendations | Geolocation, categories |
| `analytics` | Usage tracking | Page visits, session data |
| `audit_log` | Change tracking | Full audit trail for critical tables |

### Key Features

- **UUID Primary Keys**: All tables use UUIDs for better distribution and security
- **Audit Trail**: Comprehensive logging of all data changes
- **Data Validation**: Built-in constraints and validation functions
- **Performance Indexes**: Optimized for common query patterns
- **Session Management**: Secure session handling with automatic cleanup
- **Content Versioning**: Full version history for content management

## Setup Instructions

### Prerequisites

1. **PostgreSQL 12+** installed and running
2. **PostgreSQL client tools** (psql, pg_dump, etc.)
3. **Bash shell** for setup scripts
4. **Sudo access** for backup directory creation

### Quick Setup

1. **Clone the repository** and navigate to the database directory:
   ```bash
   cd database/setup
   ```

2. **Make the setup script executable**:
   ```bash
   chmod +x database_setup.sh
   ```

3. **Run the setup script**:
   ```bash
   ./database_setup.sh
   ```

The script will:
- Create database user and database
- Grant necessary permissions
- Run all migrations
- Set up automated backups
- Create environment configuration
- Run health checks

### Manual Setup

If you prefer manual setup:

1. **Create database user**:
   ```sql
   CREATE USER slam_user WITH PASSWORD 'slam25_secure_password_2025';
   ```

2. **Create database**:
   ```sql
   CREATE DATABASE slam25_db OWNER slam_user;
   ```

3. **Run migrations**:
   ```bash
   psql -U slam_user -d slam25_db -f migrations/001_initial_schema.sql
   psql -U slam_user -d slam25_db -f migrations/002_sample_data.sql
   ```

4. **Set up backup procedures**:
   ```bash
   psql -U slam_user -d slam25_db -f backup/backup_procedures.sql
   ```

## Database Schema

### Users and Authentication

```sql
-- User roles: admin, member, participant, judge
CREATE TYPE user_role AS ENUM ('admin', 'member', 'participant', 'judge');

-- Users table with comprehensive profile data
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    pronouns VARCHAR(50),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false
);
```

### Competition Management

```sql
-- Competition structure with rounds and participants
CREATE TABLE competitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    location VARCHAR(255),
    max_participants INTEGER DEFAULT 50,
    registration_deadline DATE,
    is_active BOOLEAN DEFAULT true
);

-- Round types: qualifying, semi_final, final
CREATE TYPE round_type AS ENUM ('qualifying', 'semi_final', 'final');

CREATE TABLE rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES competitions(id),
    name VARCHAR(255) NOT NULL,
    round_type round_type NOT NULL,
    round_number INTEGER NOT NULL,
    max_participants INTEGER,
    max_points INTEGER DEFAULT 10,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE
);
```

### Content Management

```sql
-- Content types: news, fun, announcement
CREATE TYPE content_type AS ENUM ('news', 'fun', 'announcement');

CREATE TABLE content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content_type content_type NOT NULL,
    content TEXT NOT NULL,
    -- author_id UUID REFERENCES users(id), -- Removed: No author tracking needed
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Version history for content
CREATE TABLE content_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Backup and Recovery

### Automated Backups

The setup script configures automated daily backups at 2 AM:

- **Location**: `/var/backups/slam25/`
- **Format**: Compressed SQL dumps
- **Retention**: 7 days
- **Logging**: All backups logged in `backup_history` table

### Manual Backup Commands

```bash
# Full backup
pg_dump -h localhost -U slam_user -d slam25_db -f backup.sql

# Compressed backup
pg_dump -h localhost -U slam_user -d slam25_db | gzip > backup.sql.gz

# Schema-only backup
pg_dump -h localhost -U slam_user -d slam25_db --schema-only -f schema.sql

# Data-only backup
pg_dump -h localhost -U slam_user -d slam25_db --data-only -f data.sql
```

### Recovery Procedures

```bash
# Restore from full backup
psql -h localhost -U slam_user -d slam25_db -f backup.sql

# Restore from compressed backup
gunzip -c backup.sql.gz | psql -h localhost -U slam_user -d slam25_db
```

## Data Validation

### Built-in Constraints

- **Email validation**: Regex pattern for valid email addresses
- **Phone validation**: German phone number format
- **Coordinate validation**: Latitude/longitude bounds checking
- **Date validation**: Logical date ranges
- **Numeric validation**: Positive values where appropriate

### Validation Functions

```sql
-- Email validation
SELECT validate_email('test@example.com');

-- Phone validation (German format)
SELECT validate_phone('+49 371 123456');

-- Coordinate validation
SELECT validate_coordinates(50.8278, 12.9244);
```

## Security Features

### Authentication

- **Password hashing**: Using bcrypt with salt
- **Session management**: Secure tokens with expiration
- **Role-based access**: Granular permissions
- **Audit logging**: Complete change tracking

### Data Protection

- **Encryption functions**: For sensitive data
- **Input validation**: SQL injection prevention
- **Access control**: Row-level security considerations

## Performance Optimization

### Indexes

- **Primary keys**: UUID-based with good distribution
- **Foreign keys**: Indexed for join performance
- **Common queries**: Optimized for typical access patterns
- **Full-text search**: For content searching

### Views

```sql
-- Active competitions
CREATE VIEW active_competitions AS
SELECT * FROM competitions 
WHERE is_active = true AND end_date >= CURRENT_DATE;

-- Participant rounds with details
CREATE VIEW participant_rounds AS
SELECT 
    p.id as participant_id,
    p.first_name,
    p.last_name,
    r.id as round_id,
    r.name as round_name,
    r.round_type,
    rp.display_order,
    rp.points,
    rp.is_winner
FROM participants p
JOIN round_participants rp ON p.id = rp.participant_id
JOIN rounds r ON rp.round_id = r.id
WHERE p.status = 'confirmed';
```

## Maintenance

### Regular Maintenance

```sql
-- Run database maintenance
SELECT maintain_database();

-- Check database health
SELECT * FROM check_database_health();

-- Clean up expired sessions
SELECT cleanup_expired_sessions();
```

### Monitoring

The database includes comprehensive monitoring:

- **Health checks**: Database size, session counts, audit log size
- **Performance metrics**: Query execution times, index usage
- **Error tracking**: Failed operations and constraint violations

## Troubleshooting

### Common Issues

1. **Connection refused**:
   - Check PostgreSQL service status
   - Verify connection parameters
   - Check firewall settings

2. **Permission denied**:
   - Verify user permissions
   - Check database ownership
   - Review pg_hba.conf configuration

3. **Migration errors**:
   - Check migration order
   - Verify dependencies
   - Review error logs

### Logs and Debugging

```sql
-- Check recent audit entries
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10;

-- Check backup history
SELECT * FROM backup_history ORDER BY created_at DESC;

-- Check database size
SELECT pg_size_pretty(pg_database_size('slam25_db'));
```

## Environment Configuration

The setup script creates a `.env.database` file with:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=slam25_db
DB_USER=slam_user
DB_PASSWORD=slam25_secure_password_2025
DB_URL=postgresql://slam_user:slam25_secure_password_2025@localhost:5432/slam25_db

# Backup Configuration
BACKUP_DIR=/var/backups/slam25
BACKUP_RETENTION_DAYS=30

# Security
ENCRYPTION_KEY=slam25_encryption_key_2025_secure_random_string
JWT_SECRET=slam25_jwt_secret_2025_secure_random_string
```

## Sample Data

The database includes comprehensive sample data:

- **Users**: Admin, judges, participants, members
- **Competition**: SLAM25 Chemnitz event
- **Participants**: 10 sample poets from different regions
- **Rounds**: Qualifying, semi-final, and final rounds
- **Content**: News and announcements
- **Events**: Complete timetable for the event
- **City Tips**: Chemnitz locations and recommendations

## API Integration

The database schema is designed for easy API integration:

- **RESTful endpoints**: Natural mapping to table structure
- **JSON support**: Native JSONB for flexible data
- **Pagination**: Efficient offset/limit queries
- **Filtering**: Comprehensive WHERE clause support
- **Sorting**: Indexed columns for fast ordering

## Future Enhancements

Planned improvements:

- **Full-text search**: Enhanced content searching
- **Real-time notifications**: WebSocket integration
- **Advanced analytics**: User behavior tracking
- **Multi-tenancy**: Support for multiple competitions
- **API rate limiting**: Request throttling
- **Data archiving**: Long-term storage strategies

## Support

For database-related issues:

1. Check the troubleshooting section
2. Review the audit logs
3. Run health checks
4. Consult the PostgreSQL documentation
5. Contact the development team

## License

This database schema and documentation is part of the SLAM25 project and follows the same licensing terms.
