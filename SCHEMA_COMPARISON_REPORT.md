# Database Schema Comparison Report
**Date**: 2025-10-27  
**Comparison**: Development vs Production Database  
**Purpose**: Identify and fix schema mismatches

## Executive Summary

The schema comparison between development and production databases revealed **3 critical differences** that need to be addressed:

1. **Missing Column**: `sort_order` in `timetable_entries` table
2. **Missing Index**: `idx_timetable_sort_order` 
3. **Constraint Syntax Differences**: Minor syntax variations in CHECK constraints

## Detailed Findings

### 1. Missing Column in Production

**Table**: `timetable_entries`  
**Missing Column**: `sort_order integer DEFAULT 0`

**Impact**: 
- Production lacks the sort order functionality for timetable entries
- This affects the display order of timetable items
- May cause inconsistent user experience

**Status**: ❌ **CRITICAL** - Missing functionality

### 2. Missing Index in Production

**Missing Index**: `idx_timetable_sort_order`  
**Definition**: `CREATE INDEX idx_timetable_sort_order ON timetable_entries USING btree (sort_order)`

**Impact**:
- Performance degradation when sorting timetable entries
- Slower queries involving sort_order column
- Potential scalability issues

**Status**: ❌ **HIGH** - Performance impact

### 3. Constraint Syntax Differences

**Tables Affected**:
- `city_tips` - `city_tips_status_check`
- `participants` - `participants_role_check` 
- `schnellzugriff_links` - `schnellzugriff_links_color_check`

**Issue**: 
- Development uses: `ARRAY['value'::character varying]`
- Production uses: `ARRAY[('value'::character varying)::text]`

**Impact**:
- Functionally equivalent constraints
- Different internal representation
- No functional difference

**Status**: ⚠️ **LOW** - Cosmetic difference only

## Migration Script Generated

A migration script has been created to fix the critical issues:

```sql
-- Migration: Fix schema mismatches between dev and prod
-- Date: 2025-10-27 01:36:00
-- Description: Add missing columns, indexes, and constraints to production

BEGIN;

-- Add missing column to timetable_entries table
ALTER TABLE timetable_entries ADD COLUMN sort_order integer DEFAULT 0;

-- Add missing index for sort_order
CREATE INDEX idx_timetable_sort_order ON timetable_entries USING btree (sort_order);

-- Add comment to document the changes
COMMENT ON COLUMN timetable_entries.sort_order IS 'Sort order for timetable entries display';

COMMIT;
```

## Recommended Actions

### Immediate Actions Required

1. **Apply Migration Script**
   ```bash
   # Upload and apply the migration
   scp fix_schema_mismatches.sql slam25@slam25.uber.space:~/slam25/
   ssh slam25@slam25.uber.space "cd slam25 && PGPASSWORD=gXEv9o2.dZ6yCicRCKKeLiHzfdoZxGLE psql -h localhost -p 5432 -U szenesql -d slam25_szene -f fix_schema_mismatches.sql"
   ```

2. **Register Migration**
   ```bash
   # Mark the migration as applied
   ssh slam25@slam25.uber.space "cd slam25 && ./scripts/migration-helper.sh mark-applied fix_schema_mismatches.sql"
   ```

3. **Verify Changes**
   ```bash
   # Verify the changes were applied
   ssh slam25@slam25.uber.space "PGPASSWORD=gXEv9o2.dZ6yCicRCKKeLiHzfdoZxGLE psql -h localhost -p 5432 -U szenesql -d slam25_szene -c '\d timetable_entries'"
   ```

### Optional Actions

4. **Update Constraint Syntax** (Low Priority)
   - The constraint differences are cosmetic only
   - No functional impact
   - Can be addressed in future migrations if desired

## Risk Assessment

| Issue | Risk Level | Impact | Mitigation |
|-------|------------|--------|------------|
| Missing `sort_order` column | **HIGH** | Feature missing in production | Apply migration immediately |
| Missing index | **MEDIUM** | Performance degradation | Apply migration immediately |
| Constraint syntax differences | **LOW** | No functional impact | Optional future update |

## Testing Recommendations

After applying the migration:

1. **Functional Testing**
   - Test timetable sorting functionality
   - Verify sort order is working correctly
   - Check that existing data has default sort_order values

2. **Performance Testing**
   - Verify index is being used in queries
   - Check query performance with sort_order operations

3. **Data Validation**
   - Ensure all existing timetable entries have sort_order = 0
   - Verify new entries get proper sort_order values

## Prevention Measures

To prevent future schema mismatches:

1. **Always run migrations** after code changes
2. **Use the improved migration system** with proper tracking
3. **Regular schema comparisons** between environments
4. **Automated testing** of schema changes

## Files Generated

- `dev_schema.sql` - Development database schema
- `prod_schema.sql` - Production database schema  
- `fix_schema_mismatches.sql` - Migration script to fix differences
- `scripts/compare-schemas.sh` - Schema comparison tool

## Next Steps

1. ✅ **Review this report**
2. ⏳ **Apply migration script to production**
3. ⏳ **Verify changes are working**
4. ⏳ **Update migration tracking**
5. ⏳ **Test functionality**

---

**Report Generated By**: Schema Comparison Tool  
**Tool Version**: 1.0  
**Database Versions**: 
- Development: PostgreSQL (local)
- Production: PostgreSQL (Uberspace)