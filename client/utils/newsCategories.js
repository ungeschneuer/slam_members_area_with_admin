/**
 * News Categories - Backward Compatibility Layer
 * Re-exports from consolidated categories system
 * 
 * @deprecated Use shared/constants/categories.js directly
 */

// Re-export everything from consolidated categories
export {
  NEWS_CATEGORIES as newsCategoryDefinitions,
  getNewsCategoryOptions,
  getNewsCategoryLabel,
  getNewsCategoryIcon,
  getNewsCategoryColor,
  validateNewsCategory,
  getNewsCategoryFormOptions,
  getNewsCategoryFilterOptions,
  getNewsCategoryAdminOptions
} from '../../shared/constants/categories.js';
