/**
 * Centralized category translations for the SLAM25 project
 * This ensures consistent German translations across all components
 */

// Info Pages Categories
export const infoPageCategories = {
  'rules': 'Regeln',
  'general': 'Allgemein',
  'info': 'Informationen',
  'guidelines': 'Richtlinien',
  'legal': 'Rechtliches',
  'help': 'Hilfe',
  'about': 'Über uns',
  'contact': 'Kontakt',
  'location': 'Standort',
  'participation': 'Teilnahme'
};

// News Categories
export const newsCategories = {
  'announcement': 'Neuigkeiten',
  'workshops': 'Hinweise',
  'participants': 'Teilnehmer*innen',
  'prizes': 'Tipps und Tricks',
  'general': 'Allgemein',
  'news': 'Nachrichten',
  'update': 'Updates',
  'info': 'Informationen',
  'jury': 'Jury',
  'updated': 'Aktualisiert'
};

// City Tips Categories
export const cityTipsCategories = {
  'culture': 'Kultur',
  'cafe': 'Café',
  'restaurant': 'Restaurant',
  'bar': 'Bar',
  'shopping': 'Shopping',
  'hotel': 'Hotel',
  'transport': 'Transport',
  'landmark': 'Sehenswürdigkeit',
  'nature': 'Natur',
  'leisure': 'Freizeit',
  'sports': 'Sport',
  'neighborhood': 'Stadtteil',
  'venue': 'Veranstaltungsort',
  'food': 'Essen & Trinken',
  'updated-category': 'Aktualisiert'
};

// News Category Icons
export const newsCategoryIcons = {
  'announcement': '📢',
  'workshops': '🎓',
  'participants': '👥',
  'prizes': '🏆',
  'general': '📰',
  'news': '📰',
  'update': '🔄',
  'info': 'ℹ️',
  'jury': '⚖️',
  'updated': '🔄'
};

// City Tips Category Icons
export const cityTipsCategoryIcons = {
  'culture': '🎭',
  'cafe': '☕',
  'restaurant': '🍽️',
  'bar': '🍺',
  'shopping': '🛍️',
  'hotel': '🏨',
  'transport': '🚇',
  'landmark': '🏛️',
  'nature': '🌳',
  'leisure': '🏊',
  'sports': '⚽',
  'neighborhood': '🏘️',
  'venue': '🎪',
  'food': '🍴',
  'updated-category': '🔄'
};

// City Tips Category Colors
export const cityTipsCategoryColors = {
  'culture': 'bg-purple-500',
  'cafe': 'bg-yellow-500',
  'restaurant': 'bg-red-500',
  'bar': 'bg-blue-500',
  'shopping': 'bg-green-500',
  'hotel': 'bg-indigo-500',
  'transport': 'bg-orange-500',
  'landmark': 'bg-red-600',
  'nature': 'bg-green-600',
  'leisure': 'bg-cyan-500',
  'sports': 'bg-orange-600',
  'neighborhood': 'bg-gray-500',
  'venue': 'bg-pink-500',
  'food': 'bg-amber-500',
  'updated-category': 'bg-gray-400'
};

// Generic translation function
export const translateCategory = (category, type = 'info') => {
  switch (type) {
    case 'info':
      return infoPageCategories[category] || category;
    case 'news':
      return newsCategories[category] || category;
    case 'cityTips':
      return cityTipsCategories[category] || category;
    default:
      return category;
  }
};

// Generic icon function
export const getCategoryIcon = (category, type = 'news') => {
  switch (type) {
    case 'news':
      return newsCategoryIcons[category] || '📰';
    case 'cityTips':
      return cityTipsCategoryIcons[category] || '📍';
    default:
      return '📄';
  }
};

// Generic color function
export const getCategoryColor = (category, type = 'cityTips') => {
  switch (type) {
    case 'cityTips':
      return cityTipsCategoryColors[category] || 'bg-gray-500';
    default:
      return 'bg-gray-500';
  }
};

// Get all available categories for a type
export const getAvailableCategories = (type) => {
  switch (type) {
    case 'info':
      return Object.keys(infoPageCategories);
    case 'news':
      return Object.keys(newsCategories);
    case 'cityTips':
      return Object.keys(cityTipsCategories);
    default:
      return [];
  }
};

// Round Status Translations
export const roundStatusTranslations = {
  'upcoming': 'Anstehend',
  'active': 'Aktiv', 
  'completed': 'Abgeschlossen',
  'cancelled': 'Abgesagt',
  'confirmed': 'Bestätigt',
  'planned': 'Geplant',
  // Database status values (uppercase)
  'SCHEDULED': 'Geplant',
  'ACTIVE': 'Aktiv',
  'COMPLETED': 'Abgeschlossen',
  'CANCELLED': 'Abgesagt',
  'POSTPONED': 'Verschoben'
};

// Round Status Icons
export const roundStatusIcons = {
  'upcoming': '⏳',
  'active': '🎭',
  'completed': '✅',
  'cancelled': '❌',
  'confirmed': '✔️',
  'planned': '📋',
  // Database status values (uppercase)
  'SCHEDULED': '📋',
  'ACTIVE': '🎭',
  'COMPLETED': '✅',
  'CANCELLED': '❌',
  'POSTPONED': '⏸️'
};

// Round Status Colors (for badges)
export const roundStatusColors = {
  'upcoming': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'active': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'confirmed': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  'planned': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  // Database status values (uppercase)
  'SCHEDULED': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  'ACTIVE': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'COMPLETED': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'CANCELLED': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'POSTPONED': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
};

// Round Status Colors (for dark mode)
export const roundStatusColorsDark = {
  'upcoming': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  'active': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  'completed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  'confirmed': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
  'planned': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
  // Database status values (uppercase)
  'SCHEDULED': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
  'ACTIVE': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  'COMPLETED': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  'CANCELLED': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  'POSTPONED': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
};

// Round status translation function
export const translateRoundStatus = (status) => {
  return roundStatusTranslations[status] || status;
};

// Round status icon function
export const getRoundStatusIcon = (status) => {
  return roundStatusIcons[status] || '📋';
};

// Round status color function
export const getRoundStatusColor = (status, darkMode = false) => {
  return darkMode ? roundStatusColorsDark[status] || roundStatusColorsDark['planned'] : roundStatusColors[status] || roundStatusColors['planned'];
};

// Get all available round statuses
export const getAvailableRoundStatuses = () => {
  return Object.keys(roundStatusTranslations);
};

// Get round status options for forms
export const getRoundStatusOptions = () => {
  return Object.entries(roundStatusTranslations).map(([value, label]) => ({ 
    value, 
    label,
    icon: roundStatusIcons[value],
    color: roundStatusColors[value]
  }));
};

// Get category options for forms
export const getCategoryOptions = (type) => {
  switch (type) {
    case 'info':
      return Object.entries(infoPageCategories).map(([value, label]) => ({ value, label }));
    case 'news':
      return Object.entries(newsCategories).map(([value, label]) => ({ value, label }));
    case 'cityTips':
      return Object.entries(cityTipsCategories).map(([value, label]) => ({ value, label }));
    default:
      return [];
  }
};
