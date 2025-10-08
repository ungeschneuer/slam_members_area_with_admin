import { API_URL } from '../config/api.js';

/**
 * Service for managing junction table relationships
 * Handles round participants, crew, feature artists, and timetable participants
 */

// ROUND PARTICIPANTS MANAGEMENT
export const addRoundParticipant = async (roundId, participantId, role = 'Teilnehmer') => {
  try {
    const response = await fetch(`/api/rounds/${roundId}/participants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ participantId, role })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding participant to round:', error);
    throw error;
  }
};

export const removeRoundParticipant = async (roundId, participantId) => {
  try {
    const response = await fetch(`/api/rounds/${roundId}/participants/${participantId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error removing participant from round:', error);
    throw error;
  }
};

// ROUND CREW MANAGEMENT
export const addRoundCrew = async (roundId, participantId, role) => {
  try {
    const response = await fetch(`/api/rounds/${roundId}/crew`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ participantId, role })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding crew member to round:', error);
    throw error;
  }
};

export const removeRoundCrew = async (roundId, participantId) => {
  try {
    const response = await fetch(`/api/rounds/${roundId}/crew/${participantId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error removing crew member from round:', error);
    throw error;
  }
};

export const removeRoundCrewRole = async (roundId, participantId, role) => {
  try {
    const response = await fetch(`/api/rounds/${roundId}/crew/${participantId}/${encodeURIComponent(role)}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error removing crew role from round:', error);
    throw error;
  }
};

// ROUND FEATURE ARTISTS MANAGEMENT
export const addRoundFeatureArtist = async (roundId, participantId, name, displayOrder = 1, description = '') => {
  try {
    const response = await fetch(`/api/rounds/${roundId}/feature-artists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ participantId, name, displayOrder, description })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding feature artist to round:', error);
    throw error;
  }
};

export const removeRoundFeatureArtist = async (roundId, participantId) => {
  try {
    const response = await fetch(`/api/rounds/${roundId}/feature-artists/${participantId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error removing feature artist from round:', error);
    throw error;
  }
};

// TIMETABLE PARTICIPANTS MANAGEMENT
export const addTimetableParticipant = async (entryId, participantId, role = 'Teilnehmer') => {
  try {
    const response = await fetch(`/api/timetable/${entryId}/participants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ participantId, role })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding participant to timetable entry:', error);
    throw error;
  }
};

export const updateTimetableParticipant = async (entryId, participantId, role) => {
  try {
    const response = await fetch(`/api/timetable/${entryId}/participants/${participantId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ role })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating participant role in timetable entry:', error);
    throw error;
  }
};

export const removeTimetableParticipant = async (entryId, participantId) => {
  try {
    const response = await fetch(`/api/timetable/${entryId}/participants/${participantId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error removing participant from timetable entry:', error);
    throw error;
  }
};

// BULK OPERATIONS
export const updateRoundParticipants = async (roundId, participants) => {
  try {
    // First, get current participants
    const response = await fetch(`${API_URL}/rounds/${roundId}`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch round: ${response.status}`);
    }
    const currentRound = await response.json();
    const currentParticipants = currentRound?.data?.tournamentParticipants || [];
    
    // Find participants to add and remove
    const currentIds = currentParticipants.map(p => (p.id ?? p.participantId));
    const newIds = participants.map(p => (p.id ?? p.participantId));
    
    const toAdd = participants.filter(p => !currentIds.includes(p.id ?? p.participantId));
    const toRemove = currentParticipants.filter(p => !newIds.includes(p.id ?? p.participantId));
    
    // Remove participants that are no longer in the list
    for (const participant of toRemove) {
      await removeRoundParticipant(roundId, (participant.id ?? participant.participantId));
    }
    
    // Add new participants
    for (const participant of toAdd) {
      await addRoundParticipant(roundId, (participant.id ?? participant.participantId), participant.role);
    }
    
    return { success: true, added: toAdd.length, removed: toRemove.length };
  } catch (error) {
    console.error('Error updating round participants:', error);
    throw error;
  }
};

export const updateRoundCrew = async (roundId, crew) => {
  try {
    // First, get current crew
    const response = await fetch(`${API_URL}/rounds/${roundId}`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch round: ${response.status}`);
    }
    const currentRound = await response.json();
    const currentCrew = currentRound?.data?.crew || [];
    
    // Find crew to add and remove
    const currentIds = currentCrew.map(c => (c.id ?? c.participantId));
    const newIds = crew.map(c => (c.id ?? c.participantId));
    
    const toAdd = crew.filter(c => !currentIds.includes(c.id ?? c.participantId));
    const toRemove = currentCrew.filter(c => !newIds.includes(c.id ?? c.participantId));
    
    // Remove crew that are no longer in the list
    for (const member of toRemove) {
      await removeRoundCrew(roundId, (member.id ?? member.participantId));
    }
    
    // Add new crew
    for (const member of toAdd) {
      await addRoundCrew(roundId, (member.id ?? member.participantId), member.role);
    }
    
    return { success: true, added: toAdd.length, removed: toRemove.length };
  } catch (error) {
    console.error('Error updating round crew:', error);
    throw error;
  }
};

export const updateRoundFeatureArtists = async (roundId, featureArtists) => {
  try {
    // First, get current feature artists
    const response = await fetch(`${API_URL}/rounds/${roundId}`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch round: ${response.status}`);
    }
    const currentRound = await response.json();
    const currentArtists = currentRound?.data?.featureArtists || [];
    
    // Find artists to add and remove
    const currentIds = currentArtists.map(f => (f.id ?? f.participantId));
    const newIds = featureArtists.map(f => (f.id ?? f.participantId));
    
    const toAdd = featureArtists.filter(f => !currentIds.includes(f.id ?? f.participantId));
    const toRemove = currentArtists.filter(f => !newIds.includes(f.id ?? f.participantId));
    
    // Remove artists that are no longer in the list
    for (const artist of toRemove) {
      await removeRoundFeatureArtist(roundId, (artist.id ?? artist.participantId));
    }
    
    // Add new artists
    for (const artist of toAdd) {
      await addRoundFeatureArtist(roundId, (artist.id ?? artist.participantId), artist.name, artist.order, artist.description);
    }
    
    return { success: true, added: toAdd.length, removed: toRemove.length };
  } catch (error) {
    console.error('Error updating round feature artists:', error);
    throw error;
  }
};

// ROUND MODERATION MANAGEMENT
export const addRoundModeration = async (roundId, participantId, name, displayOrder = 1, description = '') => {
  try {
    const response = await fetch(`/api/rounds/${roundId}/moderation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ participantId, name, displayOrder, description })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding moderator to round:', error);
    throw error;
  }
};

export const removeRoundModeration = async (roundId, participantId) => {
  try {
    const response = await fetch(`/api/rounds/${roundId}/moderation/${participantId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error removing moderator from round:', error);
    throw error;
  }
};

export const updateTimetableParticipants = async (entryId, participants) => {
  try {
    // First, get current participants
    const response = await fetch(`${API_URL}/timetable/${entryId}`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch timetable entry: ${response.status}`);
    }
    const currentEntry = await response.json();
    const currentParticipants = currentEntry?.data?.participants_details || [];
    
    // Find participants to add and remove
    const currentIds = currentParticipants.map(p => p.id);
    const newIds = participants.map(p => (p.id ?? p.participantId));
    
    const toAdd = participants.filter(p => !currentIds.includes(p.id ?? p.participantId));
    const toRemove = currentParticipants.filter(p => !newIds.includes(p.id));
    
    // Remove participants that are no longer in the list
    for (const participant of toRemove) {
      await removeTimetableParticipant(entryId, participant.id);
    }
    
    // Add new participants
    for (const participant of toAdd) {
      const pid = participant.id ?? participant.participantId;
      await addTimetableParticipant(entryId, pid, participant.role);
    }
    
    return { success: true, added: toAdd.length, removed: toRemove.length };
  } catch (error) {
    console.error('Error updating timetable participants:', error);
    throw error;
  }
};

export default {
  // Round participants
  addRoundParticipant,
  removeRoundParticipant,
  updateRoundParticipants,
  
  // Round crew
  addRoundCrew,
  removeRoundCrew,
  updateRoundCrew,
  
  // Round feature artists
  addRoundFeatureArtist,
  removeRoundFeatureArtist,
  updateRoundFeatureArtists,
  
  // Round moderation
  addRoundModeration,
  removeRoundModeration,
  
  // Timetable participants
  addTimetableParticipant,
  updateTimetableParticipant,
  removeTimetableParticipant,
  updateTimetableParticipants
};


