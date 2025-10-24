/**
 * SQL Table Column Definitions
 * 
 * This file maintains a single source of truth for database table columns.
 * When a table schema changes, update the column list here and all queries
 * using these constants will automatically reflect the changes.
 * 
 * Usage:
 *   import { getColumns, TABLE_COLUMNS } from './tableColumns.js';
 *   
 *   // Get all columns for a table
 *   const columns = getColumns('news');
 *   const query = `SELECT ${columns} FROM news WHERE id = $1`;
 *   
 *   // Exclude specific columns (e.g., sensitive data)
 *   const publicColumns = getColumns('users', ['password_hash']);
 *   const query = `SELECT ${publicColumns} FROM users WHERE id = $1`;
 */

/**
 * Table column definitions
 * Each key is a table name, each value is an array of column names in that table
 */
export const TABLE_COLUMNS = {
  // News table columns
  news: [
    'id',
    'title',
    'content',
    'excerpt',
    'category',
    'priority',
    'tags',
    'status',
    'featured_image_url',
    'published_at',
    'is_breaking_news',
    'breaking_news_until',
    'slug',
    'created_at',
    'updated_at'
  ],
  
  // Participants table columns
  participants: [
    'id',
    'name',
    'role',
    'region',
    'pronouns',
    'instagram',
    'slug',
    'created_at',
    'updated_at'
  ],
  
  // City tips table columns
  city_tips: [
    'id',
    'name',
    'category',
    'description',
    'address',
    'latitude',
    'longitude',
    'price_range',
    'opening_hours',
    'contact_info',
    'website',
    'images',
    'tips',
    'status',
    'slug',
    'created_at',
    'updated_at'
  ],
  
  // Info pages table columns
  info_pages: [
    'id',
    'title',
    'slug',
    'content',
    'excerpt',
    'category',
    'display_order',
    'status',
    'featured_image_url',
    'meta_description',
    'tags',
    'is_published',
    'published_at',
    'created_at',
    'updated_at'
  ],
  
  // Rounds table columns
  rounds: [
    'id',
    'title',
    'location',
    'address',
    'description',
    'after_play_report',
    'photos_cloud_url',
    'competition_type',
    'total_jury_members',
    'status',
    'slug',
    'date',
    'start_time',
    'end_time',
    'version',
    'groups',
    'created_at',
    'updated_at'
  ],
  
  // Teams table columns
  teams: [
    'id',
    'name',
    'slug',
    'role',
    'instagram',
    'created_at',
    'updated_at'
  ],
  
  // Links table columns
  links: [
    'id',
    'title',
    'description',
    'url',
    'icon',
    'category',
    'is_external',
    'color',
    'sort_order',
    'is_active',
    'created_at',
    'updated_at'
  ],
  
  // Schnellzugriff links table columns
  schnellzugriff_links: [
    'id',
    'title',
    'description',
    'url',
    'icon',
    'color',
    'sort_order',
    'is_active',
    'is_external',
    'created_at',
    'updated_at'
  ],
  
  // Countdown config table columns
  countdown_config: [
    'id',
    'title',
    'subtitle',
    'target_date',
    'button_text',
    'button_emoji',
    'button_link',
    'is_active',
    'created_at',
    'updated_at'
  ],
  
  // Timetable entries table columns
  timetable_entries: [
    'id',
    'title',
    'description',
    'detailed_description',
    'location',
    'date',
    'time',
    'end_time',
    'type',
    'status',
    'internal_link',
    'round_id',
    'slug',
    'additional_links',
    'created_at',
    'updated_at'
  ],
  
  // Users table columns (excluding password_hash by default in public queries)
  users: [
    'id',
    'username',
    'email',
    'role',
    'is_active',
    'first_name',
    'last_name',
    'phone',
    'last_login',
    'email_verified',
    'created_at',
    'updated_at'
  ],
  
  // Users table - all columns (for admin/auth operations only)
  users_admin: [
    'id',
    'username',
    'email',
    'password_hash',
    'role',
    'is_active',
    'first_name',
    'last_name',
    'phone',
    'last_login',
    'email_verified',
    'created_at',
    'updated_at'
  ]
};

/**
 * Column sets for specific use cases
 */
export const COLUMN_SETS = {
  // Minimal columns for list views (reduces data transfer)
  news_list: ['id', 'title', 'excerpt', 'category', 'published_at', 'featured_image_url', 'slug'],
  participants_list: ['id', 'name', 'role', 'region', 'slug'],
  city_tips_list: ['id', 'name', 'category', 'description', 'slug'],
  rounds_list: ['id', 'title', 'location', 'date', 'start_time', 'end_time', 'slug', 'status'],
  
  // Breaking news columns (optimized for homepage)
  breaking_news: ['id', 'title', 'content', 'excerpt', 'category', 'published_at', 'featured_image_url', 'slug', 'breaking_news_until']
};

/**
 * Get column list for a table as a comma-separated string
 * 
 * @param {string} tableName - Name of the table
 * @param {string[]|null} exclude - Optional array of column names to exclude
 * @param {string|null} customSet - Optional custom column set name from COLUMN_SETS
 * @returns {string} Comma-separated column list suitable for SQL SELECT
 * 
 * @example
 * // Get all columns
 * getColumns('news')
 * // Returns: 'id, title, content, excerpt, ...'
 * 
 * @example
 * // Exclude sensitive columns
 * getColumns('users', ['password_hash', 'email'])
 * // Returns: 'id, username, role, is_active, ...'
 * 
 * @example
 * // Use a predefined column set
 * getColumns('news', null, 'news_list')
 * // Returns: 'id, title, excerpt, category, published_at, featured_image_url, slug'
 */
export function getColumns(tableName, exclude = null, customSet = null) {
  // Use custom column set if specified
  if (customSet && COLUMN_SETS[customSet]) {
    return COLUMN_SETS[customSet].join(', ');
  }
  
  // Get columns for the table
  const columns = TABLE_COLUMNS[tableName];
  
  if (!columns) {
    throw new Error(`Unknown table: ${tableName}. Available tables: ${Object.keys(TABLE_COLUMNS).join(', ')}`);
  }
  
  // Filter out excluded columns if specified
  if (exclude && Array.isArray(exclude) && exclude.length > 0) {
    return columns
      .filter(col => !exclude.includes(col))
      .join(', ');
  }
  
  return columns.join(', ');
}

/**
 * Get columns with table prefix (useful for JOINs)
 * 
 * @param {string} tableName - Name of the table
 * @param {string} alias - Table alias to use as prefix
 * @param {string[]|null} exclude - Optional array of column names to exclude
 * @returns {string} Comma-separated column list with table prefix
 * 
 * @example
 * getColumnsWithPrefix('news', 'n', ['content'])
 * // Returns: 'n.id, n.title, n.excerpt, n.category, ...'
 */
export function getColumnsWithPrefix(tableName, alias, exclude = null) {
  const columns = TABLE_COLUMNS[tableName];
  
  if (!columns) {
    throw new Error(`Unknown table: ${tableName}`);
  }
  
  const filtered = exclude && Array.isArray(exclude) && exclude.length > 0
    ? columns.filter(col => !exclude.includes(col))
    : columns;
  
  return filtered.map(col => `${alias}.${col}`).join(', ');
}

/**
 * Validate that all provided column names exist in the table
 * 
 * @param {string} tableName - Name of the table
 * @param {string[]} columns - Array of column names to validate
 * @returns {boolean} True if all columns exist
 * @throws {Error} If table doesn't exist or any column is invalid
 * 
 * @example
 * validateColumns('news', ['id', 'title', 'content'])
 * // Returns: true
 * 
 * validateColumns('news', ['id', 'invalid_column'])
 * // Throws: Error: Invalid columns for table news: invalid_column
 */
export function validateColumns(tableName, columns) {
  const tableColumns = TABLE_COLUMNS[tableName];
  
  if (!tableColumns) {
    throw new Error(`Unknown table: ${tableName}`);
  }
  
  const invalidColumns = columns.filter(col => !tableColumns.includes(col));
  
  if (invalidColumns.length > 0) {
    throw new Error(`Invalid columns for table ${tableName}: ${invalidColumns.join(', ')}`);
  }
  
  return true;
}

/**
 * Get count of columns for a table
 * 
 * @param {string} tableName - Name of the table
 * @returns {number} Number of columns in the table
 */
export function getColumnCount(tableName) {
  const columns = TABLE_COLUMNS[tableName];
  
  if (!columns) {
    throw new Error(`Unknown table: ${tableName}`);
  }
  
  return columns.length;
}

/**
 * Check if a column exists in a table
 * 
 * @param {string} tableName - Name of the table
 * @param {string} columnName - Name of the column to check
 * @returns {boolean} True if column exists
 */
export function hasColumn(tableName, columnName) {
  const columns = TABLE_COLUMNS[tableName];
  return columns ? columns.includes(columnName) : false;
}

export default {
  TABLE_COLUMNS,
  COLUMN_SETS,
  getColumns,
  getColumnsWithPrefix,
  validateColumns,
  getColumnCount,
  hasColumn
};
