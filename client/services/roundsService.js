// Rounds API service
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';

export const roundsService = {
  // Get all rounds
  async getRounds() {
    const response = await fetch(`${API_URL}/rounds`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch rounds: ${response.statusText}`);
    }
    return response.json();
  },

  // Get single round by ID
  async getRound(id) {
    const response = await fetch(`${API_URL}/rounds/${id}`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch round: ${response.statusText}`);
    }
    return response.json();
  },

  // Create new round
  async createRound(roundData) {
    const response = await fetch(`${API_URL}/rounds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(roundData)
    });
    if (!response.ok) {
      throw new Error(`Failed to create round: ${response.statusText}`);
    }
    return response.json();
  },

  // Update round
  async updateRound(id, roundData) {
    const response = await fetch(`${API_URL}/rounds/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(roundData)
    });
    if (!response.ok) {
      throw new Error(`Failed to update round: ${response.statusText}`);
    }
    return response.json();
  },

  // Delete round
  async deleteRound(id) {
    const response = await fetch(`${API_URL}/rounds/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to delete round: ${response.statusText}`);
    }
    return response.json();
  }
};
