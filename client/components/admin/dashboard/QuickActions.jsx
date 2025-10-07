import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminCard from '../ui/AdminCard.jsx';

export default function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      icon: '👥',
      title: 'Teilnehmer*innen hinzufügen',
      description: 'Neuen Teilnehmer*innen registrieren',
      path: '/admin/participants',
      color: 'blue'
    },
    {
      icon: '📰',
      title: 'Nachricht erstellen',
      description: 'Neue Ankündigung veröffentlichen',
      path: '/admin/news',
      color: 'green'
    },
    {
      icon: '📅',
      title: 'Event planen',
      description: 'Neue Veranstaltung hinzufügen',
      path: '/admin/timetable',
      color: 'indigo'
    }
  ];

  const getColorStyles = (color) => {
    const colorMap = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40',
      green: 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40',
      indigo: 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <AdminCard
      title="Schnellaktionen"
      icon="⚡"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => navigate(action.path)}
            className={`p-4 ${getColorStyles(action.color)} rounded-lg transition-colors text-left`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{action.icon}</span>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {action.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </AdminCard>
  );
}
