// Consolidated normalization utilities
// Replaces multiple normalization approaches across routes

/**
 * Normalize Instagram handle
 * @param {string} instagram - Instagram handle
 * @returns {string|null} Normalized Instagram handle or null
 */
export const normalizeInstagram = (instagram) => {
  try {
    if (!instagram || typeof instagram !== 'string') return null;
    
    let value = String(instagram).trim();
    
    // Handle empty string after trim
    if (!value) return null;
    
    // Strip protocol/domain if a full URL was pasted
    value = value.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
    
    // Remove multiple leading @ symbols (fix double @@ issue)
    value = value.replace(/^@+/, '');
    
    // Remove trailing slash
    value = value.replace(/\/$/, '');
    
    // Handle empty string after cleaning
    if (!value) return null;
    
    // Convert to lowercase for consistency
    return value.toLowerCase();
  } catch (error) {
    // Log warning but don't throw - graceful degradation
    logger.warn('Instagram normalization failed:', error);
    return null;
  }
};

/**
 * Normalize URL
 * @param {string} url - URL string
 * @returns {string|null} Normalized URL or null
 */
export const normalizeUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  
  // Add protocol if missing
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  
  return trimmed;
};

/**
 * Normalize slug
 * @param {string} slug - Slug string
 * @returns {string} Normalized slug
 */
export const normalizeSlug = (slug) => {
  if (!slug || typeof slug !== 'string') return '';
  return slug.trim().toLowerCase().replace(/\s+/g, '-');
};

/**
 * Normalize tags array
 * @param {any} tags - Tags input (string, array, or other)
 * @returns {string[]} Normalized tags array
 */
export const normalizeTags = (tags) => {
  if (Array.isArray(tags)) {
    return tags.filter(tag => typeof tag === 'string' && tag.trim()).map(tag => tag.trim());
  }
  if (typeof tags === 'string' && tags.trim()) {
    return [tags.trim()];
  }
  return [];
};

/**
 * Normalize JSON field
 * @param {any} value - JSON input
 * @param {any} fallback - Fallback value
 * @returns {any} Normalized JSON value
 */
export const normalizeJson = (value, fallback = {}) => {
  if (value === undefined || value === null) {
    return fallback;
  }
  
  if (typeof value === 'string') {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }
  
  return value;
};

/**
 * Normalize boolean field
 * @param {any} value - Boolean input
 * @param {boolean} fallback - Fallback value
 * @returns {boolean} Normalized boolean
 */
export const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return fallback;
};

/**
 * Normalize integer field
 * @param {any} value - Integer input
 * @param {number} fallback - Fallback value
 * @returns {number} Normalized integer
 */
export const normalizeInteger = (value, fallback = 0) => {
  if (typeof value === 'number') return Math.floor(value);
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

/**
 * Normalize string field
 * @param {any} value - String input
 * @param {string} fallback - Fallback value
 * @returns {string} Normalized string
 */
export const normalizeString = (value, fallback = '') => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return fallback;
};

/**
 * Entity-specific normalizers
 */
export const entityNormalizers = {
  participant: (data) => ({
    ...data,
    instagram: normalizeInstagram(data.instagram),
    slug: normalizeSlug(data.slug)
  }),
  
  news: (data) => ({
    ...data,
    tags: normalizeTags(data.tags),
    slug: normalizeSlug(data.slug)
  }),
  
  cityTip: (data) => ({
    ...data,
    website: normalizeUrl(data.website),
    slug: normalizeSlug(data.slug),
    opening_hours: normalizeJson(data.opening_hours, {}),
    contact_info: normalizeJson(data.contact_info, {}),
    images: normalizeJson(data.images, [])
  }),
  
  round: (data) => ({
    ...data,
    slug: normalizeSlug(data.slug),
    assignments: normalizeJson(data.assignments, []),
    groups: normalizeJson(data.groups, [])
  }),
  
  timetable: (data) => ({
    ...data,
    slug: normalizeSlug(data.slug),
    additional_links: normalizeJson(data.additional_links, [])
  }),
  
  link: (data) => ({
    ...data,
    url: normalizeUrl(data.url),
    isExternal: normalizeBoolean(data.isExternal, false),
    isActive: normalizeBoolean(data.isActive, true),
    sortOrder: normalizeInteger(data.sortOrder, 0)
  }),
  
  infoPage: (data) => ({
    ...data,
    slug: normalizeSlug(data.slug),
    tags: normalizeTags(data.tags),
    is_published: normalizeBoolean(data.is_published, false),
    order: normalizeInteger(data.order, 0)
  }),
  
  schnellzugriff: (data) => ({
    ...data,
    url: normalizeUrl(data.url),
    isActive: normalizeBoolean(data.isActive, true),
    isExternal: normalizeBoolean(data.isExternal, false),
    sortOrder: normalizeInteger(data.sortOrder, 0)
  })
};
