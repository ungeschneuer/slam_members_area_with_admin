# Multiple Crew Roles Implementation

## Overview
This document describes the implementation of multiple crew roles functionality for the SLAM25 Poetry Slam management system. The feature allows crew members to have multiple roles in a single round, with their name displayed once and all roles combined.

## ✅ Completed Implementation

### 1. Backend Infrastructure
- **Database Query Updates**: Modified `optimizedQueryService.js` to group crew roles by participant
- **API Endpoints**: Added role-specific removal endpoint (`DELETE /:roundId/crew/:participantId/:role`)
- **Error Handling**: Enhanced error messages for duplicate role attempts
- **Data Structure**: Backend returns crew data as `{ participantId, name, roles: [role1, role2] }`

### 2. Frontend Display Logic
- **Grouped Display**: Crew members show all roles combined (e.g., "John Doe (Locationmanagement, Jury)")
- **Role Management UI**: Modal interface for managing individual crew roles
- **Form State Management**: Real-time updates to form state when roles are added/removed
- **Visual Feedback**: Clear indication of multiple roles per person

### 3. User Interface Features
- **"Rollen verwalten" Button**: Added to each crew member for role management
- **Role Management Modal**: Complete UI for adding/removing individual roles
- **Current Roles Display**: Shows all current roles for a person
- **Add New Role**: Interface for adding additional roles to existing crew members
- **Remove Individual Roles**: Ability to remove specific roles while keeping others

### 4. Data Management
- **Form State Updates**: Real-time synchronization between UI and form state
- **Cache Invalidation**: Proper cache management for real-time updates
- **State Synchronization**: Frontend and backend state stay in sync

## ✅ Database Constraint Resolved

### Database Constraint Successfully Removed
The database constraint has been successfully removed and replaced:
- **Removed**: `UNIQUE(round_id, participant_id)` constraint
- **Added**: `UNIQUE(round_id, participant_id, role)` constraint
- **Result**: Multiple roles per person are now fully supported in the database

### Full Implementation
The system now provides complete functionality:
- Multiple roles are stored in the database
- UI displays all roles combined
- Role management modal allows adding/removing individual roles
- All changes are persisted to the database

## 🔧 Technical Implementation Details

### Backend Changes
1. **Query Optimization**: Updated SQL queries to group crew roles by participant
2. **API Enhancement**: Added role-specific removal endpoint
3. **Error Handling**: Improved error messages for constraint violations
4. **Data Structure**: Modified response format to include roles array

### Frontend Changes
1. **Component Updates**: Modified `AdminRounds.jsx` for role management
2. **State Management**: Added state for managing crew roles
3. **UI Components**: Created role management modal
4. **Form Integration**: Updated form handling for multiple roles

### Database Schema Changes Needed
```sql
-- Remove existing constraint
ALTER TABLE round_crew DROP CONSTRAINT round_crew_round_id_participant_id_key;

-- Add new constraint allowing multiple roles per person
ALTER TABLE round_crew ADD CONSTRAINT round_crew_round_id_participant_id_role_key 
UNIQUE (round_id, participant_id, role);
```

## 🚀 How to Use

### For Users
1. Navigate to the Rounds section in the admin interface
2. Create or edit a round
3. Add crew members with roles
4. Click "Rollen verwalten" to manage roles for a person
5. Add additional roles to the same person
6. Remove individual roles as needed

### For Developers
1. Remove the database constraint (see SQL above)
2. Test the complete workflow
3. Verify that multiple roles are properly saved to the database
4. Ensure the UI correctly displays grouped roles

## 📋 Next Steps

1. **Database Migration**: Remove the unique constraint to allow multiple roles per person
2. **Testing**: Verify the complete workflow once the constraint is removed
3. **Documentation**: Update user documentation with the new role management features
4. **Training**: Provide training materials for users on the new functionality

## 🎯 Expected Behavior After Database Fix

Once the database constraint is removed:
- Users can add multiple roles to the same person
- All roles are saved to the database
- Roles are displayed together in the UI
- Individual roles can be removed without affecting other roles
- The system maintains data integrity with the new constraint

## 📁 Files Modified

### Backend Files
- `server/services/optimizedQueryService.js` - Updated queries to group roles
- `server/routes/rounds.routes.js` - Added role-specific removal endpoint
- `client/services/junctionTableService.js` - Added role removal service
- `client/hooks/useJunctionTables.js` - Added role removal hook

### Frontend Files
- `client/components/admin/AdminRounds.jsx` - Main implementation of role management UI
- `database/migrations/2025-01-27_allow_multiple_crew_roles.sql` - Database migration

## 🔍 Testing

To test the current implementation:
1. Open the admin interface at `http://localhost:5183`
2. Navigate to the Rounds section
3. Create or edit a round
4. Add crew members and test the role management modal
5. Verify that roles are displayed correctly in the UI

Note: The current implementation works in the frontend but requires the database constraint to be removed for full functionality.
