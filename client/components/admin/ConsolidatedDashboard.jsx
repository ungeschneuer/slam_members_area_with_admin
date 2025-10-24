// Consolidated Dashboard component that merges all dashboard widgets
import React from 'react';
import ConsolidatedAdminCard, { StatsCard } from './ConsolidatedAdminCard.jsx';

// Quick Stats component
function QuickStats({ stats = [], loading = false }) {
  const defaultStats = [
    { label: 'Participants', value: stats.participants || 0, color: 'blue', icon: '👥' },
    { label: 'Rounds', value: stats.rounds || 0, color: 'green', icon: '🏆' },
    { label: 'News', value: stats.news || 0, color: 'purple', icon: '📰' },
    { label: 'City Tips', value: stats.cityTips || 0, color: 'orange', icon: '🏙️' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {defaultStats.map((stat, index) => (
        <StatsCard
          key={index}
          icon={<span className="text-2xl">{stat.icon}</span>}
          label={stat.label}
          value={stat.value}
          color={stat.color}
          loading={loading}
        />
      ))}
    </div>
  );
}

// Quick Actions component
function QuickActions({ onAction }) {
  const actions = [
    { label: 'Teilnehmer*in hinzufügen', icon: '👤', action: 'add-participant' },
    { label: 'Runde erstellen', icon: '🏆', action: 'add-round' },
    { label: 'Nachricht schreiben', icon: '📝', action: 'add-news' },
    { label: 'Stadt-Tipp hinzufügen', icon: '🏙️', action: 'add-city-tip' }
  ];

  return (
    <ConsolidatedAdminCard
      title="Schnellzugriff"
      subtitle="Häufige administrative Aufgaben"
      className="mb-8"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => onAction && onAction(action.action)}
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-2xl mb-2">{action.icon}</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </ConsolidatedAdminCard>
  );
}

// System Health component
function SystemHealth({ health = {}, loading = false }) {
  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'warning': return 'yellow';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const getHealthIcon = (status) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  return (
    <ConsolidatedAdminCard
      title="System Health"
      subtitle="Current system status"
      loading={loading}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Database
          </span>
          <div className="flex items-center space-x-2">
            <span>{getHealthIcon(health.database)}</span>
            <span className={`text-sm font-medium text-${getHealthColor(health.database)}-600`}>
              {health.database || 'Unknown'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            API
          </span>
          <div className="flex items-center space-x-2">
            <span>{getHealthIcon(health.api)}</span>
            <span className={`text-sm font-medium text-${getHealthColor(health.api)}-600`}>
              {health.api || 'Unknown'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Overall
          </span>
          <div className="flex items-center space-x-2">
            <span>{getHealthIcon(health.overall)}</span>
            <span className={`text-sm font-medium text-${getHealthColor(health.overall)}-600`}>
              {health.overall || 'Unknown'}
            </span>
          </div>
        </div>
      </div>
    </ConsolidatedAdminCard>
  );
}

// Activity Feed component
function ActivityFeed({ activities = [], loading = false }) {
  return (
    <ConsolidatedAdminCard
      title="Recent Activity"
      subtitle="Latest system activities"
      loading={loading}
    >
      {activities.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No recent activity
        </p>
      ) : (
        <div className="space-y-3">
          {activities.slice(0, 5).map((activity, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white">
                  {activity.message}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {activity.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ConsolidatedAdminCard>
  );
}

// Main consolidated dashboard component
export default function ConsolidatedDashboard({ 
  stats = {},
  health = {},
  activities = [],
  loading = false,
  onAction
}) {
  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <QuickStats stats={stats} loading={loading} />
      
      {/* Quick Actions */}
      <QuickActions onAction={onAction} />
      
      {/* System Health and Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SystemHealth health={health} loading={loading} />
        <ActivityFeed activities={activities} loading={loading} />
      </div>
    </div>
  );
}
