import React from 'react';

/**
 * TimetableErrorDisplay
 *
 * Displays validation and server errors for timetable forms.
 * Extracted from AdminTimetable.jsx to improve code organization.
 */
export default function TimetableErrorDisplay({
  formErrors = {},
  componentError = null,
  serverError = null
}) {
  const hasFormErrors = Object.keys(formErrors).length > 0;

  if (!hasFormErrors && !componentError && !serverError) {
    return null;
  }

  return (
    <>
      {/* Form Validation Errors */}
      {hasFormErrors && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4" role="alert" aria-live="polite">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            Bitte korrigieren Sie die folgenden Fehler:
          </h3>
          <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
            {Object.entries(formErrors).map(([field, error]) => (
              <li key={field}>
                <span className="font-medium">{field}:</span> {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Component Error Display */}
      {componentError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4" role="alert" aria-live="polite">
          <p className="text-sm text-red-700 dark:text-red-300">
            {componentError.message || componentError}
          </p>
        </div>
      )}

      {/* Server Error Display */}
      {serverError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4" role="alert" aria-live="assertive">
          <p className="text-sm text-red-700 dark:text-red-300">
            {serverError}
          </p>
        </div>
      )}
    </>
  );
}
