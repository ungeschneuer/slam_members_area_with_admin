import React from 'react';

/**
 * Reusable pagination controls component
 * Supports page size selection and navigation
 */
export default function PaginationControls({
  currentPage = 1,
  totalPages = 1,
  pageSize = 24,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [12, 24, 48, 96, 240],
  showAllOption = true,
  className = ""
}) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && onPageChange) {
      onPageChange(page);
    }
  };

  const handlePageSizeChange = (newPageSize) => {
    if (onPageSizeChange) {
      onPageSizeChange(newPageSize);
    }
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}>
      {/* Page size selector */}
      <div className="flex items-center space-x-2">
        <label htmlFor="page-size" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Zeige:
        </label>
        <select
          id="page-size"
          value={pageSize}
          onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
          className="filter-select"
        >
          {pageSizeOptions.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
          {showAllOption && (
            <option value="all">Alle</option>
          )}
        </select>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Einträge
        </span>
      </div>

      {/* Item count info */}
      <div className="text-sm text-gray-700 dark:text-gray-300">
        {pageSize === 'all' ? (
          <span>Alle {totalItems} Einträge</span>
        ) : (
          <span>
            {startItem}-{endItem} von {totalItems} Einträgen
          </span>
        )}
      </div>

      {/* Page navigation */}
      {pageSize !== 'all' && totalPages > 1 && (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="pagination-btn"
            aria-label="Erste Seite"
          >
            ««
          </button>
          
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-btn"
            aria-label="Vorherige Seite"
          >
            ‹
          </button>

          {/* Page numbers */}
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={currentPage === pageNum ? 'pagination-btn-active' : 'pagination-btn'}
                  aria-label={`Seite ${pageNum}`}
                  aria-current={currentPage === pageNum ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
            aria-label="Nächste Seite"
          >
            ›
          </button>
          
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
            aria-label="Letzte Seite"
          >
            »»
          </button>
        </div>
      )}
    </div>
  );
}
