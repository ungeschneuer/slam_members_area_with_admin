import React from 'react';

/**
 * TimetableLinksSection
 *
 * Manages additional links for timetable events.
 * Extracted from AdminTimetable.jsx to improve code organization.
 */
export default function TimetableLinksSection({
  linkFields,
  linkTypes,
  form,
  onAppendLink,
  onRemoveLink
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Zusätzliche Links</h3>
        <button
          type="button"
          onClick={() => onAppendLink({ type: linkTypes[0]?.value || '', title: '', url: '' })}
          className="min-h-[44px] px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors touch-manipulation active:scale-95"
        >
          Link hinzufügen
        </button>
      </div>

      {linkFields.map((link, index) => (
        <div key={`timetable-link-${link.id || `new-${index}`}`} className="flex items-center space-x-3 mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <select
            {...form.register(`additionalLinks.${index}.type`)}
            aria-label="Link-Typ"
            className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            {linkTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Titel"
            aria-label="Link-Titel"
            {...form.register(`additionalLinks.${index}.title`)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          <input
            type="url"
            placeholder="URL"
            aria-label="Link-URL"
            {...form.register(`additionalLinks.${index}.url`)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          <button
            type="button"
            onClick={() => onRemoveLink(index)}
            className="min-h-[44px] min-w-[44px] px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 focus-contained rounded flex items-center justify-center touch-manipulation active:scale-95"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
