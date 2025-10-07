import React, { useState } from 'react';

export default function AdminTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No data available',
  onRowClick = null,
  actions = null,
  bulkActions = null,
  selectedRows = [],
  onSelectionChange = null,
  sortable = true,
  className = ''
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

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="animate-pulse">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex space-x-4">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/6"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/5"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Bulk Actions */}
      {bulkActions && selectedRows.length > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {selectedRows.length} item(s) selected
            </span>
            <div className="flex space-x-2">
              {bulkActions}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {/* Select All Checkbox */}
              {onSelectionChange && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              
              {/* Column Headers */}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${
                    sortable && column.sortable !== false ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''
                  }`}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {sortable && column.sortable !== false && sortField === column.key && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              
              {/* Actions Column */}
              {actions && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedData.map((row, index) => (
              <tr
                key={index}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  onRowClick ? 'cursor-pointer' : ''
                } ${selectedRows.includes(index) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                onClick={() => onRowClick && onRowClick(row, index)}
              >
                {/* Row Checkbox */}
                {onSelectionChange && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(index)}
                      onChange={(e) => handleSelectRow(index, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                )}
                
                {/* Data Cells */}
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {column.render ? column.render(row[column.key], row, index) : row[column.key]}
                  </td>
                ))}
                
                {/* Actions Cell */}
                {actions && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
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
