/**
 * Get the display name for a participant or team
 * @param {Object} participantObj - Participant object with participantId or teamId
 * @param {Array} participants - Array of all participants
 * @param {Array} teams - Array of all teams
 * @returns {string} Display name with appropriate emoji prefix for teams
 */
export function getParticipantDisplayName(participantObj, participants = [], teams = []) {
  if (participantObj.teamId) {
    const team = teams?.find(t => t.id === participantObj.teamId);
    return `🏆 ${team?.name || `Team ${participantObj.teamId}`}`;
  }
  
  const participant = participants?.find(p => p.id === participantObj.participantId);
  return participant?.name || `Teilnehmer*in ${participantObj.participantId}`;
}
