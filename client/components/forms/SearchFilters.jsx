import React from 'react';
import SearchInput from './SearchInput.jsx';
import FilterSelect from './FilterSelect.jsx';

export default function SearchFilters({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Suchen...',
  filters = [],
  className = '',
  gridCols = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
}) {
  return (
    <div className={`grid ${gridCols} gap-4 ${className}`}>
      <SearchInput
        value={searchTerm}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
      />
      {filters.map((filter, index) => (
        <FilterSelect
          key={index}
          value={filter.value}
          onChange={filter.onChange}
          options={filter.options}
          placeholder={filter.placeholder}
        />
      ))}
    </div>
  );
}
