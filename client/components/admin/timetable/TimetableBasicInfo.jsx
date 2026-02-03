import React from 'react';
import TextareaInput from '../../forms/TextareaInput.jsx';

/**
 * TimetableBasicInfo
 *
 * Renders basic information fields for timetable events.
 * Extracted from AdminTimetable.jsx to improve code organization.
 */
export default function TimetableBasicInfo({
  form,
  eventTypes,
  statuses
}) {
  return (
    <>
      {/* Helper text for required fields */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Felder mit <span className="text-red-500">*</span> sind Pflichtfelder
      </p>

      {/* Basic Information */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Titel <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            aria-label="Titel"
            aria-required="true"
            {...form.register('title')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Slug (URL-freundlich) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            aria-label="Slug"
            aria-required="true"
            {...form.register('slug')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Wird automatisch generiert"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Wird automatisch aus dem Titel generiert, kann aber manuell angepasst werden</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ort <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            aria-label="Ort"
            aria-required="true"
            {...form.register('location')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Datum <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            aria-label="Datum"
            aria-required="true"
            {...form.register('date')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Startzeit <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              aria-label="Startzeit"
              aria-required="true"
              {...form.register('time')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Endzeit</label>
            <input
              type="time"
              aria-label="Endzeit"
              {...form.register('endTime')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Typ</label>
          <select
            aria-label="Typ"
            {...form.register('type')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            {eventTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
          <select
            aria-label="Status"
            {...form.register('status')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            {statuses.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Descriptions */}
      <div className="space-y-4">
        <div>
          <TextareaInput
            label="Kurze Beschreibung"
            name="description"
            register={form.register}
            errors={form.formState.errors}
            placeholder="Kurze Beschreibung des Events..."
            rows={3}
            ariaLabel="Kurze Beschreibung"
          />
        </div>
        <div>
          <TextareaInput
            label="Detaillierte Beschreibung"
            name="detailedDescription"
            register={form.register}
            errors={form.formState.errors}
            placeholder="Detaillierte Beschreibung mit allen wichtigen Informationen..."
            rows={5}
            ariaLabel="Detaillierte Beschreibung"
          />
        </div>
      </div>
    </>
  );
}
