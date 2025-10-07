import React from 'react';

export default function AdminForm({
  title,
  subtitle,
  children,
  onSubmit,
  onCancel,
  submitLabel = 'Speichern',
  cancelLabel = 'Abbrechen',
  loading = false,
  error = null,
  success = null,
  className = '',
  variant = 'default' // 'default', 'modal', 'inline'
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'modal':
        return 'bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700';
      case 'inline':
        return 'bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600';
      default:
        return 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit && !loading) {
      onSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`${getVariantStyles()} ${className}`}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Body */}
      <div className="px-6 py-4">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <span className="text-red-600 dark:text-red-400 mr-2">⚠️</span>
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center">
              <span className="text-green-600 dark:text-green-400 mr-2">✅</span>
              <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
            </div>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-4">
          {children}
        </div>
      </div>

      {/* Footer */}
      {(onSubmit || onCancel) && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
          <div className="flex items-center justify-end space-x-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {cancelLabel}
              </button>
            )}
            {onSubmit && (
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg"
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </div>
                ) : (
                  submitLabel
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
