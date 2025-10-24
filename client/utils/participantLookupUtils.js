// Centralized participant lookup utilities
// Handles all participant and team lookup logic consistently

/**
 * Creates a lookup map for O(1) participant access
 * @param {Array} participants - Array of participant objects
 * @returns {Map} Map with participant ID as key
 */
export const createParticipantLookupMap = (participants) => {
  const lookupMap = new Map();
  participants.forEach(participant => {
    if (participant.id) {
      lookupMap.set(participant.id, participant);
    }
  });
  return lookupMap;
};

/**
 * Creates a lookup map for O(1) assignment access
 * @param {Array} assignments - Array of assignment objects
 * @returns {Object} Object with participant_id and team_id as keys
 */
export const createAssignmentLookupMap = (assignments) => {
  const participantMap = new Map();
  const teamMap = new Map();
  
  assignments.forEach(assignment => {
    if (assignment.participant_id) {
      participantMap.set(assignment.participant_id, assignment);
    }
    if (assignment.team_id) {
      teamMap.set(assignment.team_id, assignment);
    }
  });
  
  return { participantMap, teamMap };
};

/**
 * Unified participant lookup function
 * Handles all participant lookup scenarios consistently
 * @param {Object} participant - Participant object from groups
 * @param {Map} participantLookup - Pre-built participant lookup map
 * @param {Object} assignmentLookup - Pre-built assignment lookup maps
 * @param {Array} assignments - Raw assignments array for index lookup
 * @returns {Object|null} Participant data or null
 */
export const lookupParticipantData = (participant, participantLookup, assignmentLookup, assignments = []) => {
  if (!participant) return null;
  
  // Strategy 1: Direct participant ID lookup
  if (participant.participantId !== undefined && participant.participantId !== null) {
    const directParticipant = participantLookup.get(participant.participantId);
    if (directParticipant) {
      return {
        ...directParticipant,
        isTeam: false
      };
    }
  }
  
  // Strategy 2: Team ID lookup
  if (participant.teamId !== undefined && participant.teamId !== null) {
    const teamAssignment = assignmentLookup.teamMap.get(participant.teamId);
    if (teamAssignment) {
      return {
        name: teamAssignment.team_name,
        region: teamAssignment.team_region || '',
        slug: teamAssignment.team_slug || `team-${participant.teamId}`,
        role: 'team',
        isTeam: true,
        teamMembers: teamAssignment.team_members || []
      };
    }
  }
  
  // Strategy 3: Assignment index lookup (for test data structure)
  if (participant.participantId !== undefined && participant.participantId !== null) {
    const assignmentIndex = participant.participantId;
    if (assignments[assignmentIndex]) {
      const assignment = assignments[assignmentIndex];
      
      if (assignment.participant_id) {
        const participantData = participantLookup.get(assignment.participant_id);
        if (participantData) {
          return {
            ...participantData,
            isTeam: false
          };
        }
      }
      
      if (assignment.team_id && assignment.team_name) {
        return {
          name: assignment.team_name,
          region: assignment.team_region || '',
          slug: assignment.team_slug || `team-${assignment.team_id}`,
          role: 'team',
          isTeam: true,
          teamMembers: assignment.team_members || []
        };
      }
    }
  }
  
  // Strategy 4: Direct name fallback
  if (participant.name) {
    return {
      name: participant.name,
      region: participant.region || '',
      slug: participant.slug || `participant-${participant.participantId || 'unknown'}`,
      role: participant.role || 'participant',
      isTeam: false
    };
  }
  
  return null;
};

/**
 * Batch participant lookup for multiple participants
 * More efficient than individual lookups
 * @param {Array} participants - Array of participant objects
 * @param {Map} participantLookup - Pre-built participant lookup map
 * @param {Object} assignmentLookup - Pre-built assignment lookup maps
 * @param {Array} assignments - Raw assignments array
 * @returns {Array} Array of participant data objects
 */
export const batchLookupParticipants = (participants, participantLookup, assignmentLookup, assignments = []) => {
  return participants.map(participant => 
    lookupParticipantData(participant, participantLookup, assignmentLookup, assignments)
  );
};

/**
 * Get fallback display name for unknown participants
 * @param {Object} participant - Participant object
 * @param {number} index - Participant index
 * @returns {string} Fallback display name
 */
export const getParticipantFallbackName = (participant, index) => {
  if (participant.name) {
    return participant.name;
  }
  
  if (participant.teamId !== undefined && participant.teamId !== null) {
    return `Unbekanntes Team (ID: ${participant.teamId})`;
  }
  
  if (participant.participantId !== undefined && participant.participantId !== null) {
    return `Unbekannte*r Teilnehmer*in (ID: ${participant.participantId})`;
  }
  
  return `Unbekannte*r Teilnehmer*in ${index + 1}`;
};
