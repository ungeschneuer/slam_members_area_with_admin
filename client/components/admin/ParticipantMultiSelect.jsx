import React, { useState, useMemo } from 'react';

/**
 * ParticipantMultiSelect - A checkbox-based multi-selection component for participants/teams
 * 
 * Features:
 * - Search functionality with real-time filtering
 * - Checkbox list with hover effects
 * - Select All / Clear All buttons
 * - Max selections enforcement
 * - Screen reader announcements
 * - Dark mode support
 */
function ParticipantMultiSelect({
  items = [],
  selectedIds = [],
  onChange,
  label = "Select Items",
  maxSelections = null,
  showRegion = true,
  emptyMessage = "No items available",
  formatLabel = null,
  searchPlaceholder = "Suchen...",
  disabled = false
}) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Memoized filtering
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const lowerSearch = searchTerm.toLowerCase();
    return items.filter(item =>
      (item.name || '').toLowerCase().includes(lowerSearch) ||
      (showRegion && (item.region || '').toLowerCase().includes(lowerSearch))
    );
  }, [items, searchTerm, showRegion]);
  
  const handleToggle = (itemId) => {
    if (disabled) return;
    
    const isSelected = selectedIds.includes(itemId);
    
    if (isSelected) {
      onChange(selectedIds.filter(id => id !== itemId));
    } else {
      if (maxSelections && selectedIds.length >= maxSelections) {
        alert(`Maximum ${maxSelections} Einträge erlaubt`);
        return;
      }
      onChange([...selectedIds, itemId]);
    }
  };
  
  const handleSelectAll = () => {
    if (disabled) return;
    
    const availableIds = filteredItems.map(item => item.id);
    const newSelection = [...new Set([...selectedIds, ...availableIds])];
    
    if (maxSelections && newSelection.length > maxSelections) {
      alert(`Maximum ${maxSelections} Einträge erlaubt`);
      return;
    }
    
    onChange(newSelection);
  };
  
  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };
  
  if (items.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {label} ({selectedIds.length}{maxSelections ? `/${maxSelections}` : ''})
        </h3>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={disabled}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Alle auswählen
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={disabled}
            className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Alle entfernen
          </button>
        </div>
      </div>
      
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 pl-9 pr-9 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Suchfeld"
        />
        <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            disabled={disabled}
            className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Suche löschen"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Items list */}
      <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
        {filteredItems.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            Keine Ergebnisse für "{searchTerm}"
          </div>
        ) : (
          filteredItems.map(item => (
            <label
              key={item.id}
              className={`flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => handleToggle(item.id)}
                disabled={disabled}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                aria-label={`${item.name} auswählen`}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {formatLabel ? formatLabel(item) : item.name}
                </p>
                {showRegion && item.region && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {item.region}
                  </p>
                )}
              </div>
            </label>
          ))
        )}
      </div>
      
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {searchTerm && `${filteredItems.length} Ergebnisse gefunden`}
      </div>
      
      {/* Selection summary */}
      {selectedIds.length > 0 && (
        <p className="text-sm text-blue-600 dark:text-blue-400">
          {selectedIds.length} Eintrag{selectedIds.length !== 1 ? 'e' : ''} ausgewählt
        </p>
      )}
    </div>
  );
}

export default ParticipantMultiSelect;
