import React, { useState, useMemo } from 'react';

// Simple team member selector component
export default function TeamMemberSelector({ 
  participants = [], 
  selectedMembers = [], 
  onSelectionChange,
  maxMembers = 10 
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter participants based on search term
  const filteredParticipants = useMemo(() => {
    if (!searchTerm) return participants;
    return participants.filter(p => 
      (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.region || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [participants, searchTerm]);

  const handleMemberToggle = (participantId) => {
    const isSelected = selectedMembers.includes(participantId);
    
    if (isSelected) {
      onSelectionChange(selectedMembers.filter(id => id !== participantId));
    } else {
      // Check max members limit
      if (selectedMembers.length >= maxMembers) {
        alert(`Maximum ${maxMembers} members allowed`);
        return;
      }
      onSelectionChange([...selectedMembers, participantId]);
    }
  };

  const handleSelectAll = () => {
    const availableIds = filteredParticipants.map(p => p.id);
    const newSelection = [...new Set([...selectedMembers, ...availableIds])];
    
    if (newSelection.length > maxMembers) {
      alert(`Maximum ${maxMembers} members allowed`);
      return;
    }
    
    onSelectionChange(newSelection);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  if (participants.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        No eligible participants found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Add Members ({selectedMembers.length}/{maxMembers})
        </h3>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search participants..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
      />

      {/* Member list */}
      <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
        {filteredParticipants.map(participant => (
          <label
            key={participant.id}
            className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
          >
            <input
              type="checkbox"
              checked={selectedMembers.includes(participant.id)}
              onChange={() => handleMemberToggle(participant.id)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {participant.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {participant.region || '-'}
              </p>
            </div>
          </label>
        ))}
      </div>

      {/* Selection summary */}
      {selectedMembers.length > 0 && (
        <p className="text-sm text-blue-600 dark:text-blue-400">
          {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
