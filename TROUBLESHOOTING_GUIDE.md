# SLAM25 Project Troubleshooting Guide

## 🚨 **Common Issues and Solutions**

### 1. Timetable Event Creation Not Working

**Symptoms:**
- Form submission doesn't result in POST request
- Missing required `slug` field
- Form remains visible after submission

**Diagnosis:**
```bash
# Check browser console for errors
# Check network tab for failed requests
# Verify form validation
```

**Solutions:**
1. **Missing Slug Field**: Ensure slug is generated automatically
2. **Form Validation**: Check if all required fields are filled
3. **API Endpoint**: Verify `/api/timetable` POST endpoint is working
4. **Authentication**: Ensure user is properly authenticated

**Debug Steps:**
```javascript
// Check form data before submission
console.log('Form data:', formData);

// Check if slug is generated
if (!formData.slug) {
  formData.slug = generateSlug(formData.title);
}
```

### 2. Breaking News Validation Error

**Symptoms:**
- "Bitte wählen Sie einen Artikel aus" error
- Article appears selected but validation fails
- Cannot set new breaking news

**Diagnosis:**
```bash
# Check if article is properly selected in dropdown
# Verify form data structure
# Check API response for validation errors
```

**Solutions:**
1. **Dropdown Selection**: Ensure article is properly selected
2. **Form Data**: Verify article ID is included in form data
3. **API Validation**: Check server-side validation logic
4. **State Management**: Ensure form state is properly managed

**Debug Steps:**
```javascript
// Check selected article
console.log('Selected article:', selectedArticle);

// Check form data
console.log('Form data:', formData);

// Check API response
console.log('API response:', response);
```

### 3. Participant UPDATE 500 Error

**Symptoms:**
- 500 Internal Server Error when updating participants
- Special characters in data cause issues
- Database constraint violations

**Diagnosis:**
```bash
# Check server logs for specific error
# Verify database constraints
# Check data sanitization
```

**Solutions:**
1. **Data Sanitization**: Sanitize special characters before database operations
2. **Database Constraints**: Check if constraints are properly configured
3. **Input Validation**: Validate input data before processing
4. **Error Handling**: Add proper error handling for constraint violations

**Debug Steps:**
```javascript
// Check input data
console.log('Input data:', inputData);

// Check for special characters
const hasSpecialChars = /[^\w\s-]/.test(inputData.name);
console.log('Has special characters:', hasSpecialChars);

// Check database constraints
console.log('Database constraints:', constraints);
```

### 4. Admin Tables Not Refreshing

**Symptoms:**
- Changes not reflected in admin tables
- Data appears stale
- Need to refresh page manually

**Diagnosis:**
```bash
# Check React Query cache
# Verify query invalidation
# Check network requests
```

**Solutions:**
1. **Query Invalidation**: Ensure queries are properly invalidated after mutations
2. **Cache Management**: Clear relevant cache entries
3. **Polling Configuration**: Check if polling is properly configured
4. **State Management**: Ensure state is properly updated

**Debug Steps:**
```javascript
// Check query cache
console.log('Query cache:', queryClient.getQueryCache());

// Check if queries are invalidated
console.log('Invalidated queries:', invalidatedQueries);

// Check polling configuration
console.log('Polling config:', pollingConfig);
```

### 5. Authentication Issues

**Symptoms:**
- 401 Unauthorized errors
- Session expires unexpectedly
- Cannot access admin features

**Diagnosis:**
```bash
# Check authentication status
# Verify JWT token validity
# Check cookie settings
```

**Solutions:**
1. **Token Refresh**: Implement automatic token refresh
2. **Session Management**: Check session timeout settings
3. **Cookie Configuration**: Verify HTTP-only cookie settings
4. **Error Handling**: Add proper authentication error handling

**Debug Steps:**
```javascript
// Check authentication status
console.log('Is authenticated:', authService.isLoggedIn());

// Check JWT token
console.log('JWT token:', authService.getToken());

// Check cookie settings
console.log('Cookies:', document.cookie);
```

## 🔧 **Development Tools**

### 1. Browser DevTools
- **Network Tab**: Check API requests and responses
- **Console Tab**: Check for JavaScript errors
- **Application Tab**: Check localStorage and cookies

### 2. Server Logs
```bash
# Check server logs
tail -f server.log

# Check specific error logs
grep "ERROR" server.log

# Check database logs
grep "database" server.log
```

### 3. Database Debugging
```sql
-- Check table structure
\d table_name

-- Check constraints
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'table_name'::regclass;

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'table_name';
```

### 4. React Query DevTools
```javascript
// Enable React Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Add to your app
<ReactQueryDevtools initialIsOpen={false} />
```

## 📋 **Checklist for Common Issues**

### Before Reporting Issues:
- [ ] Check browser console for errors
- [ ] Check network tab for failed requests
- [ ] Verify authentication status
- [ ] Check server logs
- [ ] Test with different data
- [ ] Clear browser cache
- [ ] Restart development server

### For Database Issues:
- [ ] Check database connection
- [ ] Verify table structure
- [ ] Check constraints and indexes
- [ ] Test with sample data
- [ ] Check migration status

### For API Issues:
- [ ] Check endpoint availability
- [ ] Verify request format
- [ ] Check response format
- [ ] Test with different parameters
- [ ] Check authentication headers

## 🆘 **Emergency Procedures**

### 1. Database Rollback
```bash
# Rollback to previous migration
npm run migrate:rollback

# Check migration status
npm run migrate:status
```

### 2. Clear All Caches
```bash
# Clear React Query cache
queryClient.clear();

# Clear browser cache
# Hard refresh (Ctrl+Shift+R)

# Clear server cache
npm run cache:clear
```

### 3. Restart Services
```bash
# Restart development server
npm run dev

# Restart database
npm run db:restart

# Restart all services
npm run restart:all
```

## 📞 **Getting Help**

### 1. Check Documentation
- [README.md](README.md) - Project overview
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development guidelines
- [CRITICAL_FIXES_NEEDED.md](CRITICAL_FIXES_NEEDED.md) - Known issues

### 2. Check Logs
- Server logs: `server.log`
- Database logs: `database.log`
- Browser console: DevTools Console

### 3. Debug Mode
```bash
# Enable debug mode
DEBUG=* npm run dev

# Enable verbose logging
VERBOSE=true npm run dev
```

### 4. Contact Information
- **Project**: SLAM25 Members Area
- **Repository**: [GitHub Repository]
- **Documentation**: [Project Documentation]

---

**Remember**: Always check the logs first, then try the simplest solution before escalating to more complex debugging steps.
