import React from 'react';

export default function FilterSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Alle',
  className = '',
  ...props
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${className}`}
      {...props}
    >
      <option value="all">{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
