# SLAM25 Members Area - Environment Configuration

This document explains how to set up and configure the environment variables for the SLAM25 Members Area application.

## Environment Files Overview

The project includes three environment template files:

- `.env.template` - General template for any environment
- `.env.development.template` - Development-specific configuration
- `.env.production.template` - Production-specific configuration

## Quick Setup

### 1. Choose Your Environment

For **development**:
```bash
cp .env.development.template .env.development
```

For **production**:
```bash
cp .env.production.template .env.production
```

For **custom environment**:
```bash
cp .env.template .env
```

### 2. Update Configuration Values

Edit the copied file and update the values according to your setup:

```bash
# Example for development
nano .env.development

# Example for production
nano .env.production
```

## Environment-Specific Configurations

### Development Environment

The development environment is optimized for:
- Hot reloading and fast development
- Permissive CORS settings
- Debug logging enabled
- Relaxed security settings
- Local database connections

**Key Development Settings:**
```env
NODE_ENV=development
LOG_LEVEL=debug
HELMET_CSP_ENABLED=false
RATE_LIMIT_MAX_REQUESTS=1000
DEBUG_MODE=true
```

### Production Environment

The production environment is optimized for:
- Security and performance
- Strict CORS and security headers
- Optimized database connection pooling
- Comprehensive logging and monitoring
- SSL/TLS configuration

**Key Production Settings:**
```env
NODE_ENV=production
LOG_LEVEL=info
HELMET_CSP_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
SESSION_SECURE=true
COOKIE_SECURE=true
```

## Critical Security Settings

### ⚠️ MUST CHANGE IN PRODUCTION

These values **MUST** be changed before deploying to production:

```env
# JWT Secret - Generate a secure random string
JWT_SECRET=CHANGE_THIS_TO_VERY_SECURE_JWT_SECRET_KEY_AT_LEAST_64_CHARACTERS_LONG

# Session Secret - Generate a secure random string
SESSION_SECRET=CHANGE_THIS_TO_VERY_SECURE_SESSION_SECRET_KEY_AT_LEAST_64_CHARACTERS_LONG

# Cookie Secret - Generate a secure random string
COOKIE_SECRET=CHANGE_THIS_TO_VERY_SECURE_COOKIE_SECRET_KEY_AT_LEAST_64_CHARACTERS_LONG

# Database Password - Use a strong, unique password
DB_PASSWORD=CHANGE_THIS_TO_SECURE_PRODUCTION_PASSWORD
```

### 🔐 Generating Secure Secrets

Use these commands to generate secure secrets:

```bash
# Generate JWT Secret (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Session Secret (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Cookie Secret (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Database Configuration

### Development Database
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=slam25_db
DB_USER=slam_user
DB_PASSWORD=slam25_secure_password_2025
```

### Production Database
```env
DB_HOST=your_production_db_host
DB_PORT=5432
DB_NAME=slam25_prod_db
DB_USER=slam_prod_user
DB_PASSWORD=CHANGE_THIS_TO_SECURE_PRODUCTION_PASSWORD
DB_SSL_ENABLED=true
```

## CORS Configuration

### Development CORS
```env
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5178
```

### Production CORS
```env
CORS_ORIGINS=https://szene.slam25.de
```

## Logging Configuration

### Development Logging
```env
LOG_LEVEL=debug
LOG_DIR=./logs
```

### Production Logging
```env
LOG_LEVEL=info
LOG_DIR=/var/log/slam25
```

## Feature Flags

Control application features with environment variables:

```env
# WebSocket functionality
FEATURE_WEBSOCKET_ENABLED=true

# Caching system
FEATURE_CACHING_ENABLED=true

# Performance monitoring
FEATURE_PERFORMANCE_MONITORING=true

# Debug logging
FEATURE_DEBUG_LOGGING=true

# Hot reloading (development only)
FEATURE_HOT_RELOAD=true
```

## Performance Tuning

### Database Connection Pool

**Development:**
```env
DB_MAX_CONNECTIONS=5
DB_MIN_CONNECTIONS=1
```

**Production:**
```env
DB_MAX_CONNECTIONS=50
DB_MIN_CONNECTIONS=5
```

### Caching Configuration

**Development:**
```env
CACHE_TTL=300000
CACHE_MAX_SIZE=100
```

**Production:**
```env
CACHE_TTL=300000
CACHE_MAX_SIZE=1000
```

## Monitoring and Alerting

### Production Monitoring
```env
MONITORING_ENABLED=true
ALERT_EMAIL=admin@slam25.de
ALERT_SLACK_WEBHOOK=your_slack_webhook_url
```

### Performance Monitoring
```env
PERFORMANCE_LOGGING_ENABLED=true
PERFORMANCE_SLOW_QUERY_THRESHOLD=500
PERFORMANCE_LOG_INTERVAL=300000
```

## Backup Configuration

### Development Backup
```env
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=7
```

### Production Backup
```env
BACKUP_DIR=/var/backups/slam25
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION_KEY=your_backup_encryption_key
```

## SSL/TLS Configuration

For production environments with SSL:

```env
SSL_CERT_PATH=/path/to/ssl/cert.pem
SSL_KEY_PATH=/path/to/ssl/private.key
SSL_CA_PATH=/path/to/ssl/ca.pem
```

## Environment Validation

The application validates environment variables on startup. Missing required variables will cause the application to fail with descriptive error messages.

### Required Variables

These variables are required for the application to start:

- `NODE_ENV`
- `PORT`
- `DB_HOST`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `SESSION_SECRET`
- `COOKIE_SECRET`

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - Ensure database server is running
   - Verify network connectivity

2. **CORS Errors**
   - Check `CORS_ORIGINS` includes your frontend URL
   - Verify `FRONTEND_URL` is set correctly

3. **Authentication Issues**
   - Verify `JWT_SECRET` is set and consistent
   - Check `SESSION_SECRET` and `COOKIE_SECRET`
   - Ensure cookies are configured correctly

4. **Performance Issues**
   - Adjust `DB_MAX_CONNECTIONS` for your database
   - Tune `CACHE_TTL` and `CACHE_MAX_SIZE`
   - Monitor `PERFORMANCE_SLOW_QUERY_THRESHOLD`

### Debug Mode

Enable debug mode for troubleshooting:

```env
DEBUG_MODE=true
DEBUG_SQL=true
DEBUG_WEBSOCKET=true
LOG_LEVEL=debug
```

## Best Practices

### Security
- Never commit `.env` files to version control
- Use strong, unique passwords and secrets
- Rotate secrets regularly
- Use environment-specific configurations

### Performance
- Tune database connection pools for your workload
- Monitor performance metrics
- Use appropriate cache settings
- Enable performance logging in production

### Monitoring
- Set up proper logging in production
- Configure alerting for critical issues
- Monitor database performance
- Track application metrics

## Support

For issues with environment configuration:

1. Check the application logs for specific error messages
2. Verify all required variables are set
3. Test database connectivity
4. Review CORS and security settings
5. Check file permissions for log directories

## Additional Resources

- [Node.js Environment Variables](https://nodejs.org/api/process.html#process_process_env)
- [PostgreSQL Connection Pooling](https://node-postgres.com/features/pooling)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Socket.io Configuration](https://socket.io/docs/v4/server-options/)
