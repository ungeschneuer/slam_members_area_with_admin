import React from 'react';
import { Controller } from 'react-hook-form';

export default function SelectInput({
  label,
  name,
  register,
  rules,
  options = [],
  disabled = false,
  errors,
  className = '',
  control,
  defaultValue,
  required = false,
  placeholder = 'Bitte wählen...'
}) {
  const hasError = errors && errors[name];
  
  // If control is provided, use Controller for better RHF integration
  if (control) {
    return (
      <div>
        {label && (
          <label htmlFor={name} className="label-base">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <Controller
          name={name}
          control={control}
          defaultValue={defaultValue}
          rules={rules}
          render={({ field }) => (
            <select
              {...field}
              id={name}
              disabled={disabled}
              aria-invalid={hasError ? 'true' : 'false'}
              className={`select-base ${hasError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-accent focus:border-primary'} ${className}`}
            >
              <option value="">{placeholder}</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        />
        {hasError && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{errors[name].message}</p>
        )}
      </div>
    );
  }
  
  // Fallback to register-based approach
  return (
    <div>
      {label && (
        <label htmlFor={name} className="label-base">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        aria-invalid={hasError ? 'true' : 'false'}
        {...(register ? register(name, rules) : {})}
        disabled={disabled}
        className={`select-base ${hasError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-accent focus:border-primary'} ${className}`}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hasError && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{errors[name].message}</p>
      )}
    </div>
  );
}


