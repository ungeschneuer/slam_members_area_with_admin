import React, { useEffect } from 'react';
import { getParticipantDisplayName } from '../../utils/participantUtils.js';

/**
 * JuryScoreManager component for entering and managing jury scores
 * Handles score entry, validation, and winner designation
 */
export default function JuryScoreManager({ groups, setGroups, totalJuryMembers, participants, teams }) {
  // Update jury scores when totalJuryMembers changes
  useEffect(() => {
    if (totalJuryMembers && groups) {
      const updatedGroups = groups.map(group => ({
        ...group,
        participants: group.participants?.map(participant => {
          if (participant.juryScores) {
            const currentLength = participant.juryScores.length;
            const newLength = totalJuryMembers;
            
            if (newLength > currentLength) {
              // Add new jury members with score 0
              return {
                ...participant,
                juryScores: [...participant.juryScores, ...Array(newLength - currentLength).fill(0)]
              };
            } else if (newLength < currentLength) {
              // Remove excess jury members
              return {
                ...participant,
                juryScores: participant.juryScores.slice(0, newLength)
              };
            }
          }
          return participant;
        }) || []
      }));
      
      // Only update if there are actual changes
      const hasChanges = JSON.stringify(updatedGroups) !== JSON.stringify(groups);
      if (hasChanges) {
        setGroups(updatedGroups);
      }
    }
  }, [totalJuryMembers, groups, setGroups]);
  const updateScore = (groupIndex, participantIndex, juryIndex, score) => {
    const updatedGroups = [...groups];
    const participant = updatedGroups[groupIndex].participants[participantIndex];
    
    // Initialize juryScores array if needed
    if (!participant.juryScores) {
      participant.juryScores = Array(totalJuryMembers).fill(0);
    }
    
    // Validate score range (0-10)
    const parsedScore = parseFloat(score);
    if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 10) {
      return; // Don't update if invalid
    }
    
    participant.juryScores[juryIndex] = parsedScore;
    setGroups(updatedGroups);
  };
  
  const toggleWinner = (groupIndex, participantObj) => {
    const updatedGroups = [...groups];
    const participant = updatedGroups[groupIndex].participants.find(p => 
      (p.participantId === participantObj.participantId && participantObj.participantId) ||
      (p.teamId === participantObj.teamId && participantObj.teamId)
    );
    participant.isWinner = !participant.isWinner;
    
    // Update winners array with proper ID
    const winnerId = participantObj.teamId || participantObj.participantId;
    if (participant.isWinner) {
      if (!updatedGroups[groupIndex].winners.includes(winnerId)) {
        updatedGroups[groupIndex].winners.push(winnerId);
      }
    } else {
      updatedGroups[groupIndex].winners = updatedGroups[groupIndex].winners.filter(id => id !== winnerId);
    }
    
    setGroups(updatedGroups);
  };
  
  const getParticipantName = (participantObj) => {
    return getParticipantDisplayName(participantObj, participants, teams);
  };
  
  return (
    <div className="space-y-6">
      {groups.map((group, groupIndex) => (
        <div key={group.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <h6 className="font-medium text-gray-900 dark:text-white mb-4">{group.name}</h6>
          
          {group.participants.map((participant, pIndex) => (
            <div key={pIndex} className="bg-white dark:bg-gray-800 p-4 rounded mb-3 border border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium text-gray-900 dark:text-white">{getParticipantName(participant)}</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={participant.isWinner || false}
                    onChange={() => toggleWinner(groupIndex, participant)}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Gewinner</span>
                </label>
              </div>
              
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: totalJuryMembers || 5 }).map((_, juryIndex) => (
                  <div key={juryIndex}>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                      Jury {juryIndex + 1}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={participant.juryScores?.[juryIndex] || 0}
                      onChange={(e) => updateScore(groupIndex, pIndex, juryIndex, e.target.value)}
                      className={`w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        participant.juryScores?.[juryIndex] > 10 || participant.juryScores?.[juryIndex] < 0
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-400'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
