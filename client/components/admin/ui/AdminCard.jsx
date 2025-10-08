import React from 'react';

export default function AdminCard({ 
  title, 
  subtitle, 
  icon, 
  children, 
  headerActions, 
  footerActions, 
  loading = false, 
  error = null,
  className = '',
  variant = 'default' // 'default', 'success', 'warning', 'error'
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20';
      case 'warning':
        return 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20';
      case 'error':
        return 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20';
      default:
        return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800';
    }
  };

  if (loading) {
    return (
      <div className={`rounded-2xl p-6 shadow-sm border ${getVariantStyles()} ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
              <div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
              </div>
            </div>
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-2xl p-6 shadow-sm border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
            <span className="text-red-600 dark:text-red-400">⚠️</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">Error</h3>
            <p className="text-sm text-red-700 dark:text-red-300">Failed to load content</p>
          </div>
        </div>
        <p className="text-sm text-red-600 dark:text-red-400">{error?.message || error}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-6 shadow-sm border ${getVariantStyles()} ${className}`}>
      {/* Header */}
      {(title || icon || headerActions) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <span className="text-lg">{icon}</span>
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {headerActions && (
            <div className="flex items-center space-x-2">
              {headerActions}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className="mb-4">
        {children}
      </div>

      {/* Footer */}
      {footerActions && (
        <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          {footerActions}
        </div>
      )}
    </div>
  );
}
