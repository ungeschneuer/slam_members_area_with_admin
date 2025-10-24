# Rollback Procedure - Code Fixes

**Created:** 2025-10-24  
**Purpose:** Instructions for rolling back the code fixes if issues arise

---

## Overview

This document provides step-by-step instructions for rolling back the changes made during the code analysis fix implementation. Use this if the fixes cause unexpected issues in production or development.

---

## Quick Rollback (Git)

If you created a git branch for these fixes:

```bash
# 1. Check current branch
git branch

# 2. Switch back to main/master
git checkout main

# 3. If changes were merged, revert the merge commit
git log --oneline -10  # Find the merge commit hash
git revert -m 1 <merge-commit-hash>

# 4. Push revert
git push origin main
```

---

## Manual Rollback by Component

### 1. Environment Configuration (.env.template)

**Changes Made:**
- PORT changed from 3000 to 3005
- Added APP_TIMEZONE and TZ variables
- Removed unused WebSocket, caching, and feature flag variables
- Added production deployment notes

**Rollback Steps:**

```bash
# Option A: Revert file from git
git checkout HEAD~1 -- .env.template

# Option B: Manual changes
# Edit .env.template and change:
PORT=3005  →  PORT=3000
# Remove APP_TIMEZONE, TZ
# Add back removed sections (see backup below)
```

**Backup of Original Content:**
```bash
# WebSocket Configuration (removed)
SOCKET_IO_CORS_ORIGIN=http://localhost:5173
SOCKET_IO_TRANSPORTS=websocket,polling
SOCKET_IO_TIMEOUT=20000

# Caching Configuration (removed)
CACHE_TTL=300000
CACHE_MAX_SIZE=100
CACHE_CLEANUP_INTERVAL=600000

# Feature Flags (removed)
FEATURE_WEBSOCKET_ENABLED=true
FEATURE_CACHING_ENABLED=true
FEATURE_PERFORMANCE_MONITORING=true
FEATURE_DEBUG_LOGGING=true
FEATURE_HOT_RELOAD=true
```

---

### 2. AdminRounds.jsx Component (DELETED)

**Changes Made:**
- Deleted `client/components/admin/AdminRounds.jsx`
- Updated imports in `client/Admin.jsx`

**Rollback Steps:**

```bash
# Option A: Restore from git
git checkout HEAD~1 -- client/components/admin/AdminRounds.jsx

# Option B: Recreate file manually
# Create client/components/admin/AdminRounds.jsx with:
```

```javascript
// Simplified rounds admin component
import SimplifiedRoundsAdmin from './SimplifiedRoundsAdmin.jsx';

export default function AdminRounds() {
  return <SimplifiedRoundsAdmin />;
}
```

Then update `client/Admin.jsx`:
```javascript
// Change back to:
import AdminRounds from './components/admin/AdminRounds';
// And in routes:
<Route path="/rounds" element={<AdminRounds />} />
```

---

### 3. Logger Replacements

**Changes Made:**
- Replaced console.log with logger in 3 files:
  - `client/Admin.jsx` (7 replacements)
  - `client/components/admin/AdminDashboard.jsx` (4 replacements)
  - `client/components/Links.jsx` (1 removal)

**Rollback Steps:**

```bash
# Revert specific files
git checkout HEAD~1 -- client/Admin.jsx
git checkout HEAD~1 -- client/components/admin/AdminDashboard.jsx
git checkout HEAD~1 -- client/components/Links.jsx
```

Or manually revert:
```javascript
// Change:
logger.debug('message', { data })
// Back to:
if (import.meta.env.DEV) console.log('message:', data)

// Change:
logger.error('message', { error: error.message })
// Back to:
if (import.meta.env.DEV) console.error('message:', error)
```

---

### 4. Security Validation (server/config/database.js)

**Changes Made:**
- Added comprehensive secret validation for SESSION_SECRET and COOKIE_SECRET

**Rollback Steps:**

```bash
# Revert database.js
git checkout HEAD~1 -- server/config/database.js
```

Or manually remove the DEFAULT_SECRETS object and restore original code around line 67.

---

### 5. SELECT * Query Optimizations (21 files)

**Changes Made:**
- Replaced `SELECT *` with explicit column lists in 21 queries across 9 route files

**Files Modified:**
- `server/routes/news.routes.js` (4 queries)
- `server/routes/participants.routes.js` (3 queries)
- `server/routes/city-tips.routes.js` (3 queries)
- `server/routes/info-pages.routes.js` (3 queries)
- `server/routes/simplifiedRounds.routes.js` (1 query)
- `server/routes/breaking-news.routes.js` (1 query)
- `server/routes/schnellzugriff.routes.js` (1 query)
- `server/routes/countdown-config.routes.js` (1 query)
- `server/routes/links.routes.js` (2 queries)
- `server/services/teamsService.js` (1 query)

**Rollback Steps:**

```bash
# Revert all route files at once
git checkout HEAD~1 -- server/routes/*.js
git checkout HEAD~1 -- server/services/teamsService.js
```

Or use find-and-replace to restore `SELECT *`:
```bash
# This is tedious, git revert is recommended
```

---

### 6. New Utility Files (Can Keep or Delete)

**Files Created:**
- `server/utils/tableColumns.js` - SQL column constants
- `server/utils/slugValidation.js` - Slug validation utilities

**Rollback Steps:**

```bash
# These files are new additions and not used yet
# Safe to delete if needed:
rm server/utils/tableColumns.js
rm server/utils/slugValidation.js
```

---

## Testing After Rollback

After rolling back, verify the application works:

```bash
# 1. Clear caches
rm -rf node_modules/.vite
rm -rf .cache

# 2. Restart development server
npm run dev

# 3. Test critical paths
# - Admin login
# - View participants
# - View rounds
# - View news
# - Create/edit content (admin)

# 4. Check for errors
# - Browser console (F12)
# - Server logs
# - Network tab (failed requests)
```

---

## Partial Rollback Options

If only specific changes are problematic:

### Keep Config Changes, Rollback Code
```bash
# Keep .env.template changes
# Rollback only code files
git checkout HEAD~1 -- client/
git checkout HEAD~1 -- server/
```

### Keep Query Optimizations, Rollback Everything Else
```bash
# Rollback everything except route files
git checkout HEAD~1 -- client/
git checkout HEAD~1 -- .env.template
# Keep server/routes/* as-is
```

### Rollback Only SELECT * Changes
```bash
git checkout HEAD~1 -- server/routes/*.js
git checkout HEAD~1 -- server/services/teamsService.js
```

---

## Database Considerations

**Important:** These code fixes did NOT include database schema changes.

- No migrations were run
- No table structure changes
- No data modifications
- Rollback does NOT require database restore

However, if you separately applied the duplicate index removal:
```sql
-- Restore duplicate indexes if removed
CREATE INDEX idx_links_is_active ON public.links USING btree (is_active);
CREATE INDEX idx_links_sort_order ON public.links USING btree (sort_order);
```

---

## Common Rollback Scenarios

### Scenario 1: Production Deployment Failed

```bash
# 1. SSH into production server
ssh user@production-server

# 2. Navigate to application directory
cd /var/www/slam25

# 3. Revert to previous commit
git log --oneline -5  # Find previous stable commit
git reset --hard <previous-commit-hash>

# 4. Restart application
pm2 restart slam25-api
pm2 restart slam25-client

# 5. Verify
curl http://localhost:3005/api/health
```

### Scenario 2: Specific Feature Broken

Example: Admin rounds page broken after AdminRounds.jsx deletion

```bash
# Restore just the deleted component
git checkout HEAD~1 -- client/components/admin/AdminRounds.jsx
git checkout HEAD~1 -- client/Admin.jsx

# Clear cache
rm -rf node_modules/.vite

# Restart
npm run dev
```

### Scenario 3: Performance Regression

If SELECT column optimizations cause issues:

```bash
# Revert all route files
git checkout HEAD~1 -- server/routes/

# Or revert specific route
git checkout HEAD~1 -- server/routes/news.routes.js

# Restart server
npm run dev:server
```

---

## Verification Checklist

After rollback, verify:

- [ ] Application starts without errors
- [ ] Admin panel loads
- [ ] Authentication works
- [ ] All routes return data
- [ ] No console errors in browser
- [ ] Server logs show no errors
- [ ] Database queries execute successfully
- [ ] All tests pass (if applicable)

---

## Prevention for Future Changes

To avoid needing rollbacks:

1. **Always use branches:**
   ```bash
   git checkout -b fix/issue-description
   # make changes
   git commit -m "fix: description"
   # test thoroughly
   git push origin fix/issue-description
   # create PR, review, then merge
   ```

2. **Test in staging first:**
   ```bash
   # Deploy to staging
   npm run deploy:staging
   # Test for 24-48 hours
   # Then deploy to production
   npm run deploy:production
   ```

3. **Create backups before major changes:**
   ```bash
   # Backup database
   npm run db:backup
   
   # Tag current state
   git tag -a v1.0.0-pre-fixes -m "Before code fixes"
   git push origin v1.0.0-pre-fixes
   ```

4. **Document all changes:**
   - Keep change log updated
   - Document in commit messages
   - Create rollback procedures upfront

---

## Emergency Contacts

If rollback doesn't resolve issues:

1. **Check logs first:**
   ```bash
   # Server logs
   tail -f logs/error.log
   tail -f logs/combined.log
   
   # PM2 logs (production)
   pm2 logs slam25-api
   ```

2. **Database connection:**
   ```bash
   # Test database connectivity
   npm run test:db-connection
   ```

3. **Escalation:**
   - Document the issue
   - Check recent changes in git log
   - Review error messages
   - Contact senior developer with details

---

## Post-Rollback Actions

After successful rollback:

1. **Document the issue:**
   - What went wrong?
   - Which change caused it?
   - How was it discovered?

2. **Fix and re-test:**
   - Create new branch
   - Fix the specific issue
   - Test thoroughly
   - Deploy again

3. **Update procedures:**
   - Update this rollback document
   - Improve testing checklist
   - Add new verification steps

---

## Git Commands Reference

```bash
# View recent commits
git log --oneline -10

# View changes in a commit
git show <commit-hash>

# Revert specific files
git checkout <commit-hash> -- path/to/file

# Revert entire commit
git revert <commit-hash>

# Reset to specific commit (DESTRUCTIVE)
git reset --hard <commit-hash>

# Create backup branch before rollback
git branch backup-$(date +%Y%m%d)

# View diff between commits
git diff HEAD~1 HEAD
```

---

## Support Resources

- **Documentation:** `/workspace/CODE_ANALYSIS_REPORT.md`
- **Applied Fixes:** `/workspace/FIXES_APPLIED.md`
- **Git History:** `git log --oneline`
- **Architecture Guide:** `/workspace/ARCHITECTURE.md`

---

**Last Updated:** 2025-10-24  
**Document Version:** 1.0  
**Applies to:** Code fixes from CODE_ANALYSIS_REPORT.md
