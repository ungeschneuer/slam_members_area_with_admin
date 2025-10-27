import React from 'react';

/**
 * FilterButtons - Simple button group for filters
 * @param {Object} props
 * @param {Array} props.options - Array of filter options with {id, name}
 * @param {string} props.activeFilter - Currently active filter ID
 * @param {Function} props.onFilterChange - Callback when filter changes
 * @param {string} props.label - Optional label for the filter group
 * @param {string} props.ariaLabel - ARIA label for the button group
 */
function FilterButtons({ options, activeFilter, onFilterChange, label, ariaLabel }) {
  if (!options || options.length === 0) {
    return null;
  }

  return (
    <div>
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          {label}
        </label>
      )}
      <div 
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={ariaLabel || label || 'Filter-Optionen'}
      >
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onFilterChange(option.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${activeFilter === option.id
                ? 'bg-pink-500 text-white shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            aria-pressed={activeFilter === option.id}
            aria-label={`${option.name} ${activeFilter === option.id ? 'ausgewählt' : 'auswählen'}`}
          >
            {option.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default FilterButtons;
