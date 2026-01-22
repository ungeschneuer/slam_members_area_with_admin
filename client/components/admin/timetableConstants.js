// Shared constants for timetable components
export const eventTypes = [
  { value: 'team-round', label: 'Team-Runde', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: '👥' },
  { value: 'individual-round', label: 'Einzel-Runde', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: '👤' },
  { value: 'workshop', label: 'Workshop', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: '🎓' },
  { value: 'fun', label: 'Fun', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: '🎉' },
  { value: 'aftershow', label: 'Aftershow', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: '🎭' },
  { value: 'panel', label: 'Panel', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: '🎤' },
  { value: 'networking', label: 'Netzwerktreffen', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200', icon: '🤝' },
  { value: 'akkreditierung', label: 'Akkreditierung', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200', icon: '🪪' },
  { value: 'festivalzentrum', label: 'Festivalzentrum', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200', icon: '🏟️' }
];

export const linkTypes = [
  { value: 'form', label: 'Formular', icon: '📝' },
  { value: 'document', label: 'Dokument', icon: '📄' },
  { value: 'list', label: 'Liste', icon: '📋' },
  { value: 'stream', label: 'Live-Stream', icon: '📺' },
  { value: 'menu', label: 'Speisekarte', icon: '🍽️' },
  { value: 'info', label: 'Information', icon: 'ℹ️' },
  { value: 'ticket', label: 'Tickets', icon: '🎫' }
];

// Helper function to get category color scheme
export const getCategoryColors = (eventType) => {
  switch (eventType) {
    case 'team-round':
      return {
        cardBg: 'bg-red-100 dark:bg-red-900/40',
        cardBorder: 'border-red-300 dark:border-red-700'
      };
    case 'individual-round':
      return {
        cardBg: 'bg-blue-100 dark:bg-blue-900/40',
        cardBorder: 'border-blue-300 dark:border-blue-700'
      };
    case 'workshop':
      return {
        cardBg: 'bg-green-100 dark:bg-green-900/40',
        cardBorder: 'border-green-300 dark:border-green-700'
      };
    case 'fun':
      return {
        cardBg: 'bg-yellow-100 dark:bg-yellow-900/40',
        cardBorder: 'border-yellow-300 dark:border-yellow-700'
      };
    case 'aftershow':
      return {
        cardBg: 'bg-purple-100 dark:bg-purple-900/40',
        cardBorder: 'border-purple-300 dark:border-purple-700'
      };
    default:
      return {
        cardBg: 'bg-gray-100 dark:bg-gray-800',
        cardBorder: 'border-gray-300 dark:border-gray-600'
      };
  }
};
