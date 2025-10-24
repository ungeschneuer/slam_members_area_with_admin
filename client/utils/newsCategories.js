/**
 * Centralized news category definitions for the SLAM25 project
 * This eliminates code duplication and ensures consistency across all components
 */

// News category definitions with all required properties
export const newsCategoryDefinitions = [
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
  }
];

// Create Map for O(1) lookups (internal use only)
const categoryMap = new Map(
  newsCategoryDefinitions.map(cat => [cat.value, cat])
);

// Utility functions for consistent category handling
export const getNewsCategoryOptions = () => newsCategoryDefinitions;

export const getNewsCategoryLabel = (value) => 
  categoryMap.get(value)?.label || value;

export const getNewsCategoryIcon = (value) => 
  categoryMap.get(value)?.icon || '📰';

export const getNewsCategoryColor = (value) => 
  categoryMap.get(value)?.color || 'bg-gray-500';

// Validation utility
export const validateNewsCategory = (category) => 
  categoryMap.has(category);

// Get category for forms (value/label pairs)
export const getNewsCategoryFormOptions = () => 
  newsCategoryDefinitions.map(cat => ({ value: cat.value, label: cat.label }));

// Get category for filters (id/name/icon pairs)
export const getNewsCategoryFilterOptions = () => 
  newsCategoryDefinitions.map(cat => ({ 
    id: cat.value, 
    name: cat.label, 
    icon: cat.icon 
  }));

// Get category for admin display (value/label/color pairs)
export const getNewsCategoryAdminOptions = () => 
  newsCategoryDefinitions.map(cat => ({ 
    value: cat.value, 
    label: cat.label, 
    color: cat.color 
  }));
