import React from 'react';
import AdminCard from '../ui/AdminCard.jsx';

export default function ActivityFeed({ recentActivity, loading = false }) {
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AdminCard
        title="Letzte Aktivitäten"
        icon="📈"
        loading={true}
      >
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-1"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AdminCard>
    );
  }

  return (
    <AdminCard
      title="Letzte Aktivitäten"
      icon="📈"
    >
      <div className="space-y-3">
        {recentActivity.length > 0 ? (
          recentActivity.map((activity, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-lg">{activity.icon}</span>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {activity.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {activity.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {formatDate(activity.timestamp)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📈</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400">Keine aktuellen Aktivitäten</p>
          </div>
        )}
      </div>
    </AdminCard>
  );
}
