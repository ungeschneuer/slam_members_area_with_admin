# SLAM25 Deployment Guide

This guide provides secure deployment procedures for the SLAM25 Poetry Slam Members Area, following security best practices and project simplicity standards.

## ⚠️ Important: Data Preservation

The deployment script automatically preserves:
- Uploaded files in `public/uploads/`
- Built frontend in `dist/`
- Server logs in `logs/`

These directories are excluded from rsync --delete to prevent data loss.

## 🎯 Unified Deployment Commands

```bash
# Clean deployment (recommended for production)
npm run deploy:clean

# Incremental deployment (faster updates)
npm run deploy:incremental

# Default deployment (clean mode)
npm run deploy
```

The unified deployment script handles everything:
- Database export and uploads packaging
- File transfer to Uberspace
- Secure environment configuration
- Frontend build with correct API URL
- Service configuration and startup
- Comprehensive verification and testing
- Automatic rollback on failure

## 🔧 Key Fixes Implemented

### 1. bcrypt → bcryptjs Migration
- **Problem**: Native `bcrypt` module compilation failures on Uberspace
- **Solution**: Replaced with `bcryptjs` (pure JavaScript, no compilation needed)
- **Files**: `package.json`, `server/routes/*.js`, `scripts/create-admin-user.js`

### 2. Port Binding Configuration
- **Problem**: Server binding to `127.0.0.1` causes 502 Bad Gateway on Uberspace
- **Solution**: Server binds to `0.0.0.0` in production
- **File**: `server/server.js` line 316
- **Verification**: Automatic check in deployment script

### 3. CSP (Content Security Policy) Fixes
- **Problem**: CSP blocking `localhost:3005` API calls and `unsafe-eval`
- **Solution**: 
  - Added `'unsafe-eval'` to `script-src`
  - Added production domain to `connect-src`
  - Built frontend with correct `VITE_API_URL`
- **File**: `server/server.js` lines 130-132

### 4. Source Maps Disabled
- **Problem**: Source map errors in production
- **Solution**: Disabled source maps in production builds
- **File**: `client/vite.config.js`

### 5. Environment Variable Order
- **Problem**: Frontend built before `.env` file creation, causing `localhost:3005` hardcoded
- **Solution**: Create `.env` file BEFORE building frontend
- **File**: `deploy-unified.sh`

### 6. Database Connection Pooling
- **Problem**: "Too many open files" errors on Uberspace
- **Solution**: Optimized connection pools (max: 2, min: 1)
- **File**: `.env` configuration

### 7. Logger Configuration
- **Problem**: Winston logger causing file descriptor issues
- **Solution**: Simple console-based logging
- **File**: `server/config/logger.js`

### 8. Database SSL Configuration
- **Problem**: PostgreSQL SSL connection errors on Uberspace
- **Solution**: Disable SSL for Uberspace PostgreSQL
- **File**: `server/config/database.js` line 120

## 📁 Clean File Structure

```
scripts/
├── export-database.sh          # Database export
├── package-uploads.sh          # Uploads packaging
├── verify-deployment.sh        # Deployment verification
├── verify-uberspace-binding.sh # Port binding verification
└── pre-deployment-check.sh    # Pre-deployment validation

deploy-unified.sh              # Main deployment script
```

## 🚀 Deployment Process

### 1. Pre-deployment Preparation
```bash
# Export database
npm run export-db

# Package uploads
npm run package-uploads
```

### 2. Clean Deployment
```bash
# Single command deployment
npm run clean-deploy
```

### 3. Verification
```bash
# Verify port binding
npm run verify-uberspace-binding

# Check application
curl -I https://szene.slam25.de/
```

## 🔍 Verification Checklist

After deployment, verify:

- [ ] **Port Binding**: Server bound to `0.0.0.0:47180`
- [ ] **Application Access**: `https://szene.slam25.de/` returns HTTP 200
- [ ] **Health Endpoint**: `http://localhost:47180/health` responds
- [ ] **No CSP Errors**: Browser console shows no CSP violations
- [ ] **No Source Map Errors**: No source map errors in console
- [ ] **API Calls**: Frontend uses production domain, not localhost:3005

## 🛠️ Troubleshooting

### 502 Bad Gateway
- **Cause**: Server not bound to `0.0.0.0`
- **Fix**: Check `server/server.js` line 316, restart service

### CSP Errors
- **Cause**: Frontend built with wrong `VITE_API_URL`
- **Fix**: Rebuild frontend with correct environment variables

### Database Connection Issues
- **Cause**: Connection pool too large
- **Fix**: Check `.env` `DB_MAX_CONNECTIONS=2`

### "Too many open files"
- **Cause**: Complex logging or large connection pools
- **Fix**: Use simple console logging, small connection pools

## 📋 Environment Variables

Critical environment variables for Uberspace:

```bash
NODE_ENV=production
PORT=47180
DB_MAX_CONNECTIONS=2
DB_MIN_CONNECTIONS=1
VITE_API_URL=https://szene.slam25.de/api
```

## 🎉 Success Indicators

- ✅ Application accessible at `https://szene.slam25.de/`
- ✅ No CSP errors in browser console
- ✅ No source map errors
- ✅ Health endpoint responding
- ✅ Database connection healthy
- ✅ Service running with correct port binding

## 📚 Related Documentation

- [UBERSPACE_CONFIGURATION.md](./UBERSPACE_CONFIGURATION.md) - Detailed Uberspace requirements
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Step-by-step deployment guide
- [CORE_DEPENDENCY_FIXES.md](./CORE_DEPENDENCY_FIXES.md) - Dependency fixes documentation
