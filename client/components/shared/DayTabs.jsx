import React from 'react';

/**
 * DayTabs - Simple day tab navigation component
 * @param {Object} props
 * @param {Array} props.days - Array of day objects with {id, label, subtitle}
 * @param {string} props.activeDay - Currently active day ID
 * @param {Function} props.onDayChange - Callback when day changes
 */
function DayTabs({ days, activeDay, onDayChange }) {
  // Handle keyboard navigation
  const handleKeyDown = (event, dayId) => {
    const currentIndex = days.findIndex(day => day.id === dayId);
    
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : days.length - 1;
        onDayChange(days[prevIndex].id);
        break;
      case 'ArrowRight':
        event.preventDefault();
        const nextIndex = currentIndex < days.length - 1 ? currentIndex + 1 : 0;
        onDayChange(days[nextIndex].id);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onDayChange(dayId);
        break;
    }
  };

  if (!days || days.length === 0) {
    return null;
  }

  return (
    <div 
      className="flex gap-2 overflow-x-auto snap-x pb-2"
      role="tablist"
      aria-label="Tage auswählen"
    >
      {days.map((day) => (
        <button
          key={day.id}
          onClick={() => onDayChange(day.id)}
          onKeyDown={(e) => handleKeyDown(e, day.id)}
          className={`px-6 py-3 rounded-lg font-medium transition-colors snap-start min-w-max
            ${activeDay === day.id 
              ? 'bg-pink-500 text-white shadow-md' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          role="tab"
          aria-selected={activeDay === day.id}
          aria-controls={`day-content-${day.id}`}
          aria-label={`${day.label}: ${day.subtitle}`}
          tabIndex={activeDay === day.id ? 0 : -1}
        >
          <div className="text-sm font-bold">{day.label}</div>
          <div className="text-xs opacity-90">{day.subtitle}</div>
        </button>
      ))}
    </div>
  );
}

export default DayTabs;
