/**
 * City Tips Categories - Backward Compatibility Layer
 * Re-exports from consolidated categories system
 * 
 * @deprecated Use shared/constants/categories.js directly
 */

// Re-export everything from consolidated categories
export {
  CITY_TIPS_CATEGORIES,
  getCategoryValues,
  getCategoryOptions,
  getCategoryOptionsWithAll,
  isValidCityTipCategory,
  getCategoryByValue,
  getCategoryHexColor
} from './categories.js';