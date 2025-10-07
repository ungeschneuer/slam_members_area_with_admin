import React from 'react';
import authService from '../services/authService.js';

/**
 * Simple authentication status indicator
 * Shows current authentication state without being intrusive
 */
export default function AuthStatus() {
  const [authState, setAuthState] = React.useState({
    isAuthenticated: false,
    isAdmin: false,
    user: null
  });

  React.useEffect(() => {
    // Get initial auth state
    const updateAuthState = () => {
      setAuthState(authService.getAuthState());
    };

    // Update on auth changes
    const handleAuthChange = (event) => {
      if (event.detail) {
        setAuthState({
          isAuthenticated: event.detail.isAuthenticated,
          isAdmin: event.detail.user?.role === 'admin' || event.detail.user?.role === 'organizer',
          user: event.detail.user
        });
      }
    };

    // Initial state
    updateAuthState();

    // Listen for auth changes
    window.addEventListener('slam:auth-changed', handleAuthChange);

    return () => {
      window.removeEventListener('slam:auth-changed', handleAuthChange);
    };
  }, []);

  // Only show in development or when authenticated
  if (process.env.NODE_ENV === 'production' && !authState.isAuthenticated) {
    return null;
  }

  return (
    <div className="text-xs text-gray-500 dark:text-gray-400">
      {authState.isAuthenticated ? (
        <span className="text-green-600 dark:text-green-400">
          ✓ Angemeldet
        </span>
      ) : (
        <span className="text-gray-400 dark:text-gray-500">
          Nicht angemeldet
        </span>
      )}
    </div>
  );
}
