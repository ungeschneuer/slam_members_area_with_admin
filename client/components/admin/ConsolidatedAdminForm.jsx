// Consolidated AdminForm component that merges FormField, EnhancedForm, and ValidationSummary
import React from 'react';
import { Controller } from 'react-hook-form';

// Consolidated FormField component
function FormField({
  name,
  control,
  label,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  className = '',
  fieldClassName = '',
  errorClassName = '',
  helpText,
  validation,
  getFieldState,
  ...props
}) {
  const fieldState = getFieldState ? getFieldState(name) : {};

  const getInputClasses = () => {
    const baseClasses = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400';
    const stateClasses = fieldState.hasError 
      ? 'border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/20' 
      : fieldState.isValid 
        ? 'border-green-500 focus:ring-green-500 bg-green-50 dark:bg-green-900/20'
        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 bg-white dark:bg-gray-800';
    
    return `${baseClasses} ${stateClasses} ${fieldClassName}`;
  };

  const getLabelClasses = () => {
    const baseClasses = 'block text-sm font-medium mb-1';
    const stateClasses = fieldState.hasError 
      ? 'text-red-700 dark:text-red-300' 
      : 'text-gray-700 dark:text-gray-200';
    
    return `${baseClasses} ${stateClasses}`;
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className={getLabelClasses()}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <Controller
        name={name}
        control={control}
        rules={validation}
        render={({ field, fieldState }) => (
          <>
            {type === 'textarea' ? (
              <textarea
                {...field}
                {...props}
                placeholder={placeholder}
                disabled={disabled}
                className={getInputClasses()}
                rows={3}
              />
            ) : type === 'select' ? (
              <select
                {...field}
                {...props}
                disabled={disabled}
                className={getInputClasses()}
              >
                {props.options?.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                {...field}
                {...props}
                type={type}
                placeholder={placeholder}
                disabled={disabled}
                className={getInputClasses()}
              />
            )}
            
            {fieldState.error && (
              <p className={`text-sm text-red-600 dark:text-red-400 ${errorClassName}`}>
                {fieldState.error.message}
              </p>
            )}
          </>
        )}
      />
      
      {helpText && !fieldState.error && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {helpText}
        </p>
      )}
    </div>
  );
}

// Validation Summary component
function ValidationSummary({ errors, className = '' }) {
  if (!errors || Object.keys(errors).length === 0) {
    return null;
  }

  return (
    <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            Bitte korrigieren Sie die folgenden Fehler:
          </h3>
          <div className="mt-2 text-sm text-red-700 dark:text-red-300">
            <ul className="list-disc pl-5 space-y-1">
              {Object.entries(errors).map(([field, error]) => (
                <li key={field}>
                  <strong>{field}:</strong> {error.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main consolidated AdminForm component
export default function ConsolidatedAdminForm({
  title,
  subtitle,
  children,
  onSubmit,
  onCancel,
  submitLabel = 'Speichern',
  cancelLabel = 'Abbrechen',
  loading = false,
  error = null,
  success = null,
  className = '',
  variant = 'default', // 'default', 'modal', 'inline'
  validationErrors = null,
  ...formProps
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'modal':
        return 'bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700';
      case 'inline':
        return 'bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600';
      default:
        return 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit && !loading) {
      onSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`${getVariantStyles()} ${className}`}
      {...formProps}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-4">
        {/* Validation Summary */}
        {validationErrors && <ValidationSummary errors={validationErrors} className="mb-4" />}
        
        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-4">
          {children}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel || 'Abbrechen'}
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {loading && (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {submitLabel || 'Speichern'}
        </button>
      </div>
    </form>
  );
}

// Export the FormField as a named export for use in other components
export { FormField };
