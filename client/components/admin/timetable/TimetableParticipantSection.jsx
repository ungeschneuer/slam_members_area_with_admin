import React from 'react';
import ParticipantDropdown from '../ParticipantDropdown.jsx';

/**
 * TimetableParticipantSection
 *
 * Manages participant assignments for timetable events.
 * Extracted from AdminTimetable.jsx to improve code organization.
 */
export default function TimetableParticipantSection({
  availableParticipants,
  participantAssignments,
  selectedParticipant,
  setSelectedParticipant,
  onAddParticipant,
  onRemoveParticipant,
  loadingParticipants = false
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Teilnehmer*innen</h3>

      {/* Add Participant Box */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
        <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Teilnehmer*in hinzufügen</h5>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <ParticipantDropdown
              items={availableParticipants}
              value={selectedParticipant}
              onChange={(value) => setSelectedParticipant(value)}
              placeholder="Teilnehmer*in wählen..."
              searchPlaceholder="Suchen..."
              label="Teilnehmer*in auswählen"
              disabled={loadingParticipants}
              loading={loadingParticipants}
              filterFn={(p) => !participantAssignments.some(ep => ep.participantId === p.id)}
              searchThreshold={8}
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={onAddParticipant}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedParticipant}
            >
              Hinzufügen
            </button>
          </div>
        </div>
      </div>

      {/* Assigned Participants List */}
      {participantAssignments.length > 0 && (
        <div className="space-y-2">
          {participantAssignments.map((participant, index) => {
            const participantData = availableParticipants.find(p => p.id === participant.participantId);
            return (
              <div key={`participant-${participant.participantId}-${index}`} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
                <span className="text-gray-900 dark:text-white">
                  {participantData?.name || participant.name || 'Unbekannt'}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveParticipant(index)}
                  className="px-3 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  Entfernen
                </button>
              </div>
            );
          })}
        </div>
      )}

      {participantAssignments.length === 0 && (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          <p>Noch keine Teilnehmer*innen zugewiesen</p>
        </div>
      )}
    </div>
  );
}
