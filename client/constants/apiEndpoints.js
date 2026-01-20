/**
 * Central API endpoint definitions for the client
 * This file is the single source of truth for all API endpoint paths
 */

/**
 * Authentication endpoints
 */
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  ME: '/auth/me'
};

/**
 * User authentication endpoints
 */
export const USER_AUTH_ENDPOINTS = {
  VERIFY: '/user-auth/verify',
  LOGOUT: '/user-auth/logout',
  STATUS: '/user-auth/status'
};

/**
 * Participants endpoints
 */
export const PARTICIPANTS_ENDPOINTS = {
  BASE: '/participants',
  SEARCH: '/participants/search',
  BY_ID: (id) => `/participants/${id}`,
  BY_SLUG: (slug) => `/participants/${slug}`,
  BULK_IMPORT: '/participants/bulk-import'
};

/**
 * Rounds endpoints
 */
export const ROUNDS_ENDPOINTS = {
  BASE: '/rounds',
  BY_ID: (id) => `/rounds/${id}`,
  PARTICIPANTS_BY_ROLE: (id, role) => `/rounds/${id}/participants/${role}`
};

/**
 * News endpoints
 */
export const NEWS_ENDPOINTS = {
  BASE: '/news',
  BREAKING_NEWS: '/news/breaking-news',
  BY_ID: (id) => `/news/${id}`,
  BY_SLUG: (slug) => `/news/${slug}`,
  UPLOAD_IMAGE: (id) => `/news/${id}/upload-image`,
  CREATE_BREAKING_NEWS: (id) => `/news/${id}/breaking-news`
};

/**
 * City tips endpoints
 */
export const CITY_TIPS_ENDPOINTS = {
  BASE: '/city-tips',
  BY_ID: (id) => `/city-tips/${id}`,
  BY_SLUG: (slug) => `/city-tips/${slug}`
};

/**
 * Timetable endpoints
 */
export const TIMETABLE_ENDPOINTS = {
  BASE: '/timetable',
  BY_ID: (id) => `/timetable/${id}`,
  BY_SLUG: (slug) => `/timetable/${slug}`,
  ADD_PARTICIPANT: (entryId) => `/timetable/${entryId}/participants`,
  REMOVE_PARTICIPANT: (entryId, participantId) => `/timetable/${entryId}/participants/${participantId}`,
  UPDATE_PARTICIPANT: (entryId, participantId) => `/timetable/${entryId}/participants/${participantId}`
};

/**
 * Links endpoints
 */
export const LINKS_ENDPOINTS = {
  BASE: '/links',
  BY_ID: (id) => `/links/${id}`
};

/**
 * Schnellzugriff endpoints
 */
export const SCHNELLZUGRIFF_ENDPOINTS = {
  BASE: '/schnellzugriff',
  BY_ID: (id) => `/schnellzugriff/${id}`,
  ADMIN_ALL: '/schnellzugriff/admin/all'
};

/**
 * Info pages endpoints
 */
export const INFO_PAGES_ENDPOINTS = {
  BASE: '/info-pages',
  PUBLISHED: '/info-pages/published',
  BY_ID: (id) => `/info-pages/${id}`,
  BY_SLUG: (slug) => `/info-pages/${slug}`,
  UPLOAD_FILE: (id) => `/info-pages/${id}/upload-file`,
  UPLOAD_IMAGE: (id) => `/info-pages/${id}/upload-image`,
  UPLOAD_PDF: (id) => `/info-pages/${id}/upload-pdf`
};

/**
 * Settings endpoints
 */
export const SETTINGS_ENDPOINTS = {
  BASE: '/settings',
  USER_PASSWORD: '/settings/user-password',
  USER_PASSWORD_STATUS: '/settings/user-password/status',
  DASHBOARD_TEXT: '/settings/dashboard-text'
};

/**
 * Teams endpoints
 */
export const TEAMS_ENDPOINTS = {
  BASE: '/teams',
  BY_ID: (id) => `/teams/${id}`,
  BY_SLUG: (slug) => `/teams/${slug}`,
  MEMBERS: (id) => `/teams/${id}/members`,
  REMOVE_MEMBER: (id, participantId) => `/teams/${id}/members/${participantId}`,
  BY_ROUND: (roundId) => `/teams/round/${roundId}`,
  BY_PARTICIPANT: (participantId) => `/teams/participant/${participantId}`
};

/**
 * Countdown config endpoints
 */
export const COUNTDOWN_ENDPOINTS = {
  BASE: '/countdown-config'
};

/**
 * Breaking news endpoints
 */
export const BREAKING_NEWS_ENDPOINTS = {
  BASE: '/breaking-news',
  BY_ID: (id) => `/breaking-news/${id}`
};

/**
 * Helper function to build full API URL
 * @param {string} endpoint - The endpoint path
 * @param {string} baseUrl - Optional base URL (defaults to API_URL from config)
 * @returns {string} Full API URL
 */
export function buildApiUrl(endpoint, baseUrl = null) {
  // If baseUrl is provided, use it; otherwise rely on runtime API_URL
  if (baseUrl) {
    return `${baseUrl}${endpoint}`;
  }
  // This will be imported at runtime from api.js
  return endpoint;
}
