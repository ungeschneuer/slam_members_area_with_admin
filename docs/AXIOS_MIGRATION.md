# Axios Migration Guide

This document explains the migration from native `fetch` with monkey-patching to Axios with interceptors.

---

## Why We Migrated

### Problems with the Old Approach

**Old Code (Monkey-Patching):**
```javascript
// client/services/tokenRefreshService.js (DEPRECATED)
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  // Intercept ALL fetch calls globally
  // ...
};
```

**Issues:**
1. ❌ **Global API Override** - Affects ALL code in the browser, including third-party libraries
2. ❌ **Library Conflicts** - Can break other libraries that also use fetch
3. ❌ **Hard to Debug** - Stack traces point to interceptor code, not original code
4. ❌ **Testing Problems** - Monkey-patch affects all tests
5. ❌ **Race Conditions** - Multiple simultaneous requests could trigger multiple token refreshes

---

## New Approach: Axios with Interceptors

### Key Benefits

✅ **No Global Override** - Only our API calls use Axios
✅ **Clean Separation** - Fetch still works normally for other code
✅ **Better DX** - Clearer errors, better debugging
✅ **Automatic JSON Parsing** - No more `await response.json()`
✅ **Built-in Features** - Timeout, retry, request/response transformation
✅ **Race Condition Protection** - Queue mechanism prevents multiple token refreshes

---

## API Client Overview

### Location
`client/services/api.js` - Central Axios instance with interceptors

### Configuration
```javascript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### Request Interceptor
- Logs requests in development mode
- Can add custom headers if needed

### Response Interceptor
- Automatically refreshes token on 401 errors
- Queues requests during token refresh
- Redirects to login if refresh fails
- Logs errors with context

---

## Migration Examples

### Example 1: Simple GET Request

**Before (fetch):**
```javascript
const response = await fetch('/api/participants');
if (!response.ok) {
  throw new Error('Failed to fetch participants');
}
const data = await response.json();
```

**After (axios):**
```javascript
import api from './services/api';

const { data } = await api.get('/participants');
// data is already parsed JSON!
```

---

### Example 2: POST Request

**Before (fetch):**
```javascript
const response = await fetch('/api/participants', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({ name: 'John', role: 'Teilnehmer*in' })
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.message);
}

const data = await response.json();
```

**After (axios):**
```javascript
import api from './services/api';

const { data } = await api.post('/participants', {
  name: 'John',
  role: 'Teilnehmer*in'
});
// Automatically stringified and parsed!
```

---

### Example 3: PUT Request

**Before (fetch):**
```javascript
const response = await fetch(`/api/participants/${id}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify(participantData)
});

const data = await response.json();
```

**After (axios):**
```javascript
import api from './services/api';

const { data } = await api.put(`/participants/${id}`, participantData);
```

---

### Example 4: DELETE Request

**Before (fetch):**
```javascript
const response = await fetch(`/api/participants/${id}`, {
  method: 'DELETE',
  credentials: 'include'
});

if (!response.ok) {
  throw new Error('Delete failed');
}
```

**After (axios):**
```javascript
import api from './services/api';

await api.delete(`/participants/${id}`);
```

---

### Example 5: Error Handling

**Before (fetch):**
```javascript
try {
  const response = await fetch('/api/participants');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }
  const data = await response.json();
} catch (error) {
  console.error('Error:', error.message);
}
```

**After (axios):**
```javascript
import api, { getErrorMessage } from './services/api';

try {
  const { data } = await api.get('/participants');
} catch (error) {
  const message = getErrorMessage(error);
  console.error('Error:', message);
}
```

---

### Example 6: Custom Headers

**Before (fetch):**
```javascript
const response = await fetch('/api/upload', {
  method: 'POST',
  headers: {
    'X-Custom-Header': 'value'
  },
  credentials: 'include',
  body: formData
});
```

**After (axios):**
```javascript
import api from './services/api';

const { data } = await api.post('/upload', formData, {
  headers: {
    'X-Custom-Header': 'value',
    'Content-Type': 'multipart/form-data'
  }
});
```

---

### Example 7: With Query Parameters

**Before (fetch):**
```javascript
const params = new URLSearchParams({ limit: 100, role: 'Teilnehmer*in' });
const response = await fetch(`/api/participants?${params}`);
const data = await response.json();
```

**After (axios):**
```javascript
import api from './services/api';

const { data } = await api.get('/participants', {
  params: {
    limit: 100,
    role: 'Teilnehmer*in'
  }
});
```

---

## Already Migrated

✅ **client/services/authService.js**
- `login()` - Uses `api.post('/auth/login')`
- `logout()` - Uses `api.post('/auth/logout')`
- `getCurrentUser()` - Uses `api.get('/auth/me')`
- `authenticatedRequest()` - Now uses axios (deprecated, use api directly)

✅ **client/services/tokenRefreshService.js**
- **DEPRECATED** - Functionality moved to axios interceptors
- File renamed to `.deprecated`

✅ **client/App.jsx**
- Removed import of `tokenRefreshService`
- Axios interceptors handle token refresh automatically

---

## Remaining Work

### Files Still Using `fetch`

To find files that still use fetch:
```bash
grep -r "fetch(" client/ --include="*.js" --include="*.jsx" | grep -v node_modules
```

### Common Patterns to Migrate

1. **Custom Hooks** (client/hooks/*)
   - Most hooks use fetch indirectly via authService
   - No migration needed if using authService methods

2. **Service Files** (client/services/*)
   - Check for direct fetch calls
   - Replace with api.get/post/put/delete

3. **Components** (client/components/*)
   - Usually use hooks, not direct fetch
   - Check for any direct API calls

---

## Helper Functions

### getErrorMessage(error)
Extracts user-friendly error message from Axios error:
```javascript
import { getErrorMessage } from './services/api';

try {
  await api.get('/participants');
} catch (error) {
  const message = getErrorMessage(error);
  // message = "Participants not found" (from response.data.error)
  // or "Network error" (if no response)
  // or "Timeout" (if request timed out)
}
```

### isNetworkError(error)
Check if error is a network error:
```javascript
import { isNetworkError } from './services/api';

try {
  await api.get('/participants');
} catch (error) {
  if (isNetworkError(error)) {
    alert('No internet connection');
  }
}
```

### isTimeoutError(error)
Check if error is a timeout:
```javascript
import { isTimeoutError } from './services/api';

try {
  await api.get('/participants');
} catch (error) {
  if (isTimeoutError(error)) {
    alert('Request took too long');
  }
}
```

---

## Token Refresh Flow

### How It Works

```
┌─────────────────┐
│  API Request    │
│  (401 response) │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Is Already          │  YES   ┌──────────────────┐
│ Refreshing?         │───────▶│ Queue Request    │
└────────┬────────────┘        └────────┬─────────┘
         │ NO                            │
         ▼                               │
┌─────────────────────┐                 │
│ Set isRefreshing    │                 │
│ = true              │                 │
└────────┬────────────┘                 │
         │                               │
         ▼                               │
┌─────────────────────┐                 │
│ Call /auth/refresh  │                 │
└────────┬────────────┘                 │
         │                               │
    ┌────┴────┐                         │
    │ Success │ Failure                 │
    ▼         ▼                         │
┌────────┐  ┌──────────┐               │
│ Process│  │ Redirect │               │
│ Queue  │  │ to Login │               │
└───┬────┘  └──────────┘               │
    │                                   │
    │◀──────────────────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Retry Original      │
│ Request             │
└─────────────────────┘
```

### Key Features

1. **Single Refresh** - Only one refresh attempt at a time
2. **Request Queue** - Simultaneous requests wait for refresh
3. **Auto-Retry** - Original request automatically retries after refresh
4. **Graceful Failure** - Redirects to login if refresh fails

---

## Configuration

### Timeout
Default: 30 seconds
```javascript
// Change globally
api.defaults.timeout = 60000; // 60 seconds

// Change per-request
await api.get('/participants', { timeout: 10000 });
```

### Base URL
Set via environment variable:
```bash
# .env.development
VITE_API_URL=http://localhost:3005/api

# .env.production
VITE_API_URL=https://szene.slam25.de/api
```

### Credentials
Always included (withCredentials: true) for cookie-based auth.

---

## Debugging

### Enable Request Logging
Automatically enabled in development mode:
```javascript
// Logs in browser console:
[DEBUG] API Request { method: 'GET', url: '/participants' }
[DEBUG] API Response { status: 200, url: '/participants' }
```

### Check Network Tab
Axios requests appear in browser DevTools Network tab with clear naming.

### Use Axios Debug Mode
```javascript
// In browser console:
import api from './services/api';
api.defaults.headers.common['X-Debug'] = 'true';
```

---

## Testing

### Mocking Axios in Tests

```javascript
import { vi } from 'vitest';
import api from './services/api';

// Mock successful response
vi.spyOn(api, 'get').mockResolvedValue({
  data: { participants: [] }
});

// Mock error response
vi.spyOn(api, 'post').mockRejectedValue({
  response: {
    status: 400,
    data: { error: 'Invalid input' }
  }
});
```

---

## Bundle Size Impact

- **Before (fetch):** 1,897 KB (gzip: 496 KB)
- **After (axios):** 1,933 KB (gzip: 510 KB)
- **Increase:** +36 KB raw (+14 KB gzipped)

This is acceptable because:
- ✅ Axios is ~13 KB gzipped
- ✅ Benefits outweigh size increase
- ✅ Better developer experience
- ✅ More reliable error handling

---

## Summary

### Migration Checklist

- [x] Install axios
- [x] Create api.js with interceptors
- [x] Migrate authService.js
- [x] Deprecate tokenRefreshService.js
- [x] Remove tokenRefreshService import from App.jsx
- [x] Test build
- [ ] Migrate remaining fetch calls (optional, can be done incrementally)
- [ ] Update tests to use axios mocks

### Key Takeaways

1. ✅ No more monkey-patching - cleaner codebase
2. ✅ Automatic token refresh - better UX
3. ✅ Better error handling - easier debugging
4. ✅ Race condition protection - more reliable
5. ✅ Minimal bundle size impact - worth it

---

## Need Help?

If you encounter issues during migration:

1. **Check axios documentation:** https://axios-http.com/docs/intro
2. **Review api.js interceptors:** client/services/api.js
3. **Check existing migration:** client/services/authService.js
4. **Test in development first:** `npm run dev`

---

**Happy Migrating! 🚀**
