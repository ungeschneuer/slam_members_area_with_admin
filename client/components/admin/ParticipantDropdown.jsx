import React, { useState, useMemo, useEffect } from 'react';

/**
 * ParticipantDropdown - A searchable dropdown component for selecting participants/teams
 * 
 * Features:
 * - Search input filters dropdown options
 * - Native select element for familiarity and accessibility
 * - Auto-show/hide search based on item count
 * - Loading states and proper error handling
 * - Dark mode support
 * - Screen reader announcements
 */
function ParticipantDropdown({
  items = [],
  value,
  onChange,
  placeholder = "Wählen...",
  searchPlaceholder = "Suchen...",
  disabled = false,
  loading = false,
  className = "",
  formatLabel = (item) => `${item.name} (${item.region})`,
  filterFn = null,
  searchThreshold = 10,
  label = null
}) {
  // Ensure items is always an array
  const safeItems = Array.isArray(items) ? items : [];
  const [searchTerm, setSearchTerm] = useState('');
  
  // Apply parent filtering first (memoized)
  const preFilteredItems = useMemo(() => {
    return filterFn ? safeItems.filter(filterFn) : safeItems;
  }, [safeItems, filterFn]);
  
  // Then apply search filtering (memoized)
  const filteredItems = useMemo(() => {
    if (!searchTerm) return preFilteredItems;
    const lowerSearch = searchTerm.toLowerCase();
    return preFilteredItems.filter(item =>
      item.name.toLowerCase().includes(lowerSearch) ||
      (item.region && item.region.toLowerCase().includes(lowerSearch))
    );
  }, [preFilteredItems, searchTerm]);
  
  // Show search if items exceed threshold
  const showSearch = preFilteredItems.length >= searchThreshold;
  
  // Keep search term persistent for multiple selections
  // Removed auto-clear behavior to allow multiple participant additions
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      
      {showSearch && (
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={searchPlaceholder}
            disabled={disabled || loading}
            className="w-full px-3 py-2 pl-9 pr-9 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            aria-label="Suchfeld für Teilnehmer"
          />
          {/* SVG search icon */}
          <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              aria-label="Suche löschen"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
      
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${className}`}
        aria-label={label || placeholder}
      >
        <option value="">
          {loading ? 'Laden...' : placeholder}
        </option>
        {filteredItems.map((item, index) => (
          <option key={item.id || `item-${index}`} value={item.id}>
            {formatLabel(item)}
          </option>
        ))}
      </select>
      
      {/* Screen reader announcement for filtered results */}
      {showSearch && (
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {searchTerm && `${filteredItems.length} Ergebnisse gefunden`}
        </div>
      )}
      
      {/* Visual feedback for no results */}
      {showSearch && filteredItems.length === 0 && searchTerm && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Keine Ergebnisse für "{searchTerm}"
        </p>
      )}
    </div>
  );
}

export default ParticipantDropdown;
