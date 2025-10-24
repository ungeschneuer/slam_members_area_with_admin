import React, { useState } from 'react';
import ParticipantDropdown from './ParticipantDropdown.jsx';
import { getParticipantDisplayName } from '../../utils/participantUtils.js';
import logger from '../../services/logger.js';

/**
 * ParticipantAssigner component for assigning participants to groups
 * Handles participant selection and group assignment within rounds
 */
export default function ParticipantAssigner({ groups, setGroups, availableParticipants, participants, teams }) {
  // State for each group's dropdown value
  const [dropdownValues, setDropdownValues] = useState({});
  const assignParticipant = (groupIndex, assignmentData) => {
    // Parse if JSON string, otherwise use directly
    const data = typeof assignmentData === 'string' ? JSON.parse(assignmentData) : assignmentData;
    
    const updatedGroups = [...groups];
    const group = updatedGroups[groupIndex];
    
    // Check for duplicate participant/team
    const isDuplicate = group.participants.some(p => 
      (p.participantId === data.participant_id && data.participant_id) ||
      (p.teamId === data.team_id && data.team_id)
    );
    
    if (isDuplicate) {
      console.warn('Participant already exists in group:', data);
      return; // Don't add duplicate
    }
    
    const participant = {
      participantId: data.participant_id || null,
      teamId: data.team_id || null,
      displayOrder: updatedGroups[groupIndex].participants.length,
      juryScores: [],
      isWinner: false
    };
    
    updatedGroups[groupIndex].participants.push(participant);
    setGroups(updatedGroups);
  };
  
  const removeParticipant = (groupIndex, participantIndex) => {
    const updatedGroups = [...groups];
    const group = updatedGroups[groupIndex];
    const participants = [...group.participants];
    
    // Remove participant
    participants.splice(participantIndex, 1);
    
    // Update displayOrder values to maintain sequence
    participants.forEach((participant, index) => {
      participant.displayOrder = index;
    });
    
    updatedGroups[groupIndex].participants = participants;
    setGroups(updatedGroups);
  };

  const moveParticipant = (groupIndex, participantIndex, direction) => {
    // Validate inputs
    if (!groups || !Array.isArray(groups) || groupIndex < 0 || groupIndex >= groups.length) {
      logger.error('ParticipantAssigner: Invalid group index', { groupIndex, groupsLength: groups?.length });
      return;
    }
    
    const group = groups[groupIndex];
    if (!group || !Array.isArray(group.participants) || participantIndex < 0 || participantIndex >= group.participants.length) {
      logger.error('ParticipantAssigner: Invalid participant index', { participantIndex, participantsLength: group?.participants?.length });
      return;
    }
    
    const updatedGroups = [...groups];
    const participants = [...group.participants];
    
    const newIndex = direction === 'up' ? participantIndex - 1 : participantIndex + 1;
    if (newIndex < 0 || newIndex >= participants.length) {
      console.warn('Cannot move participant: already at boundary');
      return;
    }

    // Swap participants
    [participants[participantIndex], participants[newIndex]] = [participants[newIndex], participants[participantIndex]];
    
    // Update displayOrder values
    participants.forEach((participant, index) => {
      participant.displayOrder = index;
    });
    
    updatedGroups[groupIndex].participants = participants;
    setGroups(updatedGroups);
  };
  
  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => (
        <div key={group.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <h6 className="font-medium text-gray-900 dark:text-white mb-3">{group.name}</h6>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <ParticipantDropdown
                items={availableParticipants}
                value={dropdownValues[groupIndex] || ''}
                onChange={(value) => {
                  // Just store the selected value, don't auto-add
                  setDropdownValues(prev => ({ ...prev, [groupIndex]: value }));
                }}
                placeholder="Teilnehmer hinzufügen..."
                searchPlaceholder="Suchen..."
                formatLabel={(item) => item.entity_name}
                filterFn={(item) => !group.participants.some(p => 
                  (p.participantId === item.participant_id && item.participant_id) ||
                  (p.teamId === item.team_id && item.team_id)
                )}
                searchThreshold={5}
              />
            </div>
            
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  const selectedValue = dropdownValues[groupIndex];
                  if (selectedValue) {
                    const assignment = availableParticipants.find(a => 
                      (a.participant_id && a.participant_id.toString() === selectedValue) ||
                      (a.team_id && a.team_id.toString() === selectedValue)
                    );
                    if (assignment) {
                      assignParticipant(groupIndex, assignment);
                      // Reset this specific dropdown after adding participant
                      setDropdownValues(prev => ({ ...prev, [groupIndex]: '' }));
                    }
                  }
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!dropdownValues[groupIndex]}
                title={dropdownValues[groupIndex] ? "Teilnehmer hinzufügen" : "Bitte wählen Sie einen Teilnehmer aus"}
              >
                Hinzufügen
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            {group.participants.map((p, pIndex) => {
              const entityName = getParticipantDisplayName(p, participants, teams);
              
              return (
                <div key={`${p.participantId || p.teamId}-${pIndex}`} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                  <span className="text-gray-900 dark:text-white flex-1">{entityName}</span>
                  <div className="flex items-center space-x-2">
                    {/* Move Up/Down Buttons */}
                    <button
                      type="button"
                      onClick={() => moveParticipant(groupIndex, pIndex, 'up')}
                      disabled={pIndex === 0}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Nach oben"
                      aria-label={`${entityName} nach oben verschieben`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveParticipant(groupIndex, pIndex, 'down')}
                      disabled={pIndex === group.participants.length - 1}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Nach unten"
                      aria-label={`${entityName} nach unten verschieben`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeParticipant(groupIndex, pIndex)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
