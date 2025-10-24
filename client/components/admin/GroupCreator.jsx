import React, { useState } from 'react';

/**
 * GroupCreator component for creating and managing groups within rounds
 * Handles group creation, naming, and deletion
 */
export default function GroupCreator({ groups, setGroups }) {
  const [newGroupName, setNewGroupName] = useState('');
  
  const addGroup = () => {
    if (newGroupName.trim()) {
      setGroups([...groups, {
        id: Date.now(),
        name: newGroupName,
        displayOrder: groups.length,
        participants: [],
        winners: []
      }]);
      setNewGroupName('');
    }
  };
  
  const removeGroup = (index) => {
    setGroups(groups.filter((_, i) => i !== index));
  };
  
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="Gruppenname (z.B. Gruppe 1)"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="button"
          onClick={addGroup}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          Gruppe hinzufügen
        </button>
      </div>
      
      {groups.length > 0 && (
        <div className="space-y-2">
          {groups.map((group, index) => (
            <div key={group.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
              <span className="text-gray-900 dark:text-white">{group.name}</span>
              <button
                type="button"
                onClick={() => removeGroup(index)}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              >
                Entfernen
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
