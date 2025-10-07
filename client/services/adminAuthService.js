/**
 * Admin Authentication Service for SLAM25
 * Uses the simplified authService for real API calls
 */

import authService from './authService.js';

const adminAuthService = {
  /**
   * Initialize the admin auth service
   */
  async init() {
    return await authService.init();
  },

  /**
   * Login with email and password
   */
  async login(email, password, remember = false) {
    const result = await authService.login(email, password, remember);
    if (result.success) {
      return {
        success: true,
        user: result.user,
        isAdmin: authService.isAdmin()
      };
    }
    return result;
  },

  /**
   * Logout user
   */
  async logout() {
    return await authService.logout();
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    return authService.isLoggedIn();
  },

  /**
   * Get current user
   */
  getCurrentUser() {
    return authService.getCurrentUserSync();
  },

  /**
   * Get authentication state
   */
  getAuthState() {
    return authService.getAuthState();
  },

  /**
   * Check if user is admin
   */
  isAdminUser() {
    return authService.isAdmin();
  },

  /**
   * Make authenticated request
   */
  async authenticatedRequest(input, init) {
    return await authService.authenticatedRequest(input, init);
  }
};

export default adminAuthService;


