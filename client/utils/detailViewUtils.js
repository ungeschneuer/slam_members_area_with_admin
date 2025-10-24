/**
 * Shared utility functions for detail view components
 * Centralizes formatting and display logic to eliminate code duplication
 */

// Role color badges for consistent styling
export const getRoleColor = (role) => {
  switch (role) {
    case 'Teilnehmer*in': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'Jury': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    case 'Supporter*in': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'Crew': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    case 'SLAM-MC': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    case 'Organisator*in': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'Moderator*in': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
    case 'Techniker*in': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'Fotograf*in': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300';
    case 'Videograf*in': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

// Region pin emojis for consistent display
export const getRegionFlag = (region) => {
  if (!region) return '';
  return '📍'; // General pin emoji for all regions
};

// Time formatting for consistent display
export const formatTime = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return '--:--';
  
  if (/^\d{2}:\d{2}$/.test(timeString)) {
    return timeString;
  }
  
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
    return timeString.substring(0, 5);
  }
  
  if (timeString.includes('T')) {
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return '--:--';
      return date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Berlin'
      });
    } catch (error) {
      return '--:--';
    }
  }
  
  return timeString;
};

// Date formatting for consistent display
export const formatDate = (dateString) => {
  if (!dateString) return 'Unbekanntes Datum';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Europe/Berlin'
    });
  } catch (error) {
    return dateString;
  }
};

// Event type information for consistent display
export const getEventTypeInfo = (type) => {
  switch (type) {
    case 'team-round':
      return { icon: '👥', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', label: 'Team-Runde' };
    case 'individual-round':
      return { icon: '👤', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', label: 'Einzel-Runde' };
    case 'workshop':
      return { icon: '🎓', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', label: 'Workshop' };
    case 'fun':
      return { icon: '🎉', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', label: 'Fun' };
    case 'aftershow':
      return { icon: '🎭', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300', label: 'Aftershow' };
    default:
      return { icon: '📅', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', label: 'Event' };
  }
};

// Get icon emoji for content type
export const getContentTypeIcon = (type) => {
  const icons = {
    'participant': '👤',
    'team': '👥',
    'round': '🏆',
    'news': '📰',
    'cityTip': '🏙️',
    'event': '📅'
  };
  return icons[type] || '📄';
};

// Get Tailwind gradient classes for content type
export const getContentTypeGradient = (type) => {
  const gradients = {
    'participant': 'from-blue-500 to-purple-600',
    'team': 'from-blue-500 to-blue-600',
    'round': 'from-purple-500 to-pink-600',
    'news': 'from-blue-500 to-indigo-600',
    'cityTip': 'from-blue-500 to-purple-600',
    'event': 'from-blue-500 to-purple-600'
  };
  return gradients[type] || 'from-gray-500 to-gray-600';
};
