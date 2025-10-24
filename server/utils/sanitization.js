// XSS Sanitization utilities for server routes
import xss from 'xss';
import logger from '../config/logger.js';

/**
 * Sanitize text input to prevent XSS attacks
 * @param {string} input - Raw input string
 * @returns {string} Sanitized string
 */
export const sanitizeText = (input) => {
  if (!input || typeof input !== 'string') return input;
  return xss(input, {
    whiteList: {}, // Remove all HTML tags
    stripIgnoreTag: true, // Remove all HTML
    stripIgnoreTagBody: ['script'] // Remove script tags and their content
  });
};

/**
 * Sanitize HTML content (allows safe HTML tags)
 * @param {string} input - Raw HTML input
 * @returns {string} Sanitized HTML
 */
export const sanitizeHtml = (input) => {
  if (!input || typeof input !== 'string') return input;
  return xss(input, {
    whiteList: {
      p: [],
      br: [],
      strong: [],
      em: [],
      ul: [],
      ol: [],
      li: [],
      h1: [],
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
      a: ['href', 'title'],
      blockquote: [],
      code: [],
      pre: []
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  });
};

/**
 * Sanitize URL input
 * @param {string} input - Raw URL
 * @returns {string} Sanitized URL
 */
export const sanitizeUrl = (input) => {
  if (!input || typeof input !== 'string') return input;
  // Remove any HTML/script content and trim
  return sanitizeText(input).trim();
};

/**
 * Sanitize object with text fields
 * @param {object} obj - Object to sanitize
 * @param {string[]} textFields - Fields to sanitize as text
 * @param {string[]} htmlFields - Fields to sanitize as HTML
 * @returns {object} Sanitized object
 */
export const sanitizeObject = (obj, textFields = [], htmlFields = []) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = { ...obj };
  
  // Sanitize text fields
  textFields.forEach(field => {
    if (sanitized[field] !== undefined) {
      sanitized[field] = sanitizeText(sanitized[field]);
    }
  });
  
  // Sanitize HTML fields
  htmlFields.forEach(field => {
    if (sanitized[field] !== undefined) {
      sanitized[field] = sanitizeHtml(sanitized[field]);
    }
  });
  
  return sanitized;
};

/**
 * Normalize incoming object keys to snake_case and warn on camelCase usage
 * - Moves values from camelCase keys to snake_case counterparts if missing
 * - Removes camelCase keys to enforce consistency
 */
const normalizeKeysToSnakeCase = (data, entityName = 'unknown') => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const normalized = { ...data };
  const camelCaseKeys = [];
  const toSnake = (key) => key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();

  Object.keys(data).forEach((key) => {
    if (/.*[A-Z].*/.test(key)) {
      const snake = toSnake(key);
      camelCaseKeys.push({ from: key, to: snake });
      if (normalized[snake] === undefined) {
        normalized[snake] = data[key];
      }
      delete normalized[key];
    }
  });

  if (camelCaseKeys.length > 0) {
    logger.warn('camelCase fields received; normalized to snake_case', {
      entity: entityName,
      fields: camelCaseKeys,
    });
  }
  return normalized;
};

/**
 * Sanitize request body for different entity types
 */
export const sanitizeEntity = {
  // Sanitize participant data
  participant: (data) => sanitizeObject(data, 
    ['name', 'role', 'region', 'pronouns', 'instagram', 'slug'],
    []
  ),
  
  // Sanitize news data
  news: (data) => {
    const normalized = normalizeKeysToSnakeCase(data, 'news');
    return sanitizeObject(normalized,
      ['title', 'excerpt', 'category', 'slug'],
      ['content']
    );
  },
  
  // Sanitize city tip data
  cityTip: (data) => sanitizeObject(data,
    ['name', 'category', 'description', 'address', 'website', 'slug'],
    []
  ),
  
  // Sanitize round data
  round: (data) => {
    const normalized = normalizeKeysToSnakeCase(data, 'round');
    return sanitizeObject(normalized,
      ['title', 'location', 'address', 'description', 'slug', 'photos_cloud_url'],
      []
    );
  },
  
  // Sanitize timetable data
  timetable: (data) => {
    const normalized = normalizeKeysToSnakeCase(data, 'timetable');
    return sanitizeObject(normalized,
      ['title', 'description', 'location', 'slug'],
      []
    );
  },
  
  // Sanitize link data
  link: (data) => sanitizeObject(data,
    ['title', 'description', 'url', 'icon', 'category', 'color'],
    []
  ),
  
  // Sanitize info page data
  infoPage: (data) => {
    const normalized = normalizeKeysToSnakeCase(data, 'infoPage');
    return sanitizeObject(normalized,
      ['title', 'content', 'slug'],
      []
    );
  },
  
  // Sanitize schnellzugriff data
  schnellzugriff: (data) => sanitizeObject(data,
    ['title', 'description', 'url', 'icon', 'color'],
    []
  ),
  
  // Sanitize breaking news data
  breakingNews: (data) => sanitizeObject(data,
    ['title', 'content'],
    []
  ),
  
  // Sanitize countdown config data
  countdown: (data) => sanitizeObject(data,
    ['title', 'subtitle', 'button_text', 'button_emoji', 'button_link'],
    []
  )
};
