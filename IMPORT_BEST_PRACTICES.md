# Import Best Practices - SLAM25 Project

## Overview

This document outlines the import best practices for the SLAM25 Poetry Slam members area project, designed to prevent missing import issues and maintain code quality.

## Core Principles

### ✅ **Single Source of Truth**
- Use centralized utilities instead of duplicating functions
- Import from shared constants for category definitions
- Avoid local implementations of shared functionality

### ✅ **Explicit Imports**
- Always import functions explicitly, even if they seem available
- Use named imports for better tree-shaking
- Avoid relying on global variables or implicit imports

### ✅ **Consistent Patterns**
- Follow established import order conventions
- Use relative imports for local files
- Use absolute imports for shared utilities

## Import Order Standards

### ✅ **Correct Import Order**
```javascript
// 1. React and React-related imports
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Third-party libraries
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// 3. Internal imports (alphabetical)
import { useAuth } from '../contexts/AuthContext.jsx';
import { useError } from '../hooks/useError.js';
import { fetchParticipants } from '../services/participantsService.js';
import { getCategoryIcon } from '../utils/categoryUtils.js';
```

### ❌ **Incorrect Import Order**
```javascript
// ❌ DON'T mix import types randomly
import { getCategoryIcon } from '../utils/categoryUtils.js';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext.jsx';
```

## Critical Import Patterns

### ✅ **Category Utilities**
```javascript
// ✅ Use centralized category utilities
import { getCategoryIcon, getCategoryLabel, getCategoryColor } from '../utils/categoryUtils.js';

// ✅ Use news-specific utilities for news components
import { getNewsCategoryIcon, getNewsCategoryLabel } from '../utils/newsCategories.js';

// ✅ Use shared constants for category definitions
import { getCategoryOptions, getCategoryByValue } from '../../shared/constants/cityTipsCategories.js';
```

### ❌ **Anti-Patterns to Avoid**
```javascript
// ❌ DON'T duplicate category functions locally
const getCategoryIconLocal = (category) => {
  const categoryData = getCategoryByValue(category);
  return categoryData?.icon || '📍';
};

// ❌ DON'T use functions without importing them
// This will cause ReferenceError at runtime
const icon = getCategoryByValue(category); // ❌ Missing import
```

## Import Validation

### ✅ **Build-Time Validation**
The project includes automatic import validation that runs during the build process:

```bash
# Manual validation
npm run validate-imports

# Automatic validation (runs during build)
npm run build
```

### ✅ **Validation Rules**
The validation script checks for:
- Missing imports of critical functions
- Local function definitions (to avoid false positives)
- Deep relative imports (warnings)
- Missing file extensions (warnings)

## Common Import Issues

### 🚨 **Missing Import Error**
```javascript
// ❌ This will cause: ReferenceError: getCategoryByValue is not defined
const categoryData = getCategoryByValue(category);

// ✅ Fix: Add the import
import { getCategoryByValue } from '../../shared/constants/cityTipsCategories.js';
const categoryData = getCategoryByValue(category);
```

### 🚨 **Circular Import Error**
```javascript
// ❌ DON'T create circular imports
// fileA.js
import { functionB } from './fileB.js';

// fileB.js  
import { functionA } from './fileA.js'; // ❌ Circular dependency
```

### 🚨 **Incorrect Import Path**
```javascript
// ❌ DON'T use incorrect paths
import { getCategoryIcon } from '../utils/categoryUtils'; // Missing .js extension

// ✅ Use correct paths
import { getCategoryIcon } from '../utils/categoryUtils.js';
```

## Best Practices by Component Type

### ✅ **React Components**
```javascript
// ✅ Standard component imports
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import LoadingSpinner from './LoadingSpinner.jsx';
import { ErrorMessage } from './StatusMessages.jsx';
import { getCategoryIcon } from '../utils/categoryUtils.js';
```

### ✅ **Utility Functions**
```javascript
// ✅ Utility function imports
import { getCategoryByValue } from '../../shared/constants/cityTipsCategories.js';
import { getNewsCategoryIcon } from '../utils/newsCategories.js';
```

### ✅ **Service Functions**
```javascript
// ✅ Service function imports
import { fetchParticipants } from '../services/participantsService.js';
import { geocodingService } from '../services/geocodingService.js';
```

### ✅ **Admin Components**
```javascript
// ✅ Admin component imports
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import TextInput from '../forms/TextInput.jsx';
import SelectInput from '../forms/SelectInput.jsx';
import { getCategoryOptions } from '../../../shared/constants/cityTipsCategories.js';
import { getCategoryIcon } from '../../utils/categoryUtils.js';
```

## File Extension Guidelines

### ✅ **Always Include Extensions**
```javascript
// ✅ Include .js/.jsx extensions for relative imports
import LoadingSpinner from './LoadingSpinner.jsx';
import { getCategoryIcon } from '../utils/categoryUtils.js';
import { useAuth } from '../contexts/AuthContext.jsx';
```

### ❌ **Don't Omit Extensions**
```javascript
// ❌ DON'T omit extensions (can cause issues)
import LoadingSpinner from './LoadingSpinner';
import { getCategoryIcon } from '../utils/categoryUtils';
```

## Shared Constants Usage

### ✅ **Category Constants**
```javascript
// ✅ Import from shared constants
import { 
  CITY_TIPS_CATEGORIES,
  getCategoryByValue,
  getCategoryOptions,
  getCategoryHexColor
} from '../../shared/constants/cityTipsCategories.js';
```

### ✅ **Schema Constants**
```javascript
// ✅ Import from shared schemas
import { 
  createValidationSchema,
  getDefaultValues 
} from '../../../shared/schemas/validationFactory.js';
```

## Error Prevention

### ✅ **Pre-Build Validation**
```bash
# Always run validation before committing
npm run validate-imports

# Validation runs automatically during build
npm run build
```

### ✅ **IDE Configuration**
Configure your IDE to:
- Show import errors in real-time
- Auto-import missing functions
- Highlight unused imports
- Suggest correct import paths

### ✅ **Code Review Checklist**
- [ ] All functions are properly imported
- [ ] Import order follows project conventions
- [ ] No circular dependencies
- [ ] File extensions are included
- [ ] Shared utilities are used instead of local duplicates

## Troubleshooting

### 🔧 **Common Issues**

#### Missing Import Error
```bash
# Error: ReferenceError: getCategoryByValue is not defined
# Solution: Add the missing import
import { getCategoryByValue } from '../../shared/constants/cityTipsCategories.js';
```

#### Build Validation Failure
```bash
# Error: Import validation failed!
# Solution: Run validation to see specific issues
npm run validate-imports
```

#### Circular Import Error
```bash
# Error: Circular dependency detected
# Solution: Refactor to remove circular dependency
```

### 🔧 **Debugging Tools**

#### Manual Validation
```bash
# Check specific files
npm run validate-imports

# Check build process
npm run build
```

#### IDE Integration
- Use VS Code with ESLint extension
- Enable TypeScript checking for better import validation
- Use import/export IntelliSense

## Migration Guide

### 🔄 **From Local Functions to Centralized Utilities**

#### Before (❌ Duplicated Code)
```javascript
// Multiple components with identical functions
const getCategoryIconLocal = (category) => {
  const categoryData = getCategoryByValue(category);
  return categoryData?.icon || '📍';
};
```

#### After (✅ Centralized)
```javascript
// Import centralized utility
import { getCategoryIcon } from '../utils/categoryUtils.js';

// Use centralized function
const icon = getCategoryIcon(category, 'cityTip');
```

## Performance Considerations

### ✅ **Tree Shaking**
```javascript
// ✅ Use named imports for better tree shaking
import { getCategoryIcon, getCategoryLabel } from '../utils/categoryUtils.js';

// ❌ DON'T use wildcard imports (prevents tree shaking)
import * as categoryUtils from '../utils/categoryUtils.js';
```

### ✅ **Lazy Loading**
```javascript
// ✅ Use dynamic imports for large utilities
const categoryUtils = await import('../utils/categoryUtils.js');
```

## Summary

Following these import best practices ensures:
- **No runtime errors** from missing imports
- **Consistent code quality** across the project
- **Easy maintenance** with centralized utilities
- **Better performance** with proper tree shaking
- **Developer productivity** with clear patterns

## Remember

> "Explicit is better than implicit" - Python Zen

**Always import what you use.**
**Use centralized utilities.**
**Follow established patterns.**
**Validate before building.**
