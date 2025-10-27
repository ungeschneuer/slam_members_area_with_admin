import React from 'react';
import TimetableEventItem from './TimetableEventItem.jsx';

export default function TimetableEventList({
  events,
  onEdit,
  onDelete,
  onMoveEvent,
  getCategoryColors
}) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Keine Events gefunden</h3>
        <p className="text-gray-600 dark:text-gray-400">Versuche deine Datumsfilter anzupassen oder füge neue Events hinzu</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <TimetableEventItem
          key={event.id}
          event={event}
          index={index}
          totalEvents={events.length}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={(eventId) => onMoveEvent(eventId, 'up')}
          onMoveDown={(eventId) => onMoveEvent(eventId, 'down')}
          getCategoryColors={getCategoryColors}
        />
      ))}
    </div>
  );
}

