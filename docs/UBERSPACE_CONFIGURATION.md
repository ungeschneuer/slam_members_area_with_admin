# Uberspace Configuration Requirements

This document outlines the specific configuration requirements for deploying the SLAM25 application to Uberspace hosting.

## Critical Configuration Requirements

### 1. Server Port Binding

**CRITICAL**: The Node.js server MUST bind to `0.0.0.0` in production, not `127.0.0.1`.

**Location**: `server/server.js` lines 315-317
```javascript
// In production, bind to 0.0.0.0 for Uberspace compatibility (web backend handles external traffic)
// CRITICAL: Uberspace requires 0.0.0.0 binding, not 127.0.0.1, for web backend proxy to work
const bindAddress = process.env.NODE_ENV === 'production' ? '0.0.0.0' : undefined;
```

**Why**: Uberspace's web backend (Nginx) needs to proxy requests to the Node.js application. If the server binds to `127.0.0.1`, the proxy cannot reach it, resulting in 502 Bad Gateway errors.

### 2. Web Backend Configuration

**Location**: `~/html/.htaccess`
```apache
RewriteEngine On
RewriteRule ^(.*)$ http://localhost:47180/$1 [P,L]
```

**Why**: This tells Uberspace's web backend to proxy all requests to the Node.js application running on port 47180.

### 3. Database Connection Pooling

**Location**: `.env` file
```bash
DB_MAX_CONNECTIONS=2
DB_MIN_CONNECTIONS=1
```

**Why**: Uberspace has file descriptor limits. Large connection pools can cause "too many open files" errors.

### 4. Logger Configuration

**Location**: `server/config/logger.js`

**Why**: Uberspace has file descriptor limits. Complex logging with multiple file transports can exceed these limits.

### 5. Database SSL Configuration

**Location**: `server/config/database.js` line 120

**Why**: Uberspace PostgreSQL doesn't support SSL connections. SSL must be disabled.

```javascript
ssl: false, // Uberspace PostgreSQL doesn't support SSL connections
```

### 6. Rate Limiting Configuration

**Location**: `server/config/security.js`

**Why**: Simplified rate limiting approach for better performance and maintainability.

- **General limit**: 1000 requests per 15 minutes in production
- **Health checks**: Exempted from rate limiting
- **Single rate limiter**: Removed unused rate limiters (auth, upload, development)

## Deployment Verification

After deployment, verify the following:

1. **Port Binding**: Check that the server binds to `0.0.0.0:47180`
   ```bash
   netstat -tlnp | grep 47180
   # Should show: tcp 0 0 0.0.0.0:47180 0.0.0.0:* LISTEN
   ```

2. **Application Access**: Test that the application is accessible
   ```bash
   curl -I https://szene.slam25.de/
   # Should return: HTTP/2 200
   ```

3. **Health Check**: Verify the health endpoint works
   ```bash
   curl http://localhost:47180/health
   # Should return JSON with status information
   ```

## Common Issues and Solutions

### 502 Bad Gateway Error
- **Cause**: Server binding to `127.0.0.1` instead of `0.0.0.0`
- **Solution**: Ensure `server.js` uses `0.0.0.0` binding in production

### "Too many open files" Error
- **Cause**: Large database connection pools or complex logging
- **Solution**: Use small connection pools (max 2, min 1) and simple logging

### Application not accessible
- **Cause**: Missing or incorrect `.htaccess` configuration
- **Solution**: Ensure `.htaccess` exists in `~/html/` with correct proxy rules

### HTTP 500 errors on API endpoints
- **Cause**: Database SSL configuration trying to use SSL on Uberspace PostgreSQL
- **Solution**: Set `ssl: false` in database configuration
- **Location**: `server/config/database.js` line 120

### Rate Limiting Configuration
- **Simplified**: The application now uses a simplified rate limiting approach
- **General limit**: 1000 requests per 15 minutes in production
- **Health checks**: Exempted from rate limiting
- **Location**: `server/config/security.js`

## Maintenance

When updating the application:

1. Always ensure `NODE_ENV=production` is set
2. Verify server binding configuration remains `0.0.0.0`
3. Test application accessibility after deployment
4. Monitor logs for any file descriptor issues

## Files to Monitor

- `server/server.js` - Port binding configuration
- `~/html/.htaccess` - Web backend proxy configuration
- `.env` - Database connection pool settings
- `server/config/logger.js` - Logging configuration
