/**
 * Category Translations - Backward Compatibility Layer
 * Re-exports from consolidated categories system
 * 
 * @deprecated Use shared/constants/categories.js directly
 */

// Re-export everything from consolidated categories
export {
  INFO_PAGE_CATEGORIES,
  NEWS_CATEGORIES,
  ROUND_STATUS_CATEGORIES,
  translateCategory,
  getCategoryIcon,
  getAvailableCategories,
  translateRoundStatus,
  getRoundStatusIcon,
  getRoundStatusColor,
  getAvailableRoundStatuses,
  getRoundStatusOptions,
  getCategoryOptions
} from '../../shared/constants/categories.js';
