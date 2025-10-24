<!-- e456b6d4-253f-4efd-a671-9eb871c60605 18a244ba-82d4-443e-bb37-749baa859f5c -->
# Gradual Simplification Migration Plan

## Phase 1: Remove WebSocket Real-time Infrastructure (Week 1)

### 1.1 Replace WebSocket with Simple Polling

- Remove Socket.io server setup from `server/server.js` (lines 11, 26, 68-100)
- Delete `server/services/websocketService.js` (492 lines of complex WebSocket logic)
- Delete `client/services/websocketService.js`
- Remove WebSocket state from `client/stores/useAppStore.js` (lines 22-33, 50+ lines of WS state)
- Remove `useSocketIOIntegration` hook from `client/hooks/`
- Remove `useCacheInvalidation` hook from `client/hooks/`

### 1.2 Implement Simple Polling Service

- Create `client/services/pollingService.js` with basic setInterval polling (every 30s)
- Update TanStack Query to use `refetchInterval: 30000` for auto-refresh
- Remove all WebSocket event emissions from API routes
- Remove `notifyDataUpdate()` calls from backend routes

**Impact**: Removes ~1500 lines of complex WebSocket code, simplifies state management

## Phase 2: Consolidate State Management (Week 1-2)

### 2.1 Remove Zustand Store

- Delete `client/stores/useAppStore.js` (278 lines)
- Delete `client/stores/useConfigStore.js`
- Delete `client/stores/index.js`
- Remove all Zustand imports from components

### 2.2 Migrate to React Query + Local State

- Keep TanStack Query for server state (already in use)
- Replace Zustand theme state with `localStorage` + `useState`
- Replace Zustand auth state with `useAuth` hook + context
- Replace Zustand UI state with local component state
- Update `client/App.jsx` to remove Zustand dependencies (lines 23-31)

**Impact**: Removes ~500 lines of state management code, single source of truth

## Phase 3: Simplify Database Schema (Week 2)

### 3.1 Create New Consolidated Schema

Create `database/migrations/2025-01-XX_consolidate_round_relations.sql`:

```sql
-- Create new consolidated table
CREATE TABLE round_assignments (
  id SERIAL PRIMARY KEY,
  round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  roles JSONB NOT NULL DEFAULT '[]', -- ["participant", "jury", "moderator", "crew", "feature_artist"]
  metadata JSONB DEFAULT '{}', -- {display_order: 0, description: "text"}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(round_id, participant_id)
);

CREATE INDEX idx_round_assignments_round ON round_assignments(round_id);
CREATE INDEX idx_round_assignments_participant ON round_assignments(participant_id);
CREATE INDEX idx_round_assignments_roles ON round_assignments USING GIN(roles);
```

### 3.2 Migrate Existing Data

Add to migration file:

```sql
-- Migrate round_participants
INSERT INTO round_assignments (round_id, participant_id, roles, created_at)
SELECT round_id, participant_id, '["participant"]'::jsonb, created_at
FROM round_participants;

-- Migrate round_crew (append to existing or create new)
INSERT INTO round_assignments (round_id, participant_id, roles, created_at)
SELECT round_id, participant_id, jsonb_build_array(role), created_at
FROM round_crew
ON CONFLICT (round_id, participant_id) 
DO UPDATE SET roles = round_assignments.roles || EXCLUDED.roles;

-- Migrate round_feature_artists
INSERT INTO round_assignments (round_id, participant_id, roles, metadata, created_at)
SELECT round_id, participant_id, '["feature_artist"]'::jsonb, 
       jsonb_build_object('display_order', display_order, 'description', description),
       created_at
FROM round_feature_artists
ON CONFLICT (round_id, participant_id)
DO UPDATE SET roles = round_assignments.roles || '["feature_artist"]'::jsonb,
              metadata = EXCLUDED.metadata;

-- Migrate round_moderation
INSERT INTO round_assignments (round_id, participant_id, roles, created_at)
SELECT round_id, participant_id, '["moderator"]'::jsonb, created_at
FROM round_moderation
ON CONFLICT (round_id, participant_id)
DO UPDATE SET roles = round_assignments.roles || '["moderator"]'::jsonb;

-- Drop old tables
DROP TABLE IF EXISTS round_participants CASCADE;
DROP TABLE IF EXISTS round_crew CASCADE;
DROP TABLE IF EXISTS round_feature_artists CASCADE;
DROP TABLE IF EXISTS round_moderation CASCADE;
```

### 3.3 Update Backend Routes

Rewrite `server/routes/rounds.routes.js` queries:

```javascript
// OLD: Multiple queries for different roles
const participants = await executeQuery('SELECT * FROM round_participants WHERE round_id = $1', [roundId]);
const crew = await executeQuery('SELECT * FROM round_crew WHERE round_id = $1', [roundId]);

// NEW: Single query with role filtering
const assignments = await executeQuery(`
  SELECT ra.*, p.name, p.region, p.instagram
  FROM round_assignments ra
  JOIN participants p ON ra.participant_id = p.id
  WHERE ra.round_id = $1
`, [roundId]);

// Parse roles in JavaScript
const participants = assignments.filter(a => a.roles.includes('participant'));
const crew = assignments.filter(a => a.roles.some(r => ['crew', 'moderator'].includes(r)));
```

### 3.4 Simplify Assignment Creation

Replace complex junction table logic:

```javascript
// OLD: Multiple INSERT statements
await executeQuery('INSERT INTO round_participants...', []);
await executeQuery('INSERT INTO round_crew...', []);

// NEW: Single INSERT with JSONB
await executeQuery(`
  INSERT INTO round_assignments (round_id, participant_id, roles, metadata)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (round_id, participant_id)
  DO UPDATE SET roles = round_assignments.roles || EXCLUDED.roles
`, [roundId, participantId, JSON.stringify(roles), JSON.stringify(metadata)]);
```

**Impact**: Reduces 4 tables to 1, simplifies queries by ~40%, eliminates complex transaction logic

## Phase 4: Streamline Admin Components (Week 2-3)

### 4.1 Consolidate Admin UI Components

- Merge `client/components/admin/ui/` components (13 files) into 3 core components:
- `AdminCard.jsx` (keep, enhance)
- `AdminForm.jsx` (merge FormField, EnhancedForm, ValidationSummary)
- `AdminTable.jsx` (merge LoadingTable, AdminTable)
- Delete redundant loading/error components (8 files)
- Delete `OperationLogViewer.jsx` (complex, rarely used)

### 4.2 Simplify Admin Dashboard

- Consolidate `client/components/admin/dashboard/` (4 files) into single `DashboardWidgets.jsx`
- Remove `AdminAnalytics.jsx` (complex, can be added later if needed)
- Remove `AdminPerformance.jsx` (not critical for development)
- Remove `AdminCache.jsx` (no longer needed without WebSocket)
- Keep core admin pages: Participants, Rounds, News, CityTips, Timetable, Links, InfoPages, Schnellzugriff

### 4.3 Simplify Rounds Admin

- Consolidate `client/components/admin/rounds/` (11 files) into 2 files:
- `RoundForm.jsx` (all form fields and basic management)
- `RoundsList.jsx` (list view)
- Remove separate management components (CrewManagement, FeatureArtistManagement, etc.)
- Integrate all management into single form with sections

**Impact**: Reduces 53 admin components to ~20, removes ~2000 lines of code

## Phase 5: Simplify API Routes (Week 3)

### 5.1 Consolidate Route Files

- Keep modular route structure in `server/routes/` (12 files is reasonable)
- Remove complex middleware chains
- Simplify authentication to basic JWT check
- Remove rate limiting complexity from `server/config/security.js`

### 5.2 Remove Unused Services

- Delete `server/services/optimizedQueryService.js` if over-engineered
- Simplify database queries to direct `executeQuery()` calls
- Remove caching logic (not needed without WebSocket)

**Impact**: Simplifies API layer, removes ~500 lines of middleware code

## Phase 6: Clean Up Frontend Architecture (Week 3-4)

### 6.1 Consolidate Custom Hooks

- Review `client/hooks/` (29 files)
- Keep essential hooks: `useParticipants`, `useRounds`, `useNews`, `useAuth`
- Remove WebSocket-related hooks
- Remove cache-related hooks
- Consolidate similar hooks

### 6.2 Simplify Services

- Keep: `authService.js`, `excelService.js`, `imageService.js`
- Remove: `websocketService.js`, `errorReportingService.js`, `operationLogger.js`
- Simplify `junctionTableService.js` for new schema

**Impact**: Reduces hooks from 29 to ~10, removes ~1000 lines

## Phase 7: Update Configuration & Build (Week 4)

### 7.1 Simplify Environment Configuration

- Clean up `.env` file (currently 175 lines)
- Remove WebSocket-related env vars
- Remove cache-related env vars
- Keep only essential: DB, JWT, API endpoints

### 7.2 Update Build Configuration

- Simplify `client/vite.config.js`
- Remove WebSocket build optimizations
- Update `package.json` scripts
- Remove unused dependencies (Socket.io, Zustand)

### 7.3 Update Documentation

- Update `README.md` with simplified architecture
- Remove WebSocket documentation
- Update API documentation
- Create migration guide

**Impact**: Cleaner configuration, smaller bundle size

## Phase 8: Remove Complex Cursor Rules & Documentation (Week 4)

### 8.1 Delete Over-Engineered Cursor Rules

Delete these rules that promote complexity:

- `.cursor/rules/architecture-patterns.mdc` (549 lines promoting over-engineering)
- `.cursor/rules/real-time-architecture.mdc` (WebSocket complexity)
- `.cursor/rules/performance-optimization.mdc` (premature optimization)
- `.cursor/rules/code-complexity-guidelines.mdc` (overly detailed)
- `.cursor/rules/development-standards.mdc` (470 lines of over-specification)
- `.cursor/rules/helper-functions.mdc` (promotes custom implementations)
- `.cursor/rules/helper-functions-vs-plugins.mdc` (confusing guidance)
- `.cursor/rules/api-route-patterns.mdc` (over-engineered patterns)
- `.cursor/rules/avoid-custom-implementations.mdc` (contradicts other rules)

### 8.2 Delete Complex Documentation Files

Remove documentation promoting complexity:

- `COMPLETE_FEATURE_INVENTORY.md` (837 lines, outdated)
- `STANDARDIZATION_ANALYSIS.md` (promotes over-engineering)
- `WEBSOCKET_AUTH_FIX_SUMMARY.md` (WebSocket-specific)
- `OPERATIONAL_HARDENING.md` (enterprise-level complexity)
- `DEEP_FINDINGS_REPORT.md` (over-analysis)
- `TOP_10_RISKS.md` (fear-driven development)
- `ROUNDS_COMPONENT_REWRITE_SUMMARY.md` (documents complexity)
- `IMPLEMENTATION_COMPLETE.md` (outdated)
- `MULTIPLE_CREW_ROLES_IMPLEMENTATION.md` (over-engineered solution)
- `E2E_TESTS_IMPLEMENTATION.md` (complex testing)
- `INTEGRATION_TESTS.md` (over-testing)
- `VERIFICATION_PLAN.md` (excessive validation)
- `TARGETED_PATCHES.md` (band-aids on complexity)

### 8.3 Create Simple Cursor Rules

Create new simplified rules:

- `.cursor/rules/simple-architecture.mdc` - Basic React + Express patterns
- `.cursor/rules/database-basics.mdc` - Simple PostgreSQL queries
- `.cursor/rules/admin-crud.mdc` - Basic CRUD patterns
- `.cursor/rules/keep-it-simple.mdc` - Anti-over-engineering guidance

### 8.4 Create Simple Documentation

Create minimal essential docs:

- `ARCHITECTURE.md` - Simple architecture overview (1 page)
- `DEVELOPMENT.md` - Basic development guide (1 page)
- `API.md` - Simple API documentation (1 page)

## Phase 9: Testing & Validation (Week 4)

### 9.1 Update Tests

- Remove WebSocket tests from `server/__tests__/`
- Update integration tests for new schema
- Test polling functionality
- Test all CRUD operations

### 9.2 Manual Testing

- Test all admin CRUD operations
- Test all public views
- Test authentication flow
- Test data migrations

### 9.3 Performance Testing

- Verify polling doesn't impact performance
- Check database query performance with new schema
- Monitor bundle size reduction

## Success Metrics

- **Code Reduction**: Remove ~5000-7000 lines of code (30-40% reduction)
- **Dependencies**: Remove Socket.io, Zustand (reduce bundle by ~200KB)
- **Complexity**: Reduce from 53 admin components to ~20
- **Database**: Consolidate 4 junction tables to 1
- **State Management**: Single source (React Query + local state)
- **Maintainability**: Simpler architecture, easier onboarding
- **Documentation**: Reduce from 20+ complex docs to 3 simple guides
- **Cursor Rules**: Reduce from 29 complex rules to 4 simple rules

## Rollback Strategy

- Keep backups of all deleted files in `backups/migration-2025/`
- Database migrations are reversible
- Git branches for each phase
- Can revert any phase independently

### To-dos

- [ ] Remove Socket.io server setup and WebSocket service from backend
- [ ] Remove WebSocket client service and related hooks from frontend
- [ ] Create simple polling service and update React Query configuration
- [ ] Remove Zustand store and migrate to React Query + local state
- [ ] Create migration to consolidate junction tables into single table with JSONB
- [ ] Update backend routes and services for new database schema
- [ ] Merge admin UI components from 13 files to 3 core components
- [ ] Consolidate dashboard components and remove analytics/performance pages
- [ ] Consolidate rounds admin from 11 files to 2 files
- [ ] Remove complex middleware chains and simplify authentication
- [ ] Reduce custom hooks from 29 to ~10 essential hooks
- [ ] Remove unused services and simplify remaining ones
- [ ] Simplify environment configuration and remove unused env vars
- [ ] Update Vite config and package.json, remove unused dependencies
- [ ] Update test suite for new architecture and remove WebSocket tests
- [ ] Perform comprehensive manual testing of all features
- [ ] Validate performance improvements and bundle size reduction
- [ ] Update README and create migration guide