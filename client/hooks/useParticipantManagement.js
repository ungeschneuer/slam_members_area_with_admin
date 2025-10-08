import { useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';

/**
 * Shared hook for managing participants in admin components
 * Provides consistent patterns for junction table operations with form state updates
 */
export const useParticipantManagement = ({
  junctionTables,
  addForm,
  editForm,
  editingItem,
  participants = [],
  getParticipantName,
  getParticipantId
}) => {
  // Search states for different participant types
  const [crewSearchTerm, setCrewSearchTerm] = useState('');
  const [showCrewSearch, setShowCrewSearch] = useState(false);
  const [participantSearchTerm, setParticipantSearchTerm] = useState('');
  const [showParticipantSearch, setShowParticipantSearch] = useState(false);
  const [featureSearchTerm, setFeatureSearchTerm] = useState('');
  const [showFeatureSearch, setShowFeatureSearch] = useState(false);
  const [selectedCrewRole, setSelectedCrewRole] = useState('Locationmanagement');

  // Generic participant management functions
  const addParticipant = useCallback(async (participantId, role, participantType = 'crew') => {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;

    if (editingItem) {
      // Use junction table hook for existing items
      try {
        // Map tournamentParticipants to participants in junction tables
        const junctionKey = participantType === 'tournamentParticipants' ? 'participants' : participantType;
        
        if (!junctionTables[junctionKey]) {
          console.error(`Junction table not found for participantType: ${participantType}, junctionKey: ${junctionKey}`);
          return;
        }
        
        await junctionTables[junctionKey].add.mutateAsync({
          roundId: editingItem.id,
          participantId,
          role
        });
        
        // Update the form state to reflect the change in UI
        const currentParticipants = editForm.getValues(participantType) || [];
        editForm.setValue(participantType, [...currentParticipants, { 
          participantId, 
          name: getParticipantName(participantId), 
          role 
        }]);
        
        // Clear search states
        if (participantType === 'crew') {
          setCrewSearchTerm('');
          setShowCrewSearch(false);
        } else if (participantType === 'tournamentParticipants') {
          setParticipantSearchTerm('');
          setShowParticipantSearch(false);
        } else if (participantType === 'featureArtists') {
          setFeatureSearchTerm('');
          setShowFeatureSearch(false);
        }
      } catch (error) {
        console.error(`Error adding ${participantType} member:`, error);
      }
    } else {
      // For new items, add via RHF
      const currentParticipants = addForm.getValues(participantType) || [];
      addForm.setValue(participantType, [...currentParticipants, { 
        participantId, 
        name: getParticipantName(participantId), 
        role 
      }]);
      
      // Clear search states
      if (participantType === 'crew') {
        setCrewSearchTerm('');
        setShowCrewSearch(false);
      } else if (participantType === 'tournamentParticipants') {
        setParticipantSearchTerm('');
        setShowParticipantSearch(false);
      } else if (participantType === 'featureArtists') {
        setFeatureSearchTerm('');
        setShowFeatureSearch(false);
      }
    }
  }, [editingItem, junctionTables, editForm, addForm, participants, getParticipantName]);

  const removeParticipant = useCallback(async (participantId, participantType = 'crew') => {
    if (editingItem) {
      // Use junction table hook for existing items
      try {
        // Map tournamentParticipants to participants in junction tables
        const junctionKey = participantType === 'tournamentParticipants' ? 'participants' : participantType;
        
        if (!junctionTables[junctionKey]) {
          console.error(`Junction table not found for participantType: ${participantType}, junctionKey: ${junctionKey}`);
          return;
        }
        
        await junctionTables[junctionKey].remove.mutateAsync({
          roundId: editingItem.id,
          participantId
        });
        
        // Update the form state to reflect the change in UI
        const currentParticipants = editForm.getValues(participantType) || [];
        const updatedParticipants = currentParticipants.filter(p => 
          getParticipantId(p.participantId) !== participantId
        );
        editForm.setValue(participantType, updatedParticipants);
      } catch (error) {
        console.error(`Error removing ${participantType} member:`, error);
      }
    } else {
      // For new items, remove via RHF
      const currentParticipants = addForm.getValues(participantType) || [];
      const updatedParticipants = currentParticipants.filter(p => 
        getParticipantId(p.participantId) !== participantId
      );
      addForm.setValue(participantType, updatedParticipants);
    }
  }, [editingItem, junctionTables, editForm, addForm, getParticipantId]);

  // Search and filter functions
  const getAvailableParticipants = useCallback((participantType = 'crew', currentItem = null) => {
    const searchTerm = participantType === 'crew' ? crewSearchTerm : 
                      participantType === 'tournamentParticipants' ? participantSearchTerm :
                      featureSearchTerm;
    
    return participants.filter(participant => {
      if (!participant || !participant.id || !participant.name) return false;
      
      const fullName = participant.name.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      // Check if already selected
      const currentParticipants = currentItem ? 
        (currentItem[participantType] || []) : 
        (editingItem ? editForm.getValues(participantType) || [] : addForm.getValues(participantType) || []);
      
      const isAlreadySelected = currentParticipants.some(p => {
        // Handle both object format (from backend) and simple ID format
        const participantId = typeof p === 'object' && p.participantId ? p.participantId : p;
        return getParticipantId(participantId) === participant.id;
      });
      
      return fullName.includes(searchLower) && !isAlreadySelected;
    });
  }, [crewSearchTerm, participantSearchTerm, featureSearchTerm, participants, editingItem, editForm, addForm, getParticipantId]);

  return {
    // Search states
    crewSearchTerm,
    setCrewSearchTerm,
    showCrewSearch,
    setShowCrewSearch,
    participantSearchTerm,
    setParticipantSearchTerm,
    showParticipantSearch,
    setShowParticipantSearch,
    featureSearchTerm,
    setFeatureSearchTerm,
    showFeatureSearch,
    setShowFeatureSearch,
    selectedCrewRole,
    setSelectedCrewRole,
    
    // Management functions
    addParticipant,
    removeParticipant,
    getAvailableParticipants
  };
};

export default useParticipantManagement;
