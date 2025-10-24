// Consolidated AdminCard component that merges AdminCard and StatsCard functionality
import React from 'react';

// Stats Card component for displaying metrics
export function StatsCard({ 
  icon, 
  label, 
  value, 
  trend = null, 
  color = 'blue',
  loading = false,
  className = ''
}) {
  const getColorStyles = () => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        iconBg: 'bg-blue-100 dark:bg-blue-900',
        text: 'text-blue-600 dark:text-blue-400',
        value: 'text-gray-900 dark:text-white'
      },
      green: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        iconBg: 'bg-green-100 dark:bg-green-900',
        text: 'text-green-600 dark:text-green-400',
        value: 'text-gray-900 dark:text-white'
      },
      purple: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        iconBg: 'bg-purple-100 dark:bg-purple-900',
        text: 'text-purple-600 dark:text-purple-400',
        value: 'text-gray-900 dark:text-white'
      },
      indigo: {
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        iconBg: 'bg-indigo-100 dark:bg-indigo-900',
        text: 'text-indigo-600 dark:text-indigo-400',
        value: 'text-gray-900 dark:text-white'
      },
      yellow: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        iconBg: 'bg-yellow-100 dark:bg-yellow-900',
        text: 'text-yellow-600 dark:text-yellow-400',
        value: 'text-gray-900 dark:text-white'
      },
      orange: {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        iconBg: 'bg-orange-100 dark:bg-orange-900',
        text: 'text-orange-600 dark:text-orange-400',
        value: 'text-gray-900 dark:text-white'
      }
    };
    
    return colorMap[color] || colorMap.blue;
  };

  const styles = getColorStyles();

  if (loading) {
    return (
      <div className={`rounded-lg p-6 ${styles.bg} ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center">
            <div className={`w-12 h-12 ${styles.iconBg} rounded-lg`}></div>
            <div className="ml-4 flex-1">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20 mb-2"></div>
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-6 ${styles.bg} ${className}`}>
      <div className="flex items-center">
        <div className={`flex-shrink-0 w-12 h-12 ${styles.iconBg} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        <div className="ml-4 flex-1">
          <p className={`text-sm font-medium ${styles.text}`}>
            {label}
          </p>
          <div className="flex items-baseline">
            <p className={`text-2xl font-semibold ${styles.value}`}>
              {value}
            </p>
            {trend && (
              <span className={`ml-2 text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main consolidated AdminCard component
export default function ConsolidatedAdminCard({ 
  title, 
  subtitle, 
  icon, 
  children, 
  headerActions, 
  footerActions, 
  loading = false, 
  error = null,
  className = '',
  variant = 'default', // 'default', 'success', 'warning', 'error'
  // Stats card props
  label,
  value,
  trend,
  color = 'blue',
  type = 'card' // 'card' or 'stats'
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

  // If it's a stats card, use the StatsCard component
  if (type === 'stats') {
    return (
      <StatsCard
        icon={icon}
        label={label}
        value={value}
        trend={trend}
        color={color}
        loading={loading}
        className={className}
      />
    );
  }

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
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Error
            </h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-6 shadow-sm border ${getVariantStyles()} ${className}`}>
      {/* Header */}
      {(title || subtitle || icon || headerActions) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="flex-shrink-0">
                {icon}
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
            <div className="flex-shrink-0">
              {headerActions}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {children && (
        <div className="mb-4">
          {children}
        </div>
      )}

      {/* Footer */}
      {footerActions && (
        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          {footerActions}
        </div>
      )}
    </div>
  );
}
