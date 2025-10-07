import React, { useState, useEffect } from 'react';
import { useRounds, useParticipants, useCreateRound, useUpdateRound, useDeleteRound, useRoundJunctionTables } from '../../hooks/index.js';
import LoadingSpinner from '../LoadingSpinner.jsx';
import { generateSlug } from '../../utils/slugUtils.js';
import { getParticipantId } from '../../utils/participantUtils.js';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import TextareaInput from '../forms/TextareaInput.jsx';
import useParticipantManagement from '../../hooks/useParticipantManagement.js';
import { roundSchema, getDefaultValues, getRoleOptions, getStatusOptions } from '../../utils/adminFormSchemas.js';
import { createCrewMemberObject, createParticipantObject, createFeatureArtistObject } from '../../utils/junctionTableUtils.js';

export default function AdminRounds() {
  const { data: roundsData, isLoading: roundsLoading, error: roundsError } = useRounds();
  const { data: participantsData, isLoading: participantsLoading, error: participantsError } = useParticipants();
  const createRound = useCreateRound();
  const updateRound = useUpdateRound();
  const deleteRound = useDeleteRound();
  
  const [rounds, setRounds] = useState([]);
  const [participants, setParticipants] = useState([]);
  const loading = roundsLoading || participantsLoading;
  const error = roundsError || participantsError;
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [selectedRound, setSelectedRound] = useState(null);
  
  // Junction table hooks for managing relationships
  const junctionTables = useRoundJunctionTables(editingRound?.id || selectedRound?.id);

  // Legacy state removed - using RHF instead

  const addForm = useForm({
    resolver: zodResolver(roundSchema),
    defaultValues: getDefaultValues('round')
  });

  // RHF for editing existing round (core fields)
  const editForm = useForm({
    resolver: zodResolver(roundSchema),
    defaultValues: getDefaultValues('round')
  });

  const { fields: featureFields, append: appendFeature, remove: removeFeatureRHF } = useFieldArray({ control: addForm.control, name: 'featureArtists' });
  const { fields: editFeatureFields, append: appendEditFeature, remove: removeEditFeature } = useFieldArray({ control: editForm?.control, name: 'featureArtists' });
  
  // Groups field arrays
  const { fields: groupFields, append: appendGroup, remove: removeGroupRHF } = useFieldArray({ control: addForm.control, name: 'groups' });
  const { fields: editGroupFields, append: editAppendGroup, remove: editRemoveGroupRHF } = useFieldArray({ control: editForm?.control, name: 'groups' });
  const { register: registerEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: editErrors, isSubmitting: isEditSubmitting } } = editForm;

  // newGroup state removed - using RHF useFieldArray instead
  const [newGroupName, setNewGroupName] = useState('');

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupParticipantSearchTerm, setGroupParticipantSearchTerm] = useState('');
  const [showGroupParticipantSearch, setShowGroupParticipantSearch] = useState(false);

  const [newFeatureArtist, setNewFeatureArtist] = useState({
    participantId: null,
    name: '',
    order: 1,
    description: ''
  });

  const [deletingRoundId, setDeletingRoundId] = useState(null);

  // Helper functions - must be declared before useParticipantManagement hook
  const getParticipantName = (participantId) => {
    const id = getParticipantId(participantId);
    const participant = participants.find(p => p.id === id);
    return participant ? participant.name : `Teilnehmer*in ${participantId}`;
  };

  // Use shared participant management hook
  const participantManagement = useParticipantManagement({
    junctionTables,
    addForm,
    editForm,
    editingItem: editingRound,
    participants,
    getParticipantName,
    getParticipantId
  });

  // Extract shared state and functions
  const {
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
    addParticipant: addParticipantShared,
    removeParticipant: removeParticipantShared,
    getAvailableParticipants: getAvailableParticipantsShared
  } = participantManagement;

  const crewRoles = getRoleOptions('crew');
  // Status is now calculated automatically

  const competitionTypes = [
    { value: 'Einzelwettbewerb', label: 'Einzelwettbewerb' },
    { value: 'Teamwettbewerb', label: 'Teamwettbewerb' },
    { value: 'U20-Wettbewerb', label: 'U20-Wettbewerb' }
  ];

  // Update local state when TanStack Query data changes
  useEffect(() => {
    if (roundsData) {
      setRounds(Array.isArray(roundsData) ? roundsData : []);
    }
  }, [roundsData]);

  useEffect(() => {
    if (participantsData) {
      setParticipants(Array.isArray(participantsData) ? participantsData : []);
    }
  }, [participantsData]);

  const getAvailableParticipants = () => {
    const currentRound = editingRound;
    return (participants || []).filter(participant => {
      if (!participant || !participant.id || !participant.name) return false;
      const fullName = participant.name.toLowerCase();
      const searchLower = participantSearchTerm.toLowerCase();
      const isAlreadySelected = (currentRound?.tournamentParticipants || []).some(p => getParticipantId(p) === participant.id);
      
      return fullName.includes(searchLower) && !isAlreadySelected;
    });
  };

  const getAvailableCrewMembers = () => {
    // Use RHF form values instead of legacy state
    const currentCrew = editingRound 
      ? editForm.getValues('crew') || []
      : addForm.getValues('crew') || [];
    
    return (participants || []).filter(participant => {
      if (!participant || !participant.id || !participant.name) return false;
      const fullName = participant.name.toLowerCase();
      const searchLower = crewSearchTerm.toLowerCase();
      const isAlreadyCrew = currentCrew.some(crew => getParticipantId(crew) === participant.id);
      
      return fullName.includes(searchLower) && !isAlreadyCrew;
    });
  };

  const getAvailableFeatureArtists = () => {
    // Use RHF form values instead of legacy state
    const currentFeatures = editingRound 
      ? editForm.getValues('featureArtists') || []
      : addForm.getValues('featureArtists') || [];
    
    return (participants || []).filter(participant => {
      if (!participant || !participant.id || !participant.name) return false;
      const fullName = participant.name.toLowerCase();
      const searchLower = featureSearchTerm.toLowerCase();
      const isAlreadyFeature = currentFeatures.some(feature => getParticipantId(feature) === participant.id);
      
      return fullName.includes(searchLower) && !isAlreadyFeature;
    });
  };

  const addCrewMember = async (participantId) => {
    await addParticipantShared(participantId, selectedCrewRole, 'crew');
  };

  const removeCrewMember = async (participantId) => {
    await removeParticipantShared(participantId, 'crew');
  };

  const addTournamentParticipant = async (participantId) => {
    await addParticipantShared(participantId, 'Teilnehmer', 'tournamentParticipants');
  };

  const removeTournamentParticipant = async (participantId) => {
    await removeParticipantShared(participantId, 'tournamentParticipants');
  };

  const addFeatureArtist = async (participantId) => {
    const participant = participants.find(p => p.id === participantId);
    if (participant) {
      if (editingRound) {
        // Mirror to RHF array for UI while backend junction is authoritative
        appendEditFeature({
          participantId,
          name: participant.name,
          order: (editForm.getValues('featureArtists') || []).length + 1,
          description: ''
        });
        try {
          await junctionTables.featureArtists.add.mutateAsync({
            roundId: editingRound.id,
            participantId,
            name: participant.name,
            displayOrder: (editingRound.featureArtists || []).length + 1,
            description: ''
          });
        } catch (error) {
          console.error('Error adding feature artist to round:', error);
        }
        setFeatureSearchTerm('');
        setShowFeatureSearch(false);
      } else {
        // For new rounds, add via RHF field array
        appendFeature({
          participantId,
          name: participant.name,
          order: (addForm.getValues('featureArtists') || []).length + 1,
          description: ''
        });
        setFeatureSearchTerm('');
        setShowFeatureSearch(false);
      }
    }
  };

  const removeFeatureArtist = async (participantId) => {
    if (editingRound) {
      // Mirror remove in RHF array for UI
      const current = editForm.getValues('featureArtists') || [];
      const idx = current.findIndex(f => getParticipantId(f.participantId) === participantId);
      if (idx > -1) removeEditFeature(idx);
      try {
        await junctionTables.featureArtists.remove.mutateAsync({
          roundId: editingRound.id,
          participantId
        });
      } catch (error) {
        console.error('Error removing feature artist from round:', error);
      }
    } else {
      // For new rounds, remove via RHF field array
      const current = addForm.getValues('featureArtists') || [];
      const idx = current.findIndex(f => getParticipantId(f.participantId) === participantId);
      if (idx > -1) removeFeatureRHF(idx);
    }
  };

  const addGroup = () => {
    if (newGroupName.trim()) {
      const newGroupWithId = { 
        id: Date.now(),
        name: newGroupName.trim(),
        participants: [],
        order: [],
        juryScores: {},
        winners: []
      };
      
      if (editingRound) {
        // For existing rounds, add via RHF edit form
        editAppendGroup(newGroupWithId);
      } else {
        // For new rounds, add via RHF add form
        appendGroup(newGroupWithId);
      }
      
      setNewGroupName('');
    }
  };

  const removeGroup = (groupId) => {
    if (editingRound) {
      setEditingRound(prev => ({
        ...prev,
        groups: prev.groups.filter(group => group.id !== groupId)
      }));
    } else {
      // For new rounds, remove via RHF
      const currentGroups = addForm.getValues('groups') || [];
      const updatedGroups = currentGroups.filter(group => group.id !== groupId);
      addForm.setValue('groups', updatedGroups);
    }
  };

  const addGroupParticipant = (groupId, participantId) => {
    const updateGroups = (groups) => groups.map(group => {
      if (group.id === groupId) {
        const newParticipants = [...group.participants, participantId];
        const newOrder = [...group.order, participantId];
        return {
          ...group,
          participants: newParticipants,
          order: newOrder
        };
      }
      return group;
    });

    if (editingRound) {
      setEditingRound(prev => ({
        ...prev,
        groups: updateGroups(prev.groups)
      }));
    } else {
      // For new rounds, update via RHF
      const currentGroups = addForm.getValues('groups') || [];
      addForm.setValue('groups', updateGroups(currentGroups));
    }
    setGroupParticipantSearchTerm('');
    setShowGroupParticipantSearch(false);
  };

  const removeGroupParticipant = (groupId, participantId) => {
    const updateGroups = (groups) => groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          participants: group.participants.filter(id => getParticipantId(id) !== participantId),
          order: group.order.filter(id => getParticipantId(id) !== participantId),
          winners: group.winners.filter(id => getParticipantId(id) !== participantId),
          juryScores: Object.fromEntries(
            Object.entries(group.juryScores).filter(([key]) => getParticipantId(key) !== participantId)
          )
        };
      }
      return group;
    });

    if (editingRound) {
      setEditingRound(prev => ({
        ...prev,
        groups: updateGroups(prev.groups)
      }));
    } else {
      // For new rounds, update via RHF
      const currentGroups = addForm.getValues('groups') || [];
      addForm.setValue('groups', updateGroups(currentGroups));
    }
  };

  const updateGroupParticipantOrder = (groupId, participantId, newIndex) => {
    const updateGroups = (groups) => groups.map(group => {
      if (group.id === groupId) {
        const newOrder = [...group.order];
        const oldIndex = newOrder.indexOf(participantId);
        if (oldIndex !== -1) {
          newOrder.splice(oldIndex, 1);
          newOrder.splice(newIndex, 0, participantId);
        }
        return { ...group, order: newOrder };
      }
      return group;
    });

    if (editingRound) {
      setEditingRound(prev => ({
        ...prev,
        groups: updateGroups(prev.groups)
      }));
    } else {
      // For new rounds, update via RHF
      const currentGroups = addForm.getValues('groups') || [];
      addForm.setValue('groups', updateGroups(currentGroups));
    }
  };

  const toggleGroupWinner = (groupId, participantId) => {
    const updateGroups = (groups) => groups.map(group => {
      if (group.id === groupId) {
        const newWinners = group.winners.includes(participantId)
          ? group.winners.filter(id => getParticipantId(id) !== participantId)
          : [...group.winners, participantId];
        return { ...group, winners: newWinners };
      }
      return group;
    });

    if (editingRound) {
      setEditingRound(prev => ({
        ...prev,
        groups: updateGroups(prev.groups)
      }));
    } else {
      // For new rounds, update via RHF
      const currentGroups = addForm.getValues('groups') || [];
      addForm.setValue('groups', updateGroups(currentGroups));
    }
  };

  const updateJuryScore = (groupId, participantId, juryIndex, score) => {
    const updateGroups = (groups) => groups.map(group => {
      if (group.id === groupId) {
        const currentScores = group.juryScores?.[participantId] || [];
        const newScores = [...currentScores];
        newScores[juryIndex] = parseFloat(score) || 0;
        return {
          ...group,
          juryScores: {
            ...(group.juryScores || {}),
            [participantId]: newScores
          }
        };
      }
      return group;
    });

    if (editingRound) {
      setEditingRound(prev => ({
        ...prev,
        groups: updateGroups(prev.groups)
      }));
    } else {
      // For new rounds, update via RHF
      const currentGroups = addForm.getValues('groups') || [];
      addForm.setValue('groups', updateGroups(currentGroups));
    }
  };

  const getAvailableGroupParticipants = (groupId) => {
    const currentRound = editingRound;
    const currentGroup = (currentRound?.groups || []).find(g => g.id === groupId);
    const currentParticipants = currentGroup ? (currentGroup.participants || []) : [];
    
    return (currentRound?.tournamentParticipants || []).filter(participantId => {
      if (!participantId) return false;
      const fullName = getParticipantName(participantId).toLowerCase();
      const searchLower = groupParticipantSearchTerm.toLowerCase();
      const isAlreadyInGroup = currentParticipants.includes(getParticipantId(participantId));
      
      return fullName.includes(searchLower) && !isAlreadyInGroup;
    });
  };

  const handleAddRound = async (values) => {
    try {
      await createRound.mutateAsync(values);
      addForm.reset();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating round:', error);
      alert('Fehler beim Erstellen der Runde');
    }
  };

  useEffect(() => {
    if (editingRound) {
      // Convert existing datetime fields to separate date and time fields
      const startDateTime = editingRound.startDateTime ? new Date(editingRound.startDateTime) : new Date();
      const endDateTime = editingRound.endDateTime ? new Date(editingRound.endDateTime) : new Date();
      
      resetEdit({
        title: editingRound.title || '',
        slug: editingRound.slug || '',
        date: editingRound.date || startDateTime.toISOString().split('T')[0],
        startTime: editingRound.startTime || startDateTime.toTimeString().slice(0, 5),
        endTime: editingRound.endTime || endDateTime.toTimeString().slice(0, 5),
        location: editingRound.location || '',
        address: editingRound.address || '',
        description: editingRound.description || '',
        afterPlayReport: editingRound.afterPlayReport || '',
        competitionType: editingRound.competitionType || 'Einzelwettbewerb',
        totalJuryMembers: editingRound.totalJuryMembers ?? 5,
        // Status is now calculated automatically
        crew: editingRound.crew || [],
        tournamentParticipants: editingRound.tournamentParticipants || [],
        groups: editingRound.groups || [],
        featureArtists: editingRound.featureArtists || []
      });
    }
  }, [editingRound, resetEdit]);

  const handleUpdateRound = async (data) => {
    try {
      await updateRound.mutateAsync({ id: editingRound.id, ...editingRound, ...data });
      setEditingRound(null);
    } catch (error) {
      console.error('Error updating round:', error);
      alert('Fehler beim Aktualisieren der Runde');
    }
  };

  const handleEditRound = (round) => {
    setEditingRound({
      ...round,
      crew: round.crew || [],
      tournamentParticipants: round.tournamentParticipants || [],
      groups: (round.groups || []).map(group => ({
        ...group,
        juryScores: group.juryScores || {},
        winners: group.winners || []
      })),
      featureArtists: round.featureArtists || []
    });
  };

  const handleDeleteRound = async (id) => {
    if (deletingRoundId === id) return; // Prevent multiple clicks
    
    if (window.confirm('Möchten Sie diese Runde wirklich löschen?')) {
      setDeletingRoundId(id);
      try {
        await deleteRound.mutateAsync(id);
        // loadData(); // Removed manual reload
      } catch (error) {
        console.error('Error deleting round:', error);
        
        // Provide more specific error messages
        let errorMessage = 'Fehler beim Löschen der Runde';
        if (error.message.includes('not authenticated')) {
          errorMessage = 'Sie sind nicht angemeldet. Bitte loggen Sie sich erneut ein.';
        } else if (error.message.includes('HTTP 401')) {
          errorMessage = 'Sitzung abgelaufen. Bitte loggen Sie sich erneut ein.';
        } else if (error.message.includes('HTTP 403')) {
          errorMessage = 'Sie haben keine Berechtigung, diese Runde zu löschen.';
        } else if (error.message.includes('HTTP 404')) {
          errorMessage = 'Runde nicht gefunden.';
        } else if (error.message.includes('HTTP 500')) {
          errorMessage = 'Server-Fehler. Bitte versuchen Sie es später erneut.';
        }
        
        alert(errorMessage);
      } finally {
        setDeletingRoundId(null);
      }
    }
  };

  const calculateTotalScore = (scores) => {
    if (!scores || scores.length === 0) return 0;
    const sortedScores = [...scores].sort((a, b) => a - b);
    // Remove highest and lowest scores
    const trimmedScores = sortedScores.slice(1, -1);
    return trimmedScores.reduce((sum, score) => sum + score, 0);
  };

  const filteredRounds = (Array.isArray(rounds) ? rounds : []).filter(round =>
    (round.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (round.location || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingSpinner size="xl" text="Runden werden geladen..." />;
  if (error) return <div className="text-red-600">Fehler beim Laden der Runden: {error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Runden verwalten</h1>
          <p className="text-gray-600 dark:text-gray-400">Poetry Slam Runden und Wettbewerbe verwalten</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showAddForm ? 'Formular schließen' : '+ Runde hinzufügen'}
          </button>
          <button
            onClick={() => {
              if (window.confirm('Möchten Sie die Runden-Daten zurücksetzen? Dies lädt die Standard-Beispieldaten neu.')) {
                // Reset functionality not available with TanStack Query
                alert('Reset-Funktion ist mit TanStack Query nicht verfügbar');
              }
            }}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Daten zurücksetzen
          </button>
        </div>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Runden suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingRound) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {editingRound ? 'Runde bearbeiten' : 'Neue Runde hinzufügen'}
          </h2>
          
          <form onSubmit={editingRound ? handleEditSubmit(handleUpdateRound) : addForm.handleSubmit(handleAddRound)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Titel *
                </label>
                {editingRound ? (
                  <input
                    type="text"
                    required
                    aria-invalid={editErrors.title ? 'true' : 'false'}
                    {...registerEdit('title', { required: 'Titel ist erforderlich', onChange: (e) => {
                      const slug = generateSlug(e.target.value, { maxLength: 40, removeStopwords: true });
                      editForm.setValue('slug', slug, { shouldDirty: true });
                    } })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <input
                    type="text"
                    required
                    {...addForm.register('title', { required: true, onChange: (e) => {
                      const slug = generateSlug(e.target.value, { maxLength: 40, removeStopwords: true });
                      addForm.setValue('slug', slug, { shouldDirty: true });
                    } })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Slug *
                </label>
                <div className="flex">
                  {editingRound ? (
                    <input
                      type="text"
                      required
                      aria-invalid={editErrors.slug ? 'true' : 'false'}
                      {...registerEdit('slug', { required: 'Slug ist erforderlich' })}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="wird automatisch generiert"
                    />
                  ) : (
                    <input
                      type="text"
                      required
                      {...addForm.register('slug', { required: true })}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="wird automatisch generiert"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const title = editingRound ? editForm.getValues('title') : addForm.getValues('title');
                      const slug = generateSlug(title, { maxLength: 40, removeStopwords: true });
                      if (editingRound) {
                        editForm.setValue('slug', slug, { shouldDirty: true });
                      } else {
                        addForm.setValue('slug', slug, { shouldDirty: true });
                      }
                    }}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg hover:bg-gray-200 dark:hover:bg-gray-500 text-sm"
                  >
                    Generieren
                  </button>
                </div>
              </div>
            </div>

            {/* Status is now calculated automatically based on date and time */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Datum *
                </label>
                {editingRound ? (
                  <input
                    type="date"
                    required
                    aria-invalid={editErrors.date ? 'true' : 'false'}
                    {...registerEdit('date', { required: 'Datum ist erforderlich' })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <input
                    type="date"
                    required
                    {...addForm.register('date', { required: true })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Startzeit *
                </label>
                {editingRound ? (
                  <input
                    type="time"
                    required
                    aria-invalid={editErrors.startTime ? 'true' : 'false'}
                    {...registerEdit('startTime', { required: 'Startzeit ist erforderlich' })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <input
                    type="time"
                    required
                    {...addForm.register('startTime', { required: true })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Endzeit *
                </label>
                {editingRound ? (
                  <input
                    type="time"
                    required
                    aria-invalid={editErrors.endTime ? 'true' : 'false'}
                    {...registerEdit('endTime', { required: 'Endzeit ist erforderlich' })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <input
                    type="time"
                    required
                    {...addForm.register('endTime', { required: true })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location *
                </label>
                {editingRound ? (
                  <input
                    type="text"
                    required
                    aria-invalid={editErrors.location ? 'true' : 'false'}
                    {...registerEdit('location', { required: 'Location ist erforderlich' })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <input
                    type="text"
                    required
                    {...addForm.register('location', { required: true })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Adresse
                </label>
                {editingRound ? (
                  <input
                    type="text"
                    {...registerEdit('address')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <input
                    type="text"
                    {...addForm.register('address')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Wettbewerbstyp
              </label>
              {editingRound ? (
                <select
                  aria-invalid={editErrors.competitionType ? 'true' : 'false'}
                  {...registerEdit('competitionType', { required: 'Wettbewerbstyp ist erforderlich' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {competitionTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              ) : (
                <select
                  {...addForm.register('competitionType')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {competitionTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <TextareaInput
                label="Beschreibung"
                name="description"
                register={editingRound ? editForm.register : addForm.register}
                errors={editingRound ? editForm.formState.errors : addForm.formState.errors}
                placeholder="Beschreibung der Runde..."
                rows={4}
              />
            </div>

            <div>
              <TextareaInput
                label="After Play Report"
                name="afterPlayReport"
                register={editingRound ? editForm.register : addForm.register}
                errors={editingRound ? editForm.formState.errors : addForm.formState.errors}
                placeholder="Bericht nach der Runde..."
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Anzahl Jury-Mitglieder
              </label>
              {editingRound ? (
                <input
                  type="number"
                  min="1"
                  max="20"
                  {...editForm.register('totalJuryMembers', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              ) : (
                <input
                  type="number"
                  min="1"
                  max="20"
                  {...addForm.register('totalJuryMembers', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              )}
            </div>

            {/* Crew Management */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Crew</h3>
              
              <div className="flex items-center space-x-4 mb-4">
                <select
                  value={selectedCrewRole}
                  onChange={(e) => setSelectedCrewRole(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {crewRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCrewSearch(!showCrewSearch)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {showCrewSearch ? 'Suche schließen' : '+ Crew-Mitglied hinzufügen'}
                </button>
              </div>

              {showCrewSearch && (
                <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <input
                    type="text"
                    placeholder="Nach Crew-Mitgliedern suchen..."
                    value={crewSearchTerm}
                    onChange={(e) => setCrewSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white mb-3"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {getAvailableCrewMembers().map((participant, index) => (
                      <div
                        key={participant.id || `crew-member-${index}`}
                        onClick={() => addCrewMember(participant.id)}
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {participant.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {participant.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Crew Members */}
              {((editingRound ? editForm.getValues('crew') : addForm.getValues('crew')) || []).length > 0 && (
                <div className="space-y-2">
                  {((editingRound ? editForm.getValues('crew') : addForm.getValues('crew')) || []).map((crewMember, index) => (
                    <div key={crewMember.participantId || `crew-edit-${index}`} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {getParticipantName(crewMember.participantId)}
                        </span>
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                          ({crewMember.role})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCrewMember(crewMember.participantId)}
                        className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800"
                      >
                        Entfernen
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tournament Participants */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Turnier-Teilnehmer*innen</h3>
              
              <button
                type="button"
                onClick={() => setShowParticipantSearch(!showParticipantSearch)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-4"
              >
                {showParticipantSearch ? 'Suche schließen' : '+ Turnier-Teilnehmer*innen hinzufügen'}
              </button>

              {showParticipantSearch && (
                <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <input
                    type="text"
                    placeholder="Nach Turnier-Teilnehmer*innen suchen..."
                    value={participantSearchTerm}
                    onChange={(e) => setParticipantSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white mb-3"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {getAvailableParticipants().map((participant, index) => (
                      <div
                        key={participant.id || `tournament-participant-${index}`}
                        onClick={() => addTournamentParticipant(participant.id)}
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {participant.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {participant.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Tournament Participants */}
              {((editingRound ? editForm.getValues('tournamentParticipants') : addForm.getValues('tournamentParticipants')) || []).length > 0 && (
                <div className="space-y-2">
                  {((editingRound ? editForm.getValues('tournamentParticipants') : addForm.getValues('tournamentParticipants')) || []).map((participantId, index) => (
                    <div key={participantId || `tournament-edit-${index}`} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {getParticipantName(participantId)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTournamentParticipant(participantId)}
                        className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800"
                      >
                        Entfernen
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Groups Management */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Gruppen verwalten</h3>
              
              <div className="flex items-center space-x-4 mb-4">
                <input
                  type="text"
                  placeholder="Gruppenname"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={addGroup}
                  disabled={!newGroupName.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Gruppe hinzufügen
                </button>
              </div>

              {/* Existing Groups */}
              {((editingRound ? editGroupFields : groupFields) || []).length > 0 && (
                <div className="space-y-4">
                  {(editingRound ? editGroupFields : groupFields).map((group, index) => (
                    <div key={group.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{group.name}</h4>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => setShowGroupParticipantSearch(!showGroupParticipantSearch)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            + Teilnehmer*in
                          </button>
                          <button
                            type="button"
                            onClick={() => editingRound ? editRemoveGroupRHF(index) : removeGroupRHF(index)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            Gruppe löschen
                          </button>
                        </div>
                      </div>

                      {/* Add Participant to Group */}
                      {showGroupParticipantSearch && (
                        <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                          <input
                            type="text"
                            placeholder="Nach Teilnehmer*innen suchen..."
                            value={groupParticipantSearchTerm}
                            onChange={(e) => setGroupParticipantSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white mb-3"
                          />
                          <div className="max-h-40 overflow-y-auto space-y-2">
                            {getAvailableGroupParticipants(group.id).map((participantId, index) => (
                              <div
                                key={participantId || `group-selection-${index}`}
                                onClick={() => addGroupParticipant(group.id, participantId)}
                                className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
                              >
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {getParticipantName(participantId)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Group Participants */}
                      {group.participants.length > 0 && (
                        <div className="space-y-3">
                          <h5 className="font-medium text-gray-900 dark:text-white">Teilnehmer*innen in dieser Gruppe:</h5>
                          {group.order.map((participantId, index) => (
                            <div key={participantId || `group-participant-${index}`} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    #{index + 1}
                                  </span>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {getParticipantName(participantId)}
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={group.winners.includes(participantId)}
                                    onChange={() => toggleGroupWinner(group.id, participantId)}
                                    className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                                  />
                                  <span className="text-sm text-gray-500 dark:text-gray-400">Gewinner*in</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeGroupParticipant(group.id, participantId)}
                                  className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800"
                                >
                                  Entfernen
                                </button>
                              </div>

                              {/* Jury Scores */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                {Array.from({ length: editingRound?.totalJuryMembers || 5 }, (_, juryIndex) => (
                                  <div key={juryIndex} className="text-center">
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                      Jury {juryIndex + 1}
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="10"
                                      step="0.1"
                                      value={group.juryScores?.[participantId]?.[juryIndex] || ''}
                                      onChange={(e) => updateJuryScore(group.id, participantId, juryIndex, e.target.value)}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                      placeholder="0.0"
                                    />
                                  </div>
                                ))}
                              </div>

                              {/* Total Score Display */}
                              {group.juryScores && group.juryScores[participantId] && group.juryScores[participantId].length > 0 && (
                                <div className="mt-2 text-sm">
                                  <span className="text-gray-500 dark:text-gray-400">Gesamtpunktzahl (ohne höchste/niedrigste): </span>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {calculateTotalScore(group.juryScores[participantId]).toFixed(1)}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Feature Artists */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Feature Artists</h3>
              
              <button
                type="button"
                onClick={() => setShowFeatureSearch(!showFeatureSearch)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors mb-4"
              >
                {showFeatureSearch ? 'Suche schließen' : '+ Feature Artist hinzufügen'}
              </button>

              {showFeatureSearch && (
                <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <input
                    type="text"
                    placeholder="Nach Feature Artists suchen..."
                    value={featureSearchTerm}
                    onChange={(e) => setFeatureSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white mb-3"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {getAvailableFeatureArtists().map((participant, index) => (
                      <div
                        key={participant.id || `feature-artist-${index}`}
                        onClick={() => addFeatureArtist(participant.id)}
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer transition-colors"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {participant.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Feature Artist
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Feature Artists */}
              {((editingRound ? editingRound.featureArtists : featureFields) || []).length > 0 && (
                <div className="space-y-2">
                                      {(editingRound ? editingRound.featureArtists : featureFields || []).map((feature, index) => (
                    <div key={feature.participantId || feature.id || `feature-edit-${index}`} className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {feature.name}
                        </span>
                        <span className="ml-2 text-sm text-purple-600 dark:text-purple-400">
                          (Feature #{feature.order})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFeatureArtist(feature.participantId)}
                        className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800"
                      >
                        Entfernen
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingRound(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingRound ? 'Änderungen speichern' : 'Runde hinzufügen'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Results Count */}
      <div className="flex justify-between items-center">
        <p className="text-gray-600 dark:text-gray-400">
          Zeige {filteredRounds.length} von {Array.isArray(rounds) ? rounds.length : 0} Runden
        </p>
      </div>

      {/* Rounds List */}
      <div className="space-y-6">
        {filteredRounds.map((round) => (
          <div key={round.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 break-words">{round.title || 'Unbekannte Runde'}</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>📅 {round.date ? new Date(round.date).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' }) : 'Unbekanntes Datum'} {round.startTime || '00:00'} - {round.endTime || '00:00'}</span>
                  <span>📍 {round.location || 'Unbekannter Ort'}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    round.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
                    round.status === 'ACTIVE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                    round.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {round.status === 'SCHEDULED' ? 'Anstehend' : 
                     round.status === 'ACTIVE' ? 'Aktiv' : 
                     round.status === 'COMPLETED' ? 'Abgeschlossen' : 'Abgesagt'}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditRound(round)}
                  className="px-3 py-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Bearbeiten
                </button>
                <button
                  onClick={() => handleDeleteRound(round.id)}
                  disabled={deletingRoundId === round.id}
                  className={`px-3 py-1 text-sm font-medium ${
                    deletingRoundId === round.id 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-red-600 hover:text-red-700'
                  }`}
                >
                  {deletingRoundId === round.id ? 'Löschen...' : 'Löschen'}
                </button>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4">{round.description}</p>

            {/* Crew */}
            {round.crew && round.crew.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Crew:</h4>
                <div className="flex flex-wrap gap-2">
                  {round.crew.map((crewMember, index) => (
                    <span key={crewMember.participantId || `crew-${index}`} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm">
                      {getParticipantName(crewMember.participantId)} ({crewMember.role})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tournament Participants */}
            {round.tournamentParticipants && round.tournamentParticipants.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Turnier-Teilnehmer*innen ({round.tournamentParticipants.length}):</h4>
                <div className="flex flex-wrap gap-2">
                  {round.tournamentParticipants.map((participantId, index) => (
                    <span key={participantId || `tournament-display-${index}`} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
                      {getParticipantName(participantId)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Feature Artists */}
            {round.featureArtists && round.featureArtists.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Feature Artists:</h4>
                <div className="flex flex-wrap gap-2">
                  {round.featureArtists.map((feature, index) => (
                    <span key={feature.participantId || `feature-${index}`} className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-sm">
                      {feature.name} (Feature #{feature.order})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Groups and Results */}
            {round.groups && round.groups.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Gruppen & Ergebnisse:</h4>
                <div className="space-y-3">
                  {round.groups.map((group) => (
                    <div key={group.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">{group.name}</h5>
                      <div className="space-y-2">
                        {group.participants.map((participantId, index) => {
                          const scores = group.juryScores?.[participantId] || [];
                          const totalScore = calculateTotalScore(scores);
                          const isWinner = group.winners.includes(participantId);
                          
                          return (
                            <div key={participantId || `group-display-participant-${index}`} className={`flex items-center justify-between p-2 rounded ${isWinner ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700' : 'bg-gray-50 dark:bg-gray-700'}`}>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {getParticipantName(participantId)}
                                </span>
                                {isWinner && <span className="text-yellow-600 dark:text-yellow-400">🏆</span>}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  Jury: {scores.join(', ')}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  Gesamt: {totalScore.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredRounds.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🎭</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Keine Runden gefunden</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'Versuchen Sie einen anderen Suchbegriff.' : 'Fügen Sie die erste Runde hinzu.'}
          </p>
        </div>
      )}
    </div>
  );
}
