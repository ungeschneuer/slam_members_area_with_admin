/**
 * Consolidated Category System for SLAM25 Project
 * Single source of truth for all category types
 * Follows "Keep It Simple" principle
 */

// ============================================================================
// CITY TIPS CATEGORIES
// ============================================================================

export const CITY_TIPS_CATEGORIES = [
  { value: 'culture', label: 'Kultur', icon: '🎭', color: 'bg-purple-500' },
  { value: 'cafe', label: 'Café', icon: '☕', color: 'bg-yellow-500' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️', color: 'bg-red-500' },
  { value: 'bar', label: 'Bar', icon: '🍺', color: 'bg-blue-500' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️', color: 'bg-green-500' },
  { value: 'hotel', label: 'Hotel', icon: '🏨', color: 'bg-indigo-500' },
  { value: 'transport', label: 'Transport', icon: '🚇', color: 'bg-orange-500' },
  { value: 'landmark', label: 'Sehenswürdigkeit', icon: '🏛️', color: 'bg-red-600' },
  { value: 'nature', label: 'Natur', icon: '🌳', color: 'bg-green-600' },
  { value: 'leisure', label: 'Freizeit', icon: '🏊', color: 'bg-cyan-500' },
  { value: 'sport', label: 'Sport', icon: '⚽', color: 'bg-orange-600' },
  { value: 'wettbewerb-location', label: 'Wettbewerb-Location', icon: '🏆', color: 'bg-yellow-600' },
  { value: 'neighborhood', label: 'Stadtteil', icon: '🏘️', color: 'bg-gray-500' },
  { value: 'venue', label: 'Veranstaltungsort', icon: '🎪', color: 'bg-pink-500' },
  { value: 'food', label: 'Essen & Trinken', icon: '🍴', color: 'bg-amber-500' },
  { value: 'entertainment', label: 'Unterhaltung', icon: '🎪', color: 'bg-pink-500' }
];

// ============================================================================
// NEWS CATEGORIES
// ============================================================================

export const NEWS_CATEGORIES = [
  { 
    value: 'announcement', 
    label: 'Neuigkeiten', 
    icon: '📢',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  },
  { 
    value: 'workshops', 
    label: 'Hinweise', 
    icon: '🎓',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  },
  { 
    value: 'prizes', 
    label: 'Tipps und Tricks', 
    icon: '🏆',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  },
  { 
    value: 'participants', 
    label: 'Teilnehmer*innen', 
    icon: '👥',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  },
  { 
    value: 'general', 
    label: 'Allgemein', 
    icon: '📰',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  },
  { 
    value: 'update', 
    label: 'Updates', 
    icon: '🔄',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
  },
  { 
    value: 'jury', 
    label: 'Jury', 
    icon: '⚖️',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
  }
];

// ============================================================================
// INFO PAGE CATEGORIES
// ============================================================================

export const INFO_PAGE_CATEGORIES = [
  { value: 'general', label: 'Allgemein', icon: '📄', color: 'bg-gray-500' },
  { value: 'rules', label: 'Regeln', icon: '📋', color: 'bg-blue-500' },
  { value: 'chemnitz', label: 'Chemnitz', icon: '🏛️', color: 'bg-red-500' },
  { value: 'weiteres', label: 'Weiteres', icon: '📚', color: 'bg-green-500' }
];

// ============================================================================
// ROUND STATUS CATEGORIES
// ============================================================================

export const ROUND_STATUS_CATEGORIES = [
  { value: 'confirmed', label: 'Bestätigt', icon: '✅', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  { value: 'tentative', label: 'Vorläufig', icon: '❓', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'upcoming', label: 'Anstehend', icon: '📋', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  { value: 'scheduled', label: 'Geplant', icon: '📅', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'SCHEDULED', label: 'Geplant', icon: '📅', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'active', label: 'Aktiv', icon: '🎭', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'ACTIVE', label: 'Aktiv', icon: '🎭', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'completed', label: 'Abgeschlossen', icon: '🏁', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'COMPLETED', label: 'Abgeschlossen', icon: '🏁', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'cancelled', label: 'Abgesagt', icon: '❌', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { value: 'postponed', label: 'Verschoben', icon: '⏸️', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' }
];

// ============================================================================
// UNIFIED CATEGORY FUNCTIONS
// ============================================================================

/**
 * Get category by value and type
 * @param {string} value - Category value
 * @param {string} type - Category type ('cityTip', 'news', 'info', 'roundStatus')
 * @returns {Object|null} Category object or null
 */
export const getCategoryByValue = (value, type = 'cityTip') => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  // Handle special "all" case
  if (value === 'all') {
    return { value: 'all', label: 'Alle Kategorien', icon: '🗺️', color: 'bg-gray-500' };
  }

  let categories;
  switch (type) {
    case 'cityTip':
      categories = CITY_TIPS_CATEGORIES;
      break;
    case 'news':
      categories = NEWS_CATEGORIES;
      break;
    case 'info':
      categories = INFO_PAGE_CATEGORIES;
      break;
    case 'roundStatus':
      categories = ROUND_STATUS_CATEGORIES;
      break;
    default:
      return null;
  }

  const category = categories.find(cat => cat.value === value);
  
  // Only log warnings in development mode for unknown categories
  if (!category && process.env.NODE_ENV === 'development') {
    console.warn(`Unknown ${type} category: ${value}`);
  }
  
  return category;
};

/**
 * Get category icon
 * @param {string} value - Category value
 * @param {string} type - Category type
 * @returns {string} Icon emoji
 */
export const getCategoryIcon = (value, type = 'cityTip') => {
  const category = getCategoryByValue(value, type);
  return category?.icon || '📍';
};

/**
 * Get category label
 * @param {string} value - Category value
 * @param {string} type - Category type
 * @returns {string} Category label
 */
export const getCategoryLabel = (value, type = 'cityTip') => {
  const category = getCategoryByValue(value, type);
  return category?.label || value;
};

/**
 * Get category color
 * @param {string} value - Category value
 * @param {string} type - Category type
 * @returns {string} Color class
 */
export const getCategoryColor = (value, type = 'cityTip') => {
  const category = getCategoryByValue(value, type);
  return category?.color || 'bg-gray-500';
};

/**
 * Get category options for forms
 * @param {string} type - Category type
 * @returns {Array} Array of {value, label} objects
 */
export const getCategoryOptions = (type = 'cityTip') => {
  let categories;
  switch (type) {
    case 'cityTip':
      categories = CITY_TIPS_CATEGORIES;
      break;
    case 'news':
      categories = NEWS_CATEGORIES;
      break;
    case 'info':
      categories = INFO_PAGE_CATEGORIES;
      break;
    case 'roundStatus':
      categories = ROUND_STATUS_CATEGORIES;
      break;
    default:
      return [];
  }
  
  return categories.map(cat => ({ value: cat.value, label: cat.label }));
};

/**
 * Get category options with "All" option for filtering
 * @param {string} type - Category type
 * @returns {Array} Array of category objects with "all" option
 */
export const getCategoryOptionsWithAll = (type = 'cityTip') => {
  const allOption = { value: 'all', label: 'Alle Kategorien', icon: '🗺️', color: 'bg-gray-500' };
  return [allOption, ...getCategoryOptions(type)];
};

/**
 * Validate category
 * @param {string} value - Category value
 * @param {string} type - Category type
 * @returns {boolean} True if valid
 */
export const isValidCategory = (value, type = 'cityTip') => {
  return getCategoryByValue(value, type) !== null;
};

// ============================================================================
// CITY TIPS SPECIFIC FUNCTIONS (for backward compatibility)
// ============================================================================

export const getCategoryValues = () => CITY_TIPS_CATEGORIES.map(cat => cat.value);
export const isValidCityTipCategory = (category) => isValidCategory(category, 'cityTip');

// Convert Tailwind color classes to hex colors for map markers
export const getCategoryHexColor = (category) => {
  const categoryData = getCategoryByValue(category, 'cityTip');
  if (!categoryData) return '#6b7280'; // Default gray
  
  const colorMap = {
    'bg-purple-500': '#8b5cf6',
    'bg-yellow-500': '#eab308',
    'bg-red-500': '#ef4444',
    'bg-blue-500': '#3b82f6',
    'bg-green-500': '#10b981',
    'bg-indigo-500': '#6366f1',
    'bg-orange-500': '#f97316',
    'bg-red-600': '#dc2626',
    'bg-green-600': '#059669',
    'bg-cyan-500': '#0891b2',
    'bg-orange-600': '#ea580c',
    'bg-yellow-600': '#d97706',
    'bg-gray-500': '#6b7280',
    'bg-pink-500': '#ec4899',
    'bg-amber-500': '#f59e0b'
  };
  
  return colorMap[categoryData.color] || '#6b7280';
};

// ============================================================================
// NEWS SPECIFIC FUNCTIONS (for backward compatibility)
// ============================================================================

export const getNewsCategoryOptions = () => NEWS_CATEGORIES;
export const getNewsCategoryLabel = (value) => getCategoryLabel(value, 'news');
export const getNewsCategoryIcon = (value) => getCategoryIcon(value, 'news');
export const getNewsCategoryColor = (value) => getCategoryColor(value, 'news');
export const validateNewsCategory = (category) => isValidCategory(category, 'news');

// Get category for forms (value/label pairs)
export const getNewsCategoryFormOptions = () => 
  NEWS_CATEGORIES.map(cat => ({ value: cat.value, label: cat.label }));

// Get category for filters (id/name/icon pairs)
export const getNewsCategoryFilterOptions = () => 
  NEWS_CATEGORIES.map(cat => ({ 
    id: cat.value, 
    name: cat.label, 
    icon: cat.icon 
  }));

// Get category for admin display (value/label/color pairs)
export const getNewsCategoryAdminOptions = () => 
  NEWS_CATEGORIES.map(cat => ({ 
    value: cat.value, 
    label: cat.label, 
    color: cat.color 
  }));

// ============================================================================
// ROUND STATUS SPECIFIC FUNCTIONS (for backward compatibility)
// ============================================================================

export const translateRoundStatus = (status) => getCategoryLabel(status, 'roundStatus');
export const getRoundStatusIcon = (status) => getCategoryIcon(status, 'roundStatus');
export const getRoundStatusColor = (status, darkMode = false) => {
  const color = getCategoryColor(status, 'roundStatus');
  // For now, return the same color for both modes
  // Can be enhanced later if needed
  return color;
};

export const getAvailableRoundStatuses = () => ROUND_STATUS_CATEGORIES.map(cat => cat.value);
export const getRoundStatusOptions = () => ROUND_STATUS_CATEGORIES;

// ============================================================================
// INFO PAGE SPECIFIC FUNCTIONS (for backward compatibility)
// ============================================================================

export const translateCategory = (category, type = 'info') => {
  if (type === 'info') {
    return getCategoryLabel(category, 'info');
  }
  if (type === 'news') {
    return getCategoryLabel(category, 'news');
  }
  return category;
};

export const getAvailableCategories = (type) => {
  switch (type) {
    case 'info':
      return INFO_PAGE_CATEGORIES.map(cat => cat.value);
    case 'news':
      return NEWS_CATEGORIES.map(cat => cat.value);
    default:
      return [];
  }
};
