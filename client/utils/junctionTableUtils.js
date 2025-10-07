/**
 * Shared utilities for junction table operations
 * Provides consistent patterns for managing many-to-many relationships
 */

/**
 * Creates a standardized participant object for junction table operations
 */
export const createParticipantObject = (participantId, name, role) => ({
  participantId: parseInt(participantId),
  name: name || '',
  role: role || 'Teilnehmer'
});

/**
 * Creates a standardized crew member object for junction table operations
 */
export const createCrewMemberObject = (participantId, name, role) => ({
  participantId: parseInt(participantId),
  name: name || '',
  role: role || 'Locationmanagement'
});

/**
 * Creates a standardized feature artist object for junction table operations
 */
export const createFeatureArtistObject = (participantId, name, order = 1, description = '') => ({
  participantId: parseInt(participantId),
  name: name || '',
  order: order || 1,
  description: description || ''
});

/**
 * Safely extracts participant ID from various object structures
 */
export const extractParticipantId = (participant) => {
  if (typeof participant === 'number') return participant;
  if (typeof participant === 'string') return parseInt(participant);
  if (participant && typeof participant === 'object') {
    return participant.participantId || participant.id || participant;
  }
  return null;
};

/**
 * Safely extracts participant name from various object structures
 */
export const extractParticipantName = (participant, participants = []) => {
  if (typeof participant === 'string') return participant;
  if (participant && typeof participant === 'object') {
    if (participant.name) return participant.name;
    if (participant.participantId) {
      const found = participants.find(p => p.id === participant.participantId);
      return found ? found.name : `Teilnehmer*in ${participant.participantId}`;
    }
  }
  return `Teilnehmer*in ${participant}`;
};

/**
 * Validates if a participant is already selected in a list
 */
export const isParticipantAlreadySelected = (participantId, currentList = [], getParticipantId) => {
  if (!participantId || !currentList) return false;
  
  return currentList.some(item => {
    const itemId = getParticipantId ? getParticipantId(item) : extractParticipantId(item);
    return itemId === parseInt(participantId);
  });
};

/**
 * Filters participants based on search term and exclusion list
 */
export const filterAvailableParticipants = (participants = [], searchTerm = '', excludeList = [], getParticipantId) => {
  if (!Array.isArray(participants)) return [];
  
  const searchLower = searchTerm.toLowerCase();
  
  return participants.filter(participant => {
    if (!participant || !participant.id || !participant.name) return false;
    
    const fullName = participant.name.toLowerCase();
    const isAlreadySelected = isParticipantAlreadySelected(participant.id, excludeList, getParticipantId);
    
    return fullName.includes(searchLower) && !isAlreadySelected;
  });
};

/**
 * Creates junction table operation parameters
 */
export const createJunctionParams = (entityType, entityId, participantId, role = null, additionalData = {}) => {
  const baseParams = {
    [entityType === 'round' ? 'roundId' : 'entryId']: entityId,
    participantId: parseInt(participantId)
  };
  
  if (role) {
    baseParams.role = role;
  }
  
  return { ...baseParams, ...additionalData };
};

/**
 * Standardizes junction table response handling
 */
export const handleJunctionResponse = (response, onSuccess, onError) => {
  if (response && response.success) {
    if (onSuccess) onSuccess(response.data);
    return response.data;
  } else {
    const error = new Error(response?.error || 'Junction table operation failed');
    if (onError) onError(error);
    throw error;
  }
};

/**
 * Creates a standardized error handler for junction table operations
 */
export const createJunctionErrorHandler = (operation, participantType) => {
  return (error) => {
    console.error(`Error ${operation} ${participantType}:`, error);
    throw new Error(`Failed to ${operation} ${participantType}: ${error.message}`);
  };
};

export default {
  createParticipantObject,
  createCrewMemberObject,
  createFeatureArtistObject,
  extractParticipantId,
  extractParticipantName,
  isParticipantAlreadySelected,
  filterAvailableParticipants,
  createJunctionParams,
  handleJunctionResponse,
  createJunctionErrorHandler
};
