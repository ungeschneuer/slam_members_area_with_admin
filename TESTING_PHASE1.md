# Phase 1 Error Handling - Quick Test Checklist

## ✅ Build Status
Production build: **SUCCESSFUL**

## Quick Start
```bash
git checkout fix/stringent-error-handling
npm install
npm run dev
```

## Critical Tests (10 min)

### 1. Toast Notifications Work
- [ ] Create participant → see success/error toast
- [ ] Error appears in top-right corner
- [ ] Toast auto-dismisses after 5 seconds
- [ ] Can manually close toast

### 2. Database 404s Fixed
**BEFORE:** Accessing `/participants/fake-slug` showed undefined  
**AFTER:** Shows proper 404 error

- [ ] Navigate to `/participants/nonexistent-123`
- [ ] See "Participant not found" message
- [ ] Network tab shows 404 status

### 3. Mutation Errors Show to User
**BEFORE:** Errors silent (only console.error)  
**AFTER:** User sees German toast notification

Test offline mode:
- [ ] Open DevTools > Network > Offline
- [ ] Try to create/update participant
- [ ] See German error toast: "Fehler beim..."
- [ ] Form stays open (doesn't navigate away)
- [ ] Go online and retry → success

### 4. Auth Errors Logged
- [ ] Try wrong admin password
- [ ] Check browser console for error log
- [ ] Error includes context (not just "error")

## Full Testing Guide
See `/private/tmp/claude/.../scratchpad/TESTING_GUIDE_PHASE1.md` for complete testing instructions.

## What Changed
- ✅ Toast notification system integrated
- ✅ 6 auth catch blocks now log errors
- ✅ 4 database query bugs fixed (404s now work)
- ✅ 29 mutation hooks have error toasts
- ✅ All JSON parsing wrapped with error handlers
- ✅ Server Sentry errors logged

## Known Not-Yet-Fixed (Phase 2+)
- Admin delete operation notifications
- Map loading errors
- File upload error handling
- Date formatting errors

## Report Issues
If tests fail, document:
1. Which test failed
2. Browser console errors
3. Steps to reproduce
4. Screenshots
