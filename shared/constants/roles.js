/**
 * Central role definitions for SLAM25
 * This file is the single source of truth for all role-related constants
 */

/**
 * Participant roles - used for participant registration and management
 */
export const PARTICIPANT_ROLES = [
  'Wettbewerb-Teilnehmer*in',
  'Supporter*in',
  'SLAM25-Team',
  'SLAM-MC'
];

/**
 * Extended participant roles - includes additional database roles
 */
export const EXTENDED_PARTICIPANT_ROLES = [
  ...PARTICIPANT_ROLES,
  'Moderator*in',
  'Techniker*in',
  'Fotograf*in',
  'Videograf*in',
  'Organisator*in'
];

/**
 * Role name mappings for Excel import/export
 * Maps simplified names to full role names
 */
export const ROLE_MAPPINGS = {
  'Teilnehmer*in': 'Wettbewerb-Teilnehmer*in',
  'Crew': 'SLAM25-Team',
  'Supporter*in': 'Supporter*in',
  'SLAM-MC': 'SLAM-MC'
};

/**
 * Reverse mapping for Excel export
 */
export const ROLE_EXPORT_MAPPINGS = Object.fromEntries(
  Object.entries(ROLE_MAPPINGS).map(([key, value]) => [value, key])
);

/**
 * Invalid team roles - roles that cannot be assigned to teams
 */
export const INVALID_TEAM_ROLES = ['crew', 'moderator', 'jury'];

/**
 * Crew role definitions
 */
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

/**
 * Get crew role display names as array
 */
export const getCrewRoleNames = () => Object.values(CREW_ROLES);

/**
 * Get crew role keys as array
 */
export const getCrewRoleKeys = () => Object.keys(CREW_ROLES);

/**
 * Role translations (English to German)
 */
export const ROLE_TRANSLATIONS = {
  'participant': 'Wettbewerb-Teilnehmer*in',
  'supporter': 'Supporter*in',
  'jury': 'Jury',
  'moderator': 'Moderator*in',
  'feature_artist': 'Feature Artist',
  'team': 'Team'
};

/**
 * Validate if a role is a valid participant role
 * @param {string} role - The role to validate
 * @returns {boolean} True if valid
 */
export const isValidParticipantRole = (role) => {
  return PARTICIPANT_ROLES.includes(role);
};

/**
 * Validate if a role is a valid extended participant role
 * @param {string} role - The role to validate
 * @returns {boolean} True if valid
 */
export const isValidExtendedParticipantRole = (role) => {
  return EXTENDED_PARTICIPANT_ROLES.includes(role);
};

/**
 * Normalize role name for import (converts Excel names to standard names)
 * @param {string} role - The role name to normalize
 * @returns {string} Normalized role name
 */
export const normalizeRoleName = (role) => {
  return ROLE_MAPPINGS[role] || role;
};

/**
 * Convert role name for export (converts standard names to Excel names)
 * @param {string} role - The role name to convert
 * @returns {string} Converted role name
 */
export const exportRoleName = (role) => {
  return ROLE_EXPORT_MAPPINGS[role] || role;
};

/**
 * Check if a role is valid for team assignment
 * @param {string} role - The role to check
 * @returns {boolean} True if the role can be assigned to teams
 */
export const isValidTeamRole = (role) => {
  return !INVALID_TEAM_ROLES.includes(role?.toLowerCase());
};
