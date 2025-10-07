import React from 'react';
import AdminCard from '../ui/AdminCard.jsx';
import StatsCard from '../ui/StatsCard.jsx';

export default function QuickStats({ stats, loading = false }) {
  const statItems = [
    {
      icon: '👥',
      label: 'Teilnehmer*innen',
      value: stats.participants,
      color: 'blue'
    },
    {
      icon: '🎭',
      label: 'Runden',
      value: stats.rounds,
      color: 'purple'
    },
    {
      icon: '📰',
      label: 'Nachrichten',
      value: stats.news,
      color: 'green'
    },
    {
      icon: '📅',
      label: 'Veranstaltungen',
      value: stats.events,
      color: 'indigo'
    },
    {
      icon: '🗺️',
      label: 'Stadt-Tipps',
      value: stats.cityTips,
      color: 'yellow'
    },
    {
      icon: '📋',
      label: 'Info-Seiten',
      value: stats.infoPages,
      color: 'orange'
    }
  ];

  return (
    <AdminCard
      title="Schnellübersicht"
      icon="📊"
      loading={loading}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statItems.map((item, index) => (
          <StatsCard
            key={index}
            icon={item.icon}
            label={item.label}
            value={item.value}
            color={item.color}
            loading={loading}
          />
        ))}
      </div>
    </AdminCard>
  );
}
