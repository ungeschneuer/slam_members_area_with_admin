import React from 'react';
import { Controller } from 'react-hook-form';

export default function FormField({
  name,
  control,
  rules,
  defaultValue,
  render,
  errors,
  className = ''
}) {
  const hasError = errors && errors[name];
  
  return (
    <div className={className}>
      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue}
        rules={rules}
        render={({ field, fieldState }) => (
          <div>
            {render({ field, fieldState, hasError })}
            {hasError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors[name].message}
              </p>
            )}
          </div>
        )}
      />
    </div>
  );
}
