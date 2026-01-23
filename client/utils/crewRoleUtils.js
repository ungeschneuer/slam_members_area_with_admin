// Crew Role Utilities - Centralized crew role management
// Handles both old format (crew + metadata.role) and new format (crew_* roles)

export const CREW_ROLES = {
  crew_ansprechpersonen: 'Ansprechpersonen OK',
  crew_locationmanagement: 'Locationmanagement',
  crew_abendleitung: 'Abendleitung',
  crew_einlass: 'Einlass (Team)',
  crew_runner: 'Runner',
  crew_backstage: 'Backstagbetreuung',
  crew_technik: 'Technik (Wettbewerb)',
  crew_wettbewerbsleitung: 'Wettbewerbsleitung',
  crew_buechertisch: 'Büchertisch',
  crew_social_media: 'Social Media',
  crew_fotos: 'Fotos',
  crew_dj: 'DJ'
};

// Check if a role is a crew role (new format OR old format)
export const isCrewRole = (role) => {
  if (!role || typeof role !== 'string') return false;
  return role === 'crew' || role.startsWith('crew_');
};

// Get label for any crew role
export const getCrewRoleLabel = (role) => {
  if (!role || typeof role !== 'string') return 'Unknown Role';
  if (role === 'crew') return 'SLAM25-Team-Mitglied'; // Backward compatibility
  return CREW_ROLES[role] || role.replace('crew_', '').replace(/_/g, ' ');
};

// Extract crew roles from assignment (handles both old and new format)
export const getCrewRolesFromAssignment = (assignment) => {
  // Null safety check
  if (!assignment || !assignment.roles || !Array.isArray(assignment.roles)) {
    return [];
  }
  
  const crewRoles = assignment.roles.filter(r => r && r.startsWith('crew_'));
  
  // Backward compatibility: check for old "crew" role with metadata.role
  if (assignment.roles.includes('crew') && assignment.metadata?.role) {
    return [assignment.metadata.role];
  }
  
  // New format: map crew_ roles to labels
  if (crewRoles.length > 0) {
    return crewRoles.map(getCrewRoleLabel);
  }
  
  // Fallback for old crew without metadata
  if (assignment.roles.includes('crew')) {
    return ['SLAM25-Team-Mitglied'];
  }
  
  return [];
};

// Check if assignment has any crew role
export const hasCrewRole = (assignment) => {
  if (!assignment || !assignment.roles || !Array.isArray(assignment.roles)) {
    return false;
  }
  return assignment.roles.some(isCrewRole);
};

// Role options for admin UI (memoized for performance)
const ROLE_OPTIONS = [
  { value: 'participant', label: 'Wettbewerb-Teilnehmer*in' },
  { value: 'jury', label: 'Jury' },
  { value: 'moderator', label: 'Moderator*in' },
  { value: 'feature_artist', label: 'Feature-Künstler*in' },
  { value: 'feature', label: 'Feature' },
  { value: 'dj', label: 'DJ' },
  { value: 'fotograf', label: 'Fotograf*in' },
  // Crew roles
  ...Object.entries(CREW_ROLES).map(([value, label]) => ({ 
    value, 
    label: `Crew: ${label}` 
  }))
];

export const getRoleOptions = () => ROLE_OPTIONS;
