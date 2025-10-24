export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';

// Admin participant limit for dropdowns/selectors (no pagination)
// Reads from environment variable with fallback to 1000 (divisible by 4)
export const ADMIN_PARTICIPANTS_LIMIT = parseInt(import.meta.env.VITE_ADMIN_PARTICIPANTS_LIMIT || '1000', 10);
