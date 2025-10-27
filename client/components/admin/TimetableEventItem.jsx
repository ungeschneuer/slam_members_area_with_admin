import React from 'react';
import { formatDateForDisplay } from '../../utils/dateUtils.js';
import { eventTypes } from './timetableConstants.js';

export default function TimetableEventItem({
  event,
  index,
  totalEvents,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  getCategoryColors
}) {
  const colors = getCategoryColors(event.type);
  const eventType = eventTypes.find(type => type.value === event.type);
  
  return (
    <div className={`card-base p-4 sm:p-6 ${colors.cardBg} ${colors.cardBorder} border-2`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-xl sm:text-2xl flex-shrink-0">{eventType?.icon || '📅'}</span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white break-words">
                {event.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${eventType?.color || 'bg-gray-100 text-gray-800'}`}>
                  {eventType?.label || event.type}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="break-words">{formatDateForDisplay(event.date)}</span>
                <span className="hidden sm:inline">•</span>
                <span className="break-words">{event.time} - {event.end_time}</span>
              </div>
            </div>
          </div>
          
          {event.description && (
            <p className="text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
              {event.description}
            </p>
          )}
          
          {event.location && (
            <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
              <span className="flex-shrink-0">📍</span>
              <span className="break-words">{event.location}</span>
            </div>
          )}
          
          {event.assignments && event.assignments.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>👥</span>
                <span>Teilnehmer*innen:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {event.assignments.slice(0, 3).map((assignment, idx) => (
                  <span
                    key={`assignment-${assignment.participant_id || assignment.id || idx}`}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs"
                  >
                    {assignment.participant_name}
                  </span>
                ))}
                {event.assignments.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                    +{event.assignments.length - 3} weitere
                  </span>
                )}
              </div>
            </div>
          )}
          
          {event.additional_links && event.additional_links.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>🔗</span>
                <span>Links:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {event.additional_links.slice(0, 3).map((link, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs"
                  >
                    {link.title}
                  </span>
                ))}
                {event.additional_links.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                    +{event.additional_links.length - 3} weitere
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 sm:ml-4">
          {/* Move Up/Down Buttons */}
          <button
            onClick={() => onMoveUp(event.id)}
            disabled={index === 0}
            className="h-10 w-10 text-xs bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95 flex items-center justify-center"
            title="Nach oben"
            aria-label={`Event "${event.title}" nach oben verschieben`}
          >
            ↑
          </button>
          <button
            onClick={() => onMoveDown(event.id)}
            disabled={index === totalEvents - 1}
            className="h-10 w-10 text-xs bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95 flex items-center justify-center"
            title="Nach unten"
            aria-label={`Event "${event.title}" nach unten verschieben`}
          >
            ↓
          </button>
          <button
            onClick={() => onEdit(event)}
            className="h-10 px-3 text-sm text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 touch-manipulation active:scale-95 rounded font-medium"
            aria-label={`Event "${event.title}" bearbeiten`}
          >
            Bearbeiten
          </button>
          <button
            onClick={() => onDelete(event.id)}
            className="h-10 px-3 text-sm text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 touch-manipulation active:scale-95 rounded font-medium"
            aria-label={`Event "${event.title}" löschen`}
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}

