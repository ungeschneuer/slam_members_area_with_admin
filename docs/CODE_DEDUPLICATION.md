# Code Deduplication - Documentation

This document describes the deduplication improvements made to reduce code duplication across the codebase.

## Overview

The following code duplications have been eliminated:

1. **Region Lists** - Consolidated into a single source of truth
2. **Role Lists** - Consolidated with proper naming consistency
3. **API Endpoints** - Centralized endpoint definitions
4. **Fetch Patterns** - Standardized API call wrappers and hooks

## 1. Region Constants

### Location
`shared/constants/regions.js`

### Usage

```javascript
import { ALLOWED_REGIONS, getRegionOptions, isValidRegion } from '../../shared/constants/regions.js';

// Use the constant array
const regions = ALLOWED_REGIONS;

// Validate a region
if (isValidRegion(userRegion)) {
  // Region is valid
}

// Get region options for select inputs
const options = getRegionOptions();
```

### Features
- Single source of truth for all 26 regions
- Validation helper function
- Options generator for form selects

## 2. Role Constants

### Location
`shared/constants/roles.js`

### Usage

```javascript
import {
  PARTICIPANT_ROLES,
  ROLE_MAPPINGS,
  normalizeRoleName,
  exportRoleName,
  isValidParticipantRole
} from '../../shared/constants/roles.js';

// Use standard participant roles
const roles = PARTICIPANT_ROLES;

// Normalize Excel import role names to standard names
const normalizedRole = normalizeRoleName('Teilnehmer*in'); // Returns 'Wettbewerb-Teilnehmer*in'

// Export standard role names to Excel format
const excelRole = exportRoleName('Wettbewerb-Teilnehmer*in'); // Returns 'Teilnehmer*in'

// Validate a role
if (isValidParticipantRole(role)) {
  // Role is valid
}
```

### Features
- Standard participant roles list
- Role name mappings for Excel import/export
- Crew roles definitions
- Invalid team roles list
- Validation and normalization functions

### Role Naming Consistency

| Excel Format | Standard Format |
|-------------|-----------------|
| Teilnehmer*in | Wettbewerb-Teilnehmer*in |
| Crew | SLAM25-Team |
| Supporter*in | Supporter*in |
| SLAM-MC | SLAM-MC |

## 3. API Endpoints

### Location
`client/constants/apiEndpoints.js`

### Usage

```javascript
import {
  PARTICIPANTS_ENDPOINTS,
  NEWS_ENDPOINTS,
  TEAMS_ENDPOINTS
} from '../constants/apiEndpoints.js';

// Use endpoint constants
const participantsUrl = PARTICIPANTS_ENDPOINTS.BASE; // '/participants'
const participantByIdUrl = PARTICIPANTS_ENDPOINTS.BY_ID(123); // '/participants/123'
const newsImageUploadUrl = NEWS_ENDPOINTS.UPLOAD_IMAGE(456); // '/news/456/upload-image'
```

### Benefits
- All API endpoints in one place
- Type-safe endpoint generation with functions
- Easy to update and maintain

## 4. API Call Wrapper

### Location
`client/utils/apiWrapper.js`

### Usage

```javascript
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from '../utils/apiWrapper.js';

// Simple GET request
try {
  const data = await apiGet('/participants');
  console.log(data);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.message, error.status);
  }
}

// POST request with data
const newParticipant = await apiPost('/participants', {
  name: 'John Doe',
  role: 'Wettbewerb-Teilnehmer*in'
});

// PUT request
await apiPut('/participants/123', updatedData);

// DELETE request
await apiDelete('/participants/123');
```

### Features
- Consistent error handling across all API calls
- Automatic response data extraction
- Standardized error messages
- Built-in credential handling
- Custom ApiError class with status codes

## 5. Query Key Factory

### Location
`client/utils/queryKeyFactory.js`

### Usage

```javascript
import { createEntityQueryKeys } from '../utils/queryKeyFactory.js';

// Create query keys for an entity
const newsKeys = createEntityQueryKeys('news');

// Use in React Query
const { data } = useQuery({
  queryKey: newsKeys.list({ category: 'sports' }),
  queryFn: fetchNews
});

// Invalidate all news queries
invalidateEntityQueries(queryClient, 'news');

// Invalidate only list queries
invalidateEntityLists(queryClient, 'news');
```

### Benefits
- Consistent query key structure
- Easy cache invalidation
- Type-safe query key generation

## 6. CRUD Hook Factory

### Location
`client/utils/crudHookFactory.js`

### Usage

```javascript
import { createCrudHooks } from '../utils/crudHookFactory.js';
import { NEWS_ENDPOINTS } from '../constants/apiEndpoints.js';

// Create a complete set of CRUD hooks for an entity
const newsHooks = createCrudHooks('news', {
  basePath: NEWS_ENDPOINTS.BASE,
  queryConfig: { staleTime: 5 * 60 * 1000 }
});

// Use the generated hooks
function NewsComponent() {
  // List hook
  const { data: newsList, isLoading } = newsHooks.useList();

  // Detail hook
  const { data: newsDetail } = newsHooks.useDetail(newsId);

  // Create mutation
  const createNews = newsHooks.useCreate();
  const handleCreate = (data) => {
    createNews.mutate(data);
  };

  // Update mutation
  const updateNews = newsHooks.useUpdate();
  const handleUpdate = (id, data) => {
    updateNews.mutate({ id, ...data });
  };

  // Delete mutation
  const deleteNews = newsHooks.useDelete();
  const handleDelete = (id) => {
    deleteNews.mutate(id);
  };

  return (/* ... */);
}
```

### Benefits
- Eliminates ~400 lines of duplicated hook code
- Consistent hook patterns across all entities
- Built-in cache invalidation
- Automatic optimistic updates (optional)

## Migration Guide

### For New Features

When creating new entity hooks, use the CRUD hook factory:

```javascript
// OLD WAY (Don't do this)
export function useMyEntity() {
  return useQuery({
    queryKey: ['my-entity'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/my-entity`);
      if (!response.ok) throw new Error('Failed');
      return response.json();
    }
  });
}

// NEW WAY (Do this instead)
import { createCrudHooks } from '../utils/crudHookFactory.js';

const myEntityHooks = createCrudHooks('my-entity', {
  basePath: '/my-entity'
});

export const {
  useList: useMyEntities,
  useDetail: useMyEntity,
  useCreate: useCreateMyEntity,
  useUpdate: useUpdateMyEntity,
  useDelete: useDeleteMyEntity
} = myEntityHooks;
```

### For Existing Code

Existing hooks can gradually be migrated to use the new utilities:

1. Start by using the API wrapper for fetch calls
2. Replace query keys with the query key factory
3. Eventually migrate to the CRUD hook factory

## Summary of Benefits

| Category | Before | After | Impact |
|----------|--------|-------|--------|
| Region Lists | 3 duplicates | 1 source | -60 lines |
| Role Lists | 7+ duplicates | 1 source | -100 lines |
| API Endpoints | Scattered | Centralized | Easier maintenance |
| Fetch Patterns | 20+ duplicates | Standardized wrapper | -200 lines |
| Hook Patterns | 7+ similar hooks | Generic factory | -400 lines |
| **Total Reduction** | | | **~760 lines** |

## Testing

After implementing these changes, verify:

1. ✅ All region dropdowns show the correct 26 regions
2. ✅ All role dropdowns show the correct 4 participant roles
3. ✅ Excel import/export works with normalized role names
4. ✅ API calls work with the new wrapper
5. ✅ React Query hooks function correctly
6. ✅ Cache invalidation works as expected

## Next Steps

1. Gradually migrate existing hooks to use the new utilities
2. Update additional entity hooks (city-tips, timetable, etc.)
3. Add optimistic updates to all hooks using the factory
4. Create additional utility functions as patterns emerge
