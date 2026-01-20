// Rounds API service - refactored to use centralized utilities
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/apiWrapper.js';
import { ROUNDS_ENDPOINTS } from '../constants/apiEndpoints.js';

export const roundsService = {
  // Get all rounds
  async getRounds() {
    return await apiGet(ROUNDS_ENDPOINTS.BASE);
  },

  // Get single round by ID
  async getRound(id) {
    return await apiGet(ROUNDS_ENDPOINTS.BY_ID(id));
  },

  // Create new round
  async createRound(roundData) {
    return await apiPost(ROUNDS_ENDPOINTS.BASE, roundData);
  },

  // Update round
  async updateRound(id, roundData) {
    return await apiPut(ROUNDS_ENDPOINTS.BY_ID(id), roundData);
  },

  // Delete round
  async deleteRound(id) {
    return await apiDelete(ROUNDS_ENDPOINTS.BY_ID(id));
  }
};
