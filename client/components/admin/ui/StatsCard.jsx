import React from 'react';

export default function StatsCard({ 
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
      <div className={`text-center p-4 ${styles.bg} rounded-lg ${className}`}>
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-xl mx-auto mb-2"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20 mx-auto mb-1"></div>
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-16 mx-auto"></div>
        </div>
      </div>
    );
  }

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend > 0) return '📈';
    if (trend < 0) return '📉';
    return '➡️';
  };

  const getTrendColor = () => {
    if (!trend) return 'text-gray-500';
    if (trend > 0) return 'text-green-600 dark:text-green-400';
    if (trend < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-500';
  };

  return (
    <div className={`text-center p-4 ${styles.bg} rounded-lg ${className}`}>
      <div className={`w-12 h-12 ${styles.iconBg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-sm ${styles.text} mb-1`}>{label}</p>
      <div className="flex items-center justify-center space-x-1">
        <p className={`text-2xl font-bold ${styles.value}`}>{value}</p>
        {trend !== null && (
          <div className={`flex items-center text-xs ${getTrendColor()}`}>
            <span className="mr-1">{getTrendIcon()}</span>
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
