// XSS Sanitization utilities for server routes
import xss from 'xss';
import logger from '../config/logger.js';

/**
 * Sanitize plain text input (no HTML allowed, preserves special characters like &)
 * @param {string} input - Raw plain text input
 * @returns {string} Sanitized plain text
 */
export const sanitizePlainText = (input) => {
  if (!input || typeof input !== 'string') return input;
  
  // For plain text: just remove HTML tags and dangerous patterns
  // This preserves special characters like &, ä, ö, ü, ß
  return input
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Sanitize text input to prevent XSS attacks
 * @deprecated Use sanitizePlainText() for titles/names or sanitizeHtml() for content
 * @param {string} input - Raw input string
 * @returns {string} Sanitized string
 */
export const sanitizeText = (input) => {
  // For backward compatibility, use plain text sanitization
  return sanitizePlainText(input);
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
  // URLs are plain text, not HTML
  return sanitizePlainText(input).trim();
};

/**
 * Sanitize object with text fields
 * @param {object} obj - Object to sanitize
 * @param {string[]} plainTextFields - Fields to sanitize as plain text (titles, names)
 * @param {string[]} htmlFields - Fields to sanitize as HTML (content)
 * @returns {object} Sanitized object
 */
export const sanitizeObject = (obj, plainTextFields = [], htmlFields = []) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = { ...obj };
  
  // Sanitize plain text fields (preserves & and special characters)
  plainTextFields.forEach(field => {
    if (sanitized[field] !== undefined) {
      sanitized[field] = sanitizePlainText(sanitized[field]);
    }
  });
  
  // Sanitize HTML fields (uses xss library)
  htmlFields.forEach(field => {
    if (sanitized[field] !== undefined) {
      sanitized[field] = sanitizeHtml(sanitized[field]);
    }
  });
  
  return sanitized;
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
  news: (data) => sanitizeObject(data,
    ['title', 'excerpt', 'category', 'slug'],
    ['content']
  ),
  
  // Sanitize city tip data
  cityTip: (data) => sanitizeObject(data,
    ['name', 'category', 'description', 'address', 'website', 'slug'],
    []
  ),
  
  // Sanitize round data
  round: (data) => sanitizeObject(data,
    ['title', 'location', 'address', 'description', 'slug', 'photos_cloud_url'],
    []
  ),
  
  // Sanitize timetable data
  timetable: (data) => sanitizeObject(data,
    ['title', 'description', 'location', 'address', 'slug'],
    []
  ),
  
  // Sanitize link data
  link: (data) => {
    // Preserve boolean and number fields
    const sanitized = sanitizeObject(data,
      ['title', 'description', 'url', 'icon', 'category', 'color'],
      []
    );
    
    // Preserve fields that shouldn't be sanitized
    if (data.sortOrder !== undefined) sanitized.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) sanitized.isActive = data.isActive;
    if (data.isExternal !== undefined) sanitized.isExternal = data.isExternal;
    if (data.sort_order !== undefined) sanitized.sort_order = data.sort_order;
    if (data.is_active !== undefined) sanitized.is_active = data.is_active;
    if (data.is_external !== undefined) sanitized.is_external = data.is_external;
    
    return sanitized;
  },
  
  // Sanitize info page data
  infoPage: (data) => {
    // Sanitize additional_links array
    if (data.additional_links && Array.isArray(data.additional_links)) {
      data.additional_links = data.additional_links.map(link => ({
        title: sanitizeText(link.title || ''),
        url: sanitizeUrl(link.url || '')
      }));
    }
    
    return sanitizeObject(data,
      ['title', 'content', 'slug', 'file_url', 'file_description'],
      []
    );
  },
  
  // Sanitize schnellzugriff data
  schnellzugriff: (data) => {
    // Preserve boolean and number fields
    const sanitized = sanitizeObject(data,
      ['title', 'description', 'url', 'icon', 'color'],
      []
    );
    
    // Preserve fields that shouldn't be sanitized
    if (data.sortOrder !== undefined) sanitized.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) sanitized.isActive = data.isActive;
    if (data.isExternal !== undefined) sanitized.isExternal = data.isExternal;
    if (data.sort_order !== undefined) sanitized.sort_order = data.sort_order;
    if (data.is_active !== undefined) sanitized.is_active = data.is_active;
    if (data.is_external !== undefined) sanitized.is_external = data.is_external;
    
    return sanitized;
  },
  
  // Sanitize breaking news data
  breakingNews: (data) => sanitizeObject(data,
    ['title', 'content'],
    []
  ),
  
  // Sanitize countdown config data
  countdown: (data) => sanitizeObject(data,
    ['title', 'subtitle', 'button_text', 'button_emoji', 'button_link', 'target_date'],
    ['is_active']
  )
};
