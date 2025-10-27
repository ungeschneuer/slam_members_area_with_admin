// Consolidated AdminTable component that merges AdminTable and LoadingTable functionality
import React, { useState } from 'react';

// Loading skeleton component
function LoadingSkeleton({ columns = [], rows = 5, className = "" }) {
  const getColumnWidth = (index) => {
    const widths = ['w-1/6', 'w-1/4', 'w-1/3', 'w-1/5', 'w-1/6'];
    return widths[index % widths.length];
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="animate-pulse">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-4">
            {columns.map((column, index) => (
              <div 
                key={index}
                className={`h-4 bg-gray-200 dark:bg-gray-600 rounded ${getColumnWidth(index)}`}
              />
            ))}
          </div>
        </div>
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
            <div className="flex space-x-4">
              {columns.map((_, colIndex) => (
                <div 
                  key={colIndex}
                  className={`h-3 bg-gray-200 dark:bg-gray-600 rounded ${getColumnWidth(colIndex)}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main consolidated AdminTable component
export default function ConsolidatedAdminTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'Keine Daten verfügbar',
  onRowClick = null,
  actions = null,
  bulkActions = null,
  selectedRows = [],
  onSelectionChange = null,
  sortable = true,
  className = '',
  showHeader = true,
  loadingRows = 5
}) {
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (field) => {
    if (!sortable) return;
    
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortField || !sortable) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDirection]);

  const handleSelectAll = (checked) => {
    if (onSelectionChange) {
      onSelectionChange(checked ? data.map((_, index) => index) : []);
    }
  };

  const handleSelectRow = (index, checked) => {
    if (onSelectionChange) {
      const newSelection = checked 
        ? [...selectedRows, index]
        : selectedRows.filter(i => i !== index);
      onSelectionChange(newSelection);
    }
  };

  // Show loading skeleton
  if (loading) {
    return <LoadingSkeleton columns={columns} rows={loadingRows} className={className} />;
  }

  // Show empty state
  if (data.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Keine Daten</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Bulk Actions */}
      {bulkActions && selectedRows.length > 0 && (
        <div className="px-4 py-3 bg-[#A2D2B9]/20 dark:bg-[#185757]/30 border-b border-[#185757]/30 dark:border-[#185757]/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#185757] dark:text-[#A2D2B9]">
              {selectedRows.length} Element(e) ausgewählt
            </span>
            <div className="flex flex-wrap gap-3">
              {bulkActions}
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Card view */}
      <div className="block md:hidden space-y-4 p-4">
        {sortedData.map((row, index) => (
          <div
            key={row.id || row.slug || `row-${index}`}
            className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3 ${
              selectedRows.includes(index) ? 'ring-2 ring-[#185757] dark:ring-[#A2D2B9]' : ''
            }`}
          >
            {/* Selection checkbox for mobile */}
            {onSelectionChange && (
              <div className="flex items-center space-x-2 pb-3 border-b border-gray-200 dark:border-gray-700">
                <input
                  type="checkbox"
                  checked={selectedRows.includes(index)}
                  onChange={(e) => handleSelectRow(index, e.target.checked)}
                  className="h-4 w-4 text-[#185757] focus:ring-[#A2D2B9] border-gray-300 rounded"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Auswählen</span>
              </div>
            )}
            
            {/* Card content */}
            {columns.map((column) => (
              <div key={column.key}>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {column.label}
                </span>
                <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {column.render ? column.render(row[column.key], row, index) : row[column.key]}
                </div>
              </div>
            ))}
            
            {/* Actions for mobile */}
            {actions && (
              <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                {actions(row, index)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: Table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          {/* Header */}
          {showHeader && (
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {onSelectionChange && (
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === data.length && data.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 text-[#185757] focus:ring-[#A2D2B9] border-gray-300 rounded"
                    />
                  </th>
                )}
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className={`px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider ${
                      sortable && column.sortable !== false ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''
                    }`}
                    onClick={() => sortable && column.sortable !== false && handleSort(column.key)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {sortable && column.sortable !== false && sortField === column.key && (
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          {sortDirection === 'asc' ? (
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          ) : (
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          )}
                        </svg>
                      )}
                    </div>
                  </th>
                ))}
                {actions && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Aktionen
                  </th>
                )}
              </tr>
            </thead>
          )}

          {/* Body */}
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedData.map((row, index) => (
              <tr
                key={row.id || row.slug || `row-${index}`}
                className={`${
                  onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''
                } ${selectedRows.includes(index) ? 'bg-[#A2D2B9]/20 dark:bg-[#185757]/30' : ''}`}
                onClick={() => onRowClick && onRowClick(row, index)}
              >
                {onSelectionChange && (
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(index)}
                      onChange={(e) => handleSelectRow(index, e.target.checked)}
                      className="h-4 w-4 text-[#185757] focus:ring-[#A2D2B9] border-gray-300 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {column.render ? column.render(row[column.key], row, index) : row[column.key]}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex flex-wrap gap-3 justify-end">
                      {actions(row, index)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
