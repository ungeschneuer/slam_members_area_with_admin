/**
 * Shared Instagram utility functions
 */

/**
 * Format Instagram URL to canonical format
 * @param {string} instagram - Instagram URL, handle, or username
 * @returns {string|null} - Canonical Instagram URL or null if invalid
 */
export const formatInstagramUrl = (instagram) => {
  if (!instagram) return null;
  
  // Remove any existing protocol and domain
  let username = instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '');
  
  // Remove leading @ if present
  username = username.replace(/^@/, '');
  
  // Remove trailing slash if present
  username = username.replace(/\/$/, '');
  
  return `https://instagram.com/${username}`;
};

/**
 * Normalize various user inputs (URL, @handle, handle) to a canonical Instagram profile URL
 * @param {string} input - User input (URL, @handle, or username)
 * @returns {string} - Canonical Instagram URL or empty string if invalid
 */
export const normalizeInstagramInput = (input) => {
  if (!input) return '';
  let value = String(input).trim();
  
  // Strip protocol/domain if a full URL was pasted
  value = value.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
  
  // Remove leading @
  value = value.replace(/^@/, '');
  
  // Remove trailing slash
  value = value.replace(/\/$/, '');
  
  if (!value) return '';
  return `https://instagram.com/${value}`;
};

/**
 * Extract username from Instagram URL
 * @param {string} instagramUrl - Full Instagram URL
 * @returns {string|null} - Username or null if invalid
 */
export const extractInstagramUsername = (instagramUrl) => {
  if (!instagramUrl) return null;
  
  const match = instagramUrl.match(/instagram\.com\/([^\/\?]+)/);
  return match ? match[1] : null;
};

/**
 * Validate Instagram URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid Instagram URL
 */
export const isValidInstagramUrl = (url) => {
  if (!url) return false;
  return /^https:\/\/instagram\.com\/[a-zA-Z0-9._]+$/.test(url);
};
