// User Password Protection Constants
// Centralized configuration for user area password protection

export const USER_PASSWORD_CONSTANTS = {
  // Database settings
  SETTINGS_KEY: 'user_area_password',
  
  // Cookie settings
  COOKIE_NAME: 'userAuth',
  COOKIE_VALUE: 'authenticated',
  COOKIE_MAX_AGE: 14 * 24 * 60 * 60 * 1000, // 14 days in milliseconds
  
  // Password validation
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 100,
  
  // API endpoints
  ENDPOINTS: {
    VERIFY: '/api/user-auth/verify',
    LOGOUT: '/api/user-auth/logout',
    STATUS: '/api/user-auth/status',
    SET_PASSWORD: '/api/settings/user-password',
    PASSWORD_STATUS: '/api/settings/user-password/status'
  },
  
  // Error messages (German)
  ERROR_MESSAGES: {
    PASSWORD_REQUIRED: 'Bitte Passwort eingeben',
    PASSWORD_TOO_SHORT: 'Passwort muss mindestens 6 Zeichen lang sein',
    PASSWORD_TOO_LONG: 'Passwort muss zwischen 1 und 100 Zeichen lang sein',
    WRONG_PASSWORD: 'Falsches Passwort',
    NETWORK_ERROR: 'Netzwerkfehler',
    PROTECTION_NOT_ENABLED: 'Passwort-Schutz ist nicht aktiviert',
    VALIDATION_ERROR: 'VALIDIERUNGSFEHLER'
  },
  
  // Success messages (German)
  SUCCESS_MESSAGES: {
    AUTHENTICATION_SUCCESS: 'Anmeldung erfolgreich',
    LOGOUT_SUCCESS: 'Abmeldung erfolgreich',
    PASSWORD_SET_SUCCESS: 'Passwort erfolgreich gesetzt'
  },
  
  // Status messages (German)
  STATUS_MESSAGES: {
    LOADING: 'Lade Schutz-Status...',
    SAVING: 'Speichere...',
    CHECKING: 'Prüfe...',
    ENTER: 'Eintreten'
  }
};

// Cookie configuration object - single source of truth
export const USER_AUTH_COOKIE_CONFIG = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: USER_PASSWORD_CONSTANTS.COOKIE_MAX_AGE,
  path: '/'
};

// Password validation rules
export const PASSWORD_VALIDATION_RULES = {
  minLength: USER_PASSWORD_CONSTANTS.MIN_PASSWORD_LENGTH,
  maxLength: USER_PASSWORD_CONSTANTS.MAX_PASSWORD_LENGTH,
  required: true,
  trim: true,
  escape: true
};

// Additional exports for better organization
export const {
  SETTINGS_KEY,
  COOKIE_NAME,
  COOKIE_VALUE,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  STATUS_MESSAGES
} = USER_PASSWORD_CONSTANTS;
