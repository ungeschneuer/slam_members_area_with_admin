import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService.js';
import logger from '../services/logger.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication status on mount
    const checkAuth = async () => {
      try {
        const isAuthenticated = authService.isAdmin();
        setIsAdmin(isAuthenticated);
        
        // If admin, automatically set user as authenticated
        if (isAuthenticated) {
          setIsUserAuthenticated(true);
        } else {
          // Check user authentication status
          await checkUserAuth();
        }
      } catch (error) {
        // Auth check failed - user not authenticated
        logger.error('Auth check failed during initialization', { error: error.message });
        setIsAdmin(false);
        setIsUserAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Check user authentication status
  const checkUserAuth = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/user-auth/status`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setIsUserAuthenticated(data.data.authenticated);
        // If admin status changes, update user auth accordingly
        if (data.data.isAdmin) {
          setIsUserAuthenticated(true);
        }
      }
    } catch (error) {
      // User auth check failed - keep current state
      logger.warn('User auth status check failed', { error: error.message });
    }
  };

  const login = async (credentials) => {
    try {
      const success = await authService.login(credentials);
      if (success) {
        setIsAdmin(true);
        setIsUserAuthenticated(true); // Admin automatically has user access
      }
      return success;
    } catch (error) {
      // Login failed
      logger.error('Admin login failed', { error: error.message });
      return false;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setIsAdmin(false);
      setIsUserAuthenticated(false);
    } catch (error) {
      // Logout failed - still clear local state
      logger.error('Admin logout failed', { error: error.message });
    }
  };

  // User area authentication functions
  const userLogin = async (password) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/user-auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsUserAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      // User login failed
      logger.error('User login failed', { error: error.message });
      return { success: false, error: 'Netzwerkfehler' };
    }
  };

  const userLogout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/user-auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      setIsUserAuthenticated(false);
    } catch (error) {
      // User logout failed - still clear local state
      logger.warn('User logout failed', { error: error.message });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAdmin, 
      setIsAdmin, 
      isUserAuthenticated,
      setIsUserAuthenticated,
      isLoading, 
      login, 
      logout,
      userLogin,
      userLogout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
