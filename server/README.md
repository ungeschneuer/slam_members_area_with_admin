# SLAM25 API Server

This is the backend API server for the SLAM25 Poetry Slam application, built with Express.js and PostgreSQL.

## Features

- **RESTful API**: Complete CRUD operations for all entities
- **Database Integration**: PostgreSQL with connection pooling
- **Security**: JWT authentication, rate limiting, CORS protection
- **Health Monitoring**: Comprehensive health checks and metrics
- **Backup & Recovery**: Automated backup procedures
- **Audit Logging**: Complete audit trail for data changes
- **Performance**: Connection pooling, compression, caching

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

## Installation

1. **Clone the repository** and navigate to the server directory:
   ```bash
   cd server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**:
   ```bash
   # Run the database setup script from the database directory
   cd ../database/setup
   ./database_setup.sh
   ```

5. **Start the server**:
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## Environment Configuration

Create a `.env` file with the following variables:

```bash
# Server Configuration
PORT=3005
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=slam25_db
DB_USER=slam_user
DB_PASSWORD=slam25_secure_password_2025

# Security
JWT_SECRET=your-secure-jwt-secret
ENCRYPTION_KEY=your-secure-encryption-key

# Backup Configuration
BACKUP_DIR=/var/backups/slam25
BACKUP_RETENTION_DAYS=30
```

## API Endpoints

### Health Checks
- `GET /health` - Basic health check
- `GET /api/health` - Detailed health check
- `GET /api/health/ready` - Readiness check
- `GET /api/health/live` - Liveness check

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- ~~`POST /api/auth/refresh` - Refresh token~~ (Removed - using simple JWT)

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Sessions
- `GET /api/sessions/:token` - Get session
- `POST /api/sessions` - Create session
- `PUT /api/sessions/:token` - Update session
- `DELETE /api/sessions/:token` - Delete session
- `POST /api/sessions/cleanup` - Clean up expired sessions

### Competitions
- `GET /api/competitions` - Get all competitions
- `GET /api/competitions/:id` - Get competition by ID
- `POST /api/competitions` - Create competition
- `PUT /api/competitions/:id` - Update competition
- `DELETE /api/competitions/:id` - Delete competition

### Participants
- `GET /api/participants` - Get all participants
- `GET /api/participants/:id` - Get participant by ID
- `POST /api/participants` - Create participant
- `PUT /api/participants/:id` - Update participant
- `DELETE /api/participants/:id` - Delete participant

### Rounds
- `GET /api/rounds` - Get all rounds
- `GET /api/rounds/:id` - Get round by ID
- `POST /api/rounds` - Create round
- `PUT /api/rounds/:id` - Update round
- `DELETE /api/rounds/:id` - Delete round

### Content
- `GET /api/content` - Get all content
- `GET /api/content/:id` - Get content by ID
- `POST /api/content` - Create content
- `PUT /api/content/:id` - Update content
- `DELETE /api/content/:id` - Delete content
- `POST /api/content/:id/publish` - Publish content

### Events
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### City Tips
- `GET /api/city-tips` - Get all city tips
- `GET /api/city-tips/:id` - Get city tip by ID
- `POST /api/city-tips` - Create city tip
- `PUT /api/city-tips/:id` - Update city tip
- `DELETE /api/city-tips/:id` - Delete city tip

### Analytics
- `POST /api/analytics/page-visit` - Track page visit
- `GET /api/analytics` - Get analytics data

### Audit Log
- `GET /api/audit-log` - Get audit log entries

### Maintenance
- `POST /api/maintenance` - Run database maintenance

### Backup
- `POST /api/backup` - Create backup
- `GET /api/backup/history` - Get backup history

### Statistics
- `GET /api/stats/participants` - Get participant statistics
- `GET /api/stats/competitions` - Get competition statistics
- `GET /api/stats/content` - Get content statistics

### Search
- `GET /api/search/participants` - Search participants
- `GET /api/search/content` - Search content

### Export/Import
- `GET /api/export/:type` - Export data
- `POST /api/import/:type` - Import data

## Database Schema

The server uses the PostgreSQL schema defined in the `database/` directory. Key tables include:

- `users` - User accounts and authentication
- `user_sessions` - Session management
- `competitions` - Poetry slam competitions
- `participants` - Competition participants
- `rounds` - Competition rounds
- `round_assignments` - Participant-round relationships with roles
- `content` - News, tips, and announcements
- `content_versions` - Content version history
- `events` - Timetable and scheduling
- `city_tips` - Local recommendations
- `analytics` - Usage tracking
- `audit_log` - Change tracking

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against abuse
- **CORS Protection**: Cross-origin request security
- **Input Validation**: Request data validation
- **SQL Injection Protection**: Parameterized queries
- **Audit Logging**: Complete change tracking
- **Encryption**: Sensitive data encryption

## Performance Features

- **Connection Pooling**: Efficient database connections
- **Compression**: Response compression
- **Caching**: Response caching (configurable)
- **Query Optimization**: Optimized database queries
- **Load Balancing**: Ready for load balancer deployment

## Monitoring & Health Checks

The server provides comprehensive health monitoring:

- **Health Endpoints**: Multiple health check endpoints
- **Database Monitoring**: Connection and query monitoring
- **Performance Metrics**: Response times and throughput
- **Error Tracking**: Comprehensive error logging
- **Uptime Monitoring**: Service availability tracking

## Backup & Recovery

- **Automated Backups**: Scheduled database backups
- **Backup History**: Complete backup tracking
- **Recovery Procedures**: Step-by-step recovery processes
- **Data Validation**: Backup integrity checks

## Development

### Running in Development Mode

```bash
npm run dev
```

This starts the server with nodemon for automatic restarts.

### Running Tests

```bash
npm test
```

### Database Migrations

```bash
npm run migrate
```

### Seeding Data

```bash
npm run seed
```

## Production Deployment

### Environment Variables

Set the following environment variables for production:

```bash
NODE_ENV=production
PORT=3005
DB_HOST=your-db-host
DB_PASSWORD=your-secure-password
JWT_SECRET=your-secure-jwt-secret
```

### Process Management

Use a process manager like PM2:

```bash
npm install -g pm2
pm2 start server.js --name slam25-api
pm2 save
pm2 startup
```

### Reverse Proxy

Configure nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   - Check PostgreSQL service status
   - Verify connection parameters in `.env`
   - Ensure database exists and user has permissions

2. **Port Already in Use**:
   - Change PORT in `.env`
   - Kill existing process: `lsof -ti:3001 | xargs kill -9`

3. **CORS Errors**:
   - Verify FRONTEND_URL in `.env`
   - Check CORS configuration in server.js

4. **JWT Errors**:
   - Ensure JWT_SECRET is set in `.env`
   - Check token expiration settings

### Logs

Check logs for debugging:

```bash
# Application logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log

# Database logs
tail -f /var/log/postgresql/postgresql-*.log
```

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review the logs
3. Check the database health
4. Contact the development team

## License

This server is part of the SLAM25 project and follows the same licensing terms.
