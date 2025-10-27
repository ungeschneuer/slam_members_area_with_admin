# SLAM25 Secure Deployment Guide

## 🎯 Overview

This guide provides secure deployment procedures for the SLAM25 Poetry Slam Members Area, following security best practices and project simplicity standards.

## 🔒 Security Improvements

### ✅ **Critical Security Fixes Implemented**

1. **Removed Hardcoded Credentials**
   - Database credentials no longer hardcoded in scripts
   - Production configuration uses environment variables
   - Secure secret generation with proper validation

2. **Environment Variable Security**
   - All sensitive data moved to `.env.deployment`
   - Input validation for required environment variables
   - Secure file permissions (600) for sensitive files

3. **Deployment Logging**
   - Comprehensive audit trail in `deployment.log`
   - Timestamped logs for security events
   - Structured logging for monitoring

## 🚀 Deployment Process

### 1. **Pre-Deployment Setup**

```bash
# Create secure environment file
cp .env.deployment.template .env.deployment

# Edit with your secure values
nano .env.deployment
```

**Required Environment Variables:**
```bash
# Uberspace Configuration
UBERSPACE_USER=your_uberspace_username
UBERSPACE_HOST=your_uberspace_host.uber.space

# Database Configuration (REQUIRED)
DB_USER=your_database_user
DB_PASSWORD=your_secure_database_password

# Optional: Override defaults
PROJECT_NAME=slam25
DOMAIN=szene.slam25.de
PORT=47180
```

### 2. **Export Local Data**

```bash
# Export database
npm run export-db

# Package uploads
npm run package-uploads
```

### 3. **Deploy Application**

```bash
# Clean deployment (recommended for production)
npm run deploy:clean

# Or incremental deployment (faster, preserves some files)
npm run deploy:incremental

# Legacy deployment (use only if needed)
npm run deploy:legacy
```

## 🔧 **Unified Deployment Script Features**

### **Security Features**
- ✅ **Environment variable validation** - Ensures all required variables are set
- ✅ **Secure secret generation** - 64+ character JWT secrets
- ✅ **Input validation** - Prevents deployment with missing credentials
- ✅ **Audit logging** - Complete deployment audit trail

### **Reliability Features**
- ✅ **Automatic rollback** - Restores previous deployment on failure
- ✅ **Health monitoring** - Retry logic for health checks
- ✅ **Port binding verification** - Ensures Uberspace compatibility
- ✅ **Dependency verification** - Validates critical modules (bcryptjs)

### **Simplicity Features**
- ✅ **Single deployment script** - Replaces multiple scripts
- ✅ **Environment-based configuration** - No hardcoded values
- ✅ **Clear error messages** - Easy to understand and debug
- ✅ **Comprehensive help** - Built-in documentation

## 📊 **Deployment Modes**

### **Clean Deployment** (Default)
```bash
npm run deploy:clean
```
- Removes all existing files
- Fresh installation of dependencies
- Complete database import
- Recommended for production

### **Incremental Deployment**
```bash
npm run deploy:incremental
```
- Preserves existing files where possible
- Faster deployment
- Good for updates and fixes

## 🔍 **Verification Process**

The deployment script automatically verifies:

1. **Environment Variables** - All required variables are set
2. **Prerequisites** - Database and uploads backups exist
3. **Frontend Build** - Local build completes successfully
4. **File Upload** - All files transferred to server
5. **Dependencies** - Critical modules installed (bcryptjs)
6. **Service Startup** - Application starts successfully
7. **Port Binding** - Server binds to 0.0.0.0 (Uberspace requirement)
8. **Health Checks** - Application responds to health endpoints
9. **Domain Access** - Application accessible via domain
10. **Database Connection** - Database queries work correctly

## 🚨 **Error Handling**

### **Automatic Rollback**
If deployment fails, the script automatically:
1. Stops the failed deployment
2. Restores the previous backup
3. Restarts the previous version
4. Logs the rollback event

### **Health Monitoring**
- Retry logic for health checks (10 attempts)
- Graceful handling of DNS propagation delays
- Clear error messages for troubleshooting

## 📝 **Deployment Logs**

All deployment activities are logged to `deployment.log`:

```bash
# View deployment log
cat deployment.log

# Monitor deployment in real-time
tail -f deployment.log
```

**Log Format:**
```
2024-01-15T10:30:00Z,INFO,Deployment started - Mode: clean
2024-01-15T10:30:01Z,SUCCESS,Environment validation passed
2024-01-15T10:30:02Z,INFO,Pre-deployment validation...
```

## 🛠️ **Troubleshooting**

### **Common Issues**

1. **Missing Environment Variables**
   ```bash
   # Error: Missing required environment variables
   # Solution: Create .env.deployment from template
   cp .env.deployment.template .env.deployment
   nano .env.deployment
   ```

2. **Database Connection Failed**
   ```bash
   # Error: Database import failed
   # Solution: Check database credentials in .env.deployment
   ```

3. **Port Binding Issues**
   ```bash
   # Error: Server not bound to 0.0.0.0
   # Solution: Check server configuration in server.js
   ```

4. **Health Check Failed**
   ```bash
   # Error: Health check failed after 10 attempts
   # Solution: Check application logs on server
   ssh user@host 'supervisorctl tail project_szene stderr'
   ```

### **Manual Verification**

```bash
# Check service status
ssh user@host 'supervisorctl status project_szene'

# Check port binding
ssh user@host 'netstat -tlnp | grep 47180'

# Check health endpoint
curl http://localhost:47180/health

# Check domain access
curl https://szene.slam25.de/health
```

## 🔐 **Security Checklist**

- [ ] **Environment variables** - All sensitive data in `.env.deployment`
- [ ] **File permissions** - `.env.deployment` has 600 permissions
- [ ] **No hardcoded credentials** - All values from environment
- [ ] **Secure secrets** - JWT secrets are 64+ characters
- [ ] **Audit logging** - All actions logged to `deployment.log`
- [ ] **Input validation** - All required variables validated
- [ ] **Rollback capability** - Automatic recovery on failure

## 🎯 **Benefits Achieved**

### **Security**
- ✅ No hardcoded credentials in version control
- ✅ Secure secret generation and validation
- ✅ Comprehensive audit logging
- ✅ Input validation for all sensitive data

### **Reliability**
- ✅ Automatic rollback on failure
- ✅ Health monitoring with retries
- ✅ Port binding verification
- ✅ Dependency validation

### **Simplicity**
- ✅ Single deployment script
- ✅ Environment-based configuration
- ✅ Clear error messages
- ✅ Comprehensive help documentation

### **Maintainability**
- ✅ Unified deployment process
- ✅ Consistent error handling
- ✅ Structured logging
- ✅ Easy troubleshooting

## 🚀 **Next Steps**

1. **Test the new deployment script** in a development environment
2. **Create secure `.env.deployment`** with your production values
3. **Run a clean deployment** to verify all functionality
4. **Monitor the deployment logs** for any issues
5. **Verify all endpoints** are working correctly

The new unified deployment script provides a secure, reliable, and simple deployment process that follows all project standards and security best practices.
