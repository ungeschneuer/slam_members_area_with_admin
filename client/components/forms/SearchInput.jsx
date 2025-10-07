import React from 'react';

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Suchen...',
  className = '',
  icon = '🔍',
  ...props
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span className="text-gray-400 text-lg">{icon}</span>
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        {...props}
      />
    </div>
  );
}
