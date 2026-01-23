/**
 * Centralized role constants for SLAM25 participants
 * Single source of truth for all role definitions
 */

// Allowed participant roles - matches database constraint
export const ALLOWED_PARTICIPANT_ROLES = [
  'Wettbewerb-Teilnehmer*in',
  'Supporter*in', 
  'SLAM25-Team',
  'SLAM-MC',
  'Moderator*in',
  'Techniker*in',
  'Fotograf*in',
  'Videograf*in',
  'Organisator*in',
  'Feature',
  'DJ'
];

// Role translations for UI display
export const ROLE_TRANSLATIONS = {
  'participant': 'Wettbewerb-Teilnehmer*in',
  'supporter': 'Supporter*in',
  'jury': 'Jury',
  'moderator': 'Moderator*in',
  'feature_artist': 'Feature Artist',
  'feature': 'Feature',
  'dj': 'DJ',
  'fotograf': 'Fotograf*in',
  'team': 'Team'
};

// Validation helper
export const isValidParticipantRole = (role) => {
  return ALLOWED_PARTICIPANT_ROLES.includes(role);
};

// Get role display label
export const getRoleDisplayLabel = (role) => {
  return ROLE_TRANSLATIONS[role] || role;
};
