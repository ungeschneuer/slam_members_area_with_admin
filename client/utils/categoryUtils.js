/**
 * Simplified Category Utilities for SLAM25 Project
 * Direct re-exports from consolidated categories system
 * Follows "Keep It Simple" principle - no over-engineering
 */

// Re-export everything from consolidated categories
export {
  getCategoryIcon,
  getCategoryLabel,
  getCategoryColor,
  getCategoryByValue,
  getCategoryOptions,
  getCategoryOptionsWithAll,
  isValidCategory,
  getCategoryHexColor
} from '../../shared/constants/categories.js';

// Simple utility factory for components that need multiple functions
// No caching - let React Query handle performance optimization
export const createCategoryUtils = () => ({
  getIcon: (category, type = 'cityTip') => getCategoryIcon(category, type),
  getLabel: (category, type = 'cityTip') => getCategoryLabel(category, type),
  getColor: (category, type = 'cityTip') => getCategoryColor(category, type),
  getHexColor: (category) => getCategoryHexColor(category)
});