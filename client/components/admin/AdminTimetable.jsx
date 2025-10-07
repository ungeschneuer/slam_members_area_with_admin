import React, { useState, useMemo, useEffect } from 'react';
import { useTimetable, useParticipants, useCreateTimetableEvent, useUpdateTimetableEvent, useDeleteTimetableEvent, useTimetableJunctionTables } from '../../hooks/index.js';
import LoadingSpinner from '../LoadingSpinner';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import TextareaInput from '../forms/TextareaInput.jsx';
import useParticipantManagement from '../../hooks/useParticipantManagement.js';
import { timetableSchema, getDefaultValues, getRoleOptions, getStatusOptions } from '../../utils/adminFormSchemas.js';
import { createParticipantObject } from '../../utils/junctionTableUtils.js';
import { generateSlug } from '../../utils/slugUtils.js';
import { getSlugConfig } from '../../../server/config/slugConfig.js';

export default function AdminTimetable() {
  const { data: eventsData, isLoading: loadingEvents, error: errorEvents } = useTimetable();
  const { data: participantsData, isLoading: loadingParticipants, error: errorParticipants } = useParticipants();
  const createEvent = useCreateTimetableEvent();
  const updateEvent = useUpdateTimetableEvent();
  const deleteEvent = useDeleteTimetableEvent();
  
  const loading = loadingEvents || loadingParticipants;
  const error = errorEvents || errorParticipants;
  const events = useMemo(() => Array.isArray(eventsData) ? eventsData : [], [eventsData]);
  const participants = useMemo(() => Array.isArray(participantsData) ? participantsData : [], [participantsData]);

  // Live data handled by useLiveData

  const [editingEvent, setEditingEvent] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState('all');

  // Use unified form approach like AdminRounds
  const addForm = useForm({
    resolver: zodResolver(timetableSchema),
    defaultValues: getDefaultValues('timetable')
  });

  // RHF for editing existing event
  const editForm = useForm({
    resolver: zodResolver(timetableSchema),
    defaultValues: getDefaultValues('timetable')
  });

  // Get slug configuration for timetable
  const slugConfig = getSlugConfig('timetable');

  // Auto-generate slug when title changes for add form
  useEffect(() => {
    const subscription = addForm.watch((value, { name }) => {
      if (name === 'title' && value?.title) {
        const slug = generateSlug(value.title, slugConfig);
        addForm.setValue('slug', slug, { shouldDirty: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [addForm.watch, addForm.setValue, slugConfig]);

  // Auto-generate slug when title changes for edit form
  useEffect(() => {
    const subscription = editForm.watch((value, { name }) => {
      if (name === 'title' && value?.title) {
        const slug = generateSlug(value.title, slugConfig);
        editForm.setValue('slug', slug, { shouldDirty: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [editForm.watch, editForm.setValue, slugConfig]);

  const { fields: linkFields, append: appendLink, remove: removeLinkRHF, update: updateLinkRHF } = useFieldArray({ control: addForm.control, name: 'additionalLinks' });
  const { fields: participantFields, append: appendParticipant, remove: removeParticipantRHF, update: updateParticipantRHF } = useFieldArray({ control: addForm.control, name: 'participants' });
  
  // Edit form field arrays
  const { fields: editLinkFields, append: appendEditLink, remove: removeEditLink } = useFieldArray({ control: editForm.control, name: 'additionalLinks' });
  const { fields: editParticipantFields, append: appendEditParticipant, remove: removeEditParticipantRHF } = useFieldArray({ control: editForm.control, name: 'participants' });

  const eventTypes = [
    { value: 'team-round', label: 'Team-Runde', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: '👥' },
    { value: 'individual-round', label: 'Einzel-Runde', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: '👤' },
    { value: 'workshop', label: 'Workshop', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: '🎓' },
    { value: 'fun', label: 'Fun', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: '🎉' },
    { value: 'aftershow', label: 'Aftershow', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: '🎭' }
  ];

  const statuses = getStatusOptions('timetable').map(status => ({
    ...status,
    color: status.value === 'upcoming' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
           status.value === 'active' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
           status.value === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
           'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }));

  const linkTypes = [
    { value: 'form', label: 'Formular', icon: '📝' },
    { value: 'document', label: 'Dokument', icon: '📄' },
    { value: 'list', label: 'Liste', icon: '📋' },
    { value: 'stream', label: 'Live-Stream', icon: '📺' },
    { value: 'menu', label: 'Speisekarte', icon: '🍽️' },
    { value: 'info', label: 'Information', icon: 'ℹ️' },
    { value: 'ticket', label: 'Tickets', icon: '🎫' }
  ];

  // Helper function to get category color scheme
  const getCategoryColors = (eventType) => {
    switch (eventType) {
      case 'team-round':
        return {
          cardBg: 'bg-red-100 dark:bg-red-900/40',
          cardBorder: 'border-red-300 dark:border-red-700'
        };
      case 'individual-round':
        return {
          cardBg: 'bg-blue-100 dark:bg-blue-900/40',
          cardBorder: 'border-blue-300 dark:border-blue-700'
        };
      case 'workshop':
        return {
          cardBg: 'bg-green-100 dark:bg-green-900/40',
          cardBorder: 'border-green-300 dark:border-green-700'
        };
      case 'fun':
        return {
          cardBg: 'bg-yellow-100 dark:bg-yellow-900/40',
          cardBorder: 'border-yellow-300 dark:border-yellow-700'
        };
      case 'aftershow':
        return {
          cardBg: 'bg-purple-100 dark:bg-purple-900/40',
          cardBorder: 'border-purple-300 dark:border-purple-700'
        };
      default:
        return {
          cardBg: 'bg-gray-100 dark:bg-gray-800',
          cardBorder: 'border-gray-300 dark:border-gray-600'
        };
    }
  };

  const participantRoles = getRoleOptions('participants');

  const handleAdd = async (data) => {
    try {
      await createEvent.mutateAsync(data);
      addForm.reset();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateEvent.mutateAsync({ id: editingEvent.id, ...editingEvent });
      setEditingEvent(null);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bist du sicher, dass du dieses Event löschen möchtest?')) {
      try {
        await deleteEvent.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  const handleMoveEvent = async (eventId, direction) => {
    const currentIndex = events.findIndex(e => e.id === eventId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= events.length) return;

    const updatedEvents = [...events];
    [updatedEvents[currentIndex], updatedEvents[newIndex]] = [updatedEvents[newIndex], updatedEvents[currentIndex]];
    
    // Update the order in the database
    try {
      for (let i = 0; i < updatedEvents.length; i++) {
        await updateEvent.mutateAsync({ id: updatedEvents[i].id, ...updatedEvents[i] });
      }
    } catch (error) {
      console.error('Error moving event:', error);
    }
  };

  // Junction table hooks for managing relationships
  const junctionTables = useTimetableJunctionTables(editingEvent?.id);

  // Use shared participant management hook
  const participantManagement = useParticipantManagement({
    junctionTables,
    addForm,
    editForm,
    editingItem: editingEvent,
    participants,
    getParticipantName: (participantId) => {
      const participant = participants.find(p => p.id === participantId);
      return participant ? participant.name : `Teilnehmer*in ${participantId}`;
    },
    getParticipantId: (participant) => {
      if (typeof participant === 'number') return participant;
      if (typeof participant === 'string') return parseInt(participant);
      if (participant && typeof participant === 'object') {
        return participant.participantId || participant.id || participant;
      }
      return null;
    }
  });

  // Extract shared state and functions
  const {
    participantSearchTerm,
    setParticipantSearchTerm,
    showParticipantSearch,
    setShowParticipantSearch,
    addParticipant: addParticipantShared,
    removeParticipant: removeParticipantShared,
    getAvailableParticipants: getAvailableParticipantsShared
  } = participantManagement;

  const addParticipant = async (event, participantId = null, role = null) => {
    await addParticipantShared(participantId, role || participantRoles[0], 'participants');
  };

  const removeParticipant = async (event, participantId) => {
    await removeParticipantShared(participantId, 'participants');
  };

  // Link management functions
  const addLink = (event) => {
    const newLink = { title: '', url: '', type: 'info' };

    if (editingEvent && editingEvent.id === event.id) {
      setEditingEvent({ 
        ...editingEvent, 
        additionalLinks: [...(editingEvent.additionalLinks || []), newLink] 
      });
    } else {
      appendLink(newLink);
    }
  };

  const updateLink = (event, index, field, value) => {
    if (editingEvent && editingEvent.id === event.id) {
      const updatedLinks = [...(event.additionalLinks || [])];
      updatedLinks[index] = { ...updatedLinks[index], [field]: value };
      setEditingEvent({ ...editingEvent, additionalLinks: updatedLinks });
    } else {
      const current = addForm.getValues('additionalLinks');
      const updated = [...current];
      updated[index] = { ...updated[index], [field]: value };
      updateLinkRHF(index, updated[index]);
    }
  };

  const removeLink = (event, index) => {
    if (editingEvent && editingEvent.id === event.id) {
      const updatedLinks = (event.additionalLinks || []).filter((_, i) => i !== index);
      setEditingEvent({ ...editingEvent, additionalLinks: updatedLinks });
    } else {
      removeLinkRHF(index);
    }
  };

  const filteredEvents = events.filter(event => {
    return selectedDate === 'all' || event.date === selectedDate;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return timeString;
  };

  const getUniqueDates = () => {
    const dates = [...new Set(events.map(event => event.date))];
    return dates.sort();
  };

  const getAvailableParticipants = (event) => {
    const assignedParticipantIds = (event.participants || [])
      .map(p => (p.id ?? p.participantId))
      .filter(id => id !== '' && id !== null && id !== undefined);
    return participants.filter(p => !assignedParticipantIds.includes(p.id));
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Zeitplan wird geladen..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Fehler beim Laden des Zeitplans</h3>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  const renderEventForm = (event, isNew = false) => {
    const currentEvent = isNew ? newEvent : editingEvent;
    const setCurrentEvent = isNew ? setNewEvent : setEditingEvent;
    const editForm = useForm({
      defaultValues: {
        title: currentEvent?.title || '',
        location: currentEvent?.location || '',
        date: currentEvent?.date || '',
        time: currentEvent?.time || '',
        end_time: currentEvent?.end_time || '',
        type: currentEvent?.type || (eventTypes[0]?.value || ''),
        status: currentEvent?.status || (statuses[0]?.value || ''),
        description: currentEvent?.description || '',
        detailedDescription: currentEvent?.detailedDescription || '',
        internalLink: currentEvent?.internalLink || '',
        additionalLinks: currentEvent?.additionalLinks || []
      }
    });
    const { fields: editLinkFields, append: appendEditLink, remove: removeEditLink } = useFieldArray({ control: editForm.control, name: 'additionalLinks' });

    return (
      <form onSubmit={isNew ? addForm.handleSubmit(handleAdd) : editForm.handleSubmit(async (data) => {
        // Merge edited core fields back into local state object for existing event flow
        const merged = { ...currentEvent, ...data };
        setCurrentEvent(merged);
        await handleUpdate();
      })} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Titel</label>
            {isNew ? (
              <input
                type="text"
                required
                {...addForm.register('title', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            ) : (
              <input
                type="text"
                required
                {...editForm.register('title', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Slug (URL-freundlich)</label>
            {isNew ? (
              <input
                type="text"
                required
                {...addForm.register('slug', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Wird automatisch generiert"
              />
            ) : (
              <input
                type="text"
                required
                {...editForm.register('slug', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Wird automatisch generiert"
              />
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Wird automatisch aus dem Titel generiert, kann aber manuell angepasst werden</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ort</label>
            {isNew ? (
              <input
                type="text"
                required
                {...addForm.register('location', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            ) : (
              <input
                type="text"
                required
                {...editForm.register('location', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Datum</label>
            {isNew ? (
              <input
                type="date"
                required
                {...addForm.register('date', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            ) : (
              <input
                type="date"
                required
                {...editForm.register('date', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Startzeit</label>
            {isNew ? (
                <input
                  type="time"
                  required
                  {...addForm.register('time', { required: true })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              ) : (
              <input
                type="time"
                required
                {...editForm.register('time', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Endzeit</label>
            {isNew ? (
                <input
                  type="time"
                  required
                  {...addForm.register('end_time', { required: true })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              ) : (
              <input
                type="time"
                required
                {...editForm.register('end_time', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Typ</label>
            {isNew ? (
              <select
                required
                {...addForm.register('type', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {eventTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            ) : (
              <select
                required
                {...editForm.register('type', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {eventTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
            {isNew ? (
              <select
                required
                {...addForm.register('status', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {statuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            ) : (
              <select
                required
                {...editForm.register('status', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {statuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Descriptions */}
        <div className="space-y-4">
          <div>
            <TextareaInput
              label="Kurze Beschreibung"
              name="description"
              register={isNew ? addForm.register : editForm.register}
              errors={isNew ? addForm.formState.errors : editForm.formState.errors}
              placeholder="Kurze Beschreibung des Events..."
              rows={3}
              rules={{ required: true }}
            />
          </div>
          <div>
            <TextareaInput
              label="Detaillierte Beschreibung"
              name="detailedDescription"
              register={isNew ? addForm.register : editForm.register}
              errors={isNew ? addForm.formState.errors : editForm.formState.errors}
              placeholder="Detaillierte Beschreibung mit allen wichtigen Informationen..."
              rows={5}
            />
          </div>
        </div>

        {/* Participants */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Teilnehmer*innen & Rollen</h3>
            <button
              type="button"
              onClick={() => addParticipant(currentEvent)}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Teilnehmer*innen hinzufügen
            </button>
          </div>
          
          {(currentEvent.participants_details || currentEvent.participants || []).map((participant, index) => {
            // Handle both old and new structure
            const participantId = participant.id || participant.participantId;
            const participantName = participant.name || '';
            const participantRole = participant.role || '';
            
            return (
              <div key={index} className="flex items-center space-x-3 mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {isNew ? (
                  <>
                    <select
                      value={participantId || ''}
                      onChange={(e) => {
                        const selectedParticipant = participants.find(p => p.id === parseInt(e.target.value));
                        const updatedParticipants = [...(currentEvent.participants || [])];
                        updatedParticipants[index] = {
                          ...updatedParticipants[index],
                          id: e.target.value ? parseInt(e.target.value) : '',
                          name: selectedParticipant?.name || ''
                        };
                        setCurrentEvent({...currentEvent, participants: updatedParticipants});
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Teilnehmer*innen auswählen...</option>
                      {getAvailableParticipants(currentEvent).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <select
                      value={participantRole}
                      onChange={(e) => {
                        const updatedParticipants = [...(currentEvent.participants || [])];
                        updatedParticipants[index] = {
                          ...updatedParticipants[index],
                          role: e.target.value
                        };
                        setCurrentEvent({...currentEvent, participants: updatedParticipants});
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      {participantRoles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <Controller
                      control={editForm.control}
                      name={`participants.${index}.id`}
                      render={({ field }) => (
                        <select
                          value={field.value || ''}
                          onChange={async (e) => {
                            const newId = e.target.value ? parseInt(e.target.value) : '';
                            // junction-safe: remove old, add new
                            if (participantId) {
                              await removeParticipant(currentEvent, participantId);
                            }
                            if (newId) {
                              await addParticipant(currentEvent, newId, participantRole);
                            }
                            field.onChange(newId);
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Teilnehmer*innen auswählen...</option>
                          {getAvailableParticipants(currentEvent).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      )}
                    />
                    <Controller
                      control={editForm.control}
                      name={`participants.${index}.role`}
                      render={({ field }) => (
                        <select
                          value={field.value || ''}
                          onChange={async (e) => {
                            const newRole = e.target.value;
                            if (participantId) {
                              await junctionTables.participants.update.mutateAsync({
                                entryId: currentEvent.id,
                                participantId: participantId,
                                role: newRole
                              });
                            }
                            field.onChange(newRole);
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        >
                          {participantRoles.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      )}
                    />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => removeParticipant(currentEvent, participantId)}
                  className="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        {/* Additional Links */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Zusätzliche Links</h3>
            <button
              type="button"
              onClick={() => isNew ? addLink(currentEvent) : appendEditLink({ type: linkTypes[0]?.value || '', title: '', url: '' })}
              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              Link hinzufügen
            </button>
          </div>
          
          {(isNew ? linkFields : editLinkFields).map((link, index) => (
            <div key={link.id ?? index} className="flex items-center space-x-3 mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              {isNew ? (
                <>
                  <select
                    {...addForm.register(`additionalLinks.${index}.type`)}
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    {linkTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Titel"
                    {...addForm.register(`additionalLinks.${index}.title`)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="url"
                    placeholder="URL"
                    {...addForm.register(`additionalLinks.${index}.url`)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(currentEvent, index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <select
                    {...editForm.register(`additionalLinks.${index}.type`)}
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    {linkTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Titel"
                    {...editForm.register(`additionalLinks.${index}.title`)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="url"
                    placeholder="URL"
                    {...editForm.register(`additionalLinks.${index}.url`)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark-border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => removeEditLink(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Internal Link Override */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Interne Verlinkung (optional)
          </label>
          {isNew ? (
            <input
              type="url"
              {...addForm.register('internalLink')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="https://example.com/custom-page (überschreibt die Standard-Detailseite)"
            />
          ) : (
            <input
              type="url"
              {...editForm.register('internalLink')}
              className="w-full px-4 py-2 border border-gray-300 dark-border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="https://example.com/custom-page (überschreibt die Standard-Detailseite)"
            />
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Wenn gesetzt, wird der Benutzer zu dieser URL weitergeleitet statt zur Standard-Detailseite.
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex space-x-3">
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {isNew ? 'Event hinzufügen' : 'Änderungen speichern'}
          </button>
          <button
            type="button"
            onClick={() => isNew ? setShowAddForm(false) : setEditingEvent(null)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Zeitplan verwalten</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Wettbewerbsveranstaltungen planen und verwalten</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Event hinzufügen
        </button>
      </div>

      {/* Date Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nach Datum filtern</label>
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full md:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        >
          <option value="all">Alle Daten</option>
          {getUniqueDates().map(date => (
            <option key={date} value={date}>{formatDate(date)}</option>
          ))}
        </select>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Neues Event hinzufügen</h2>
          {renderEventForm(null, true)}
        </div>
      )}

      {/* Events List */}
      <div className="space-y-4">
        {filteredEvents.map((event, index) => {
          const colors = getCategoryColors(event.type);
          return (
          <div key={event.id} className={`${colors.cardBg} rounded-xl shadow-sm border ${colors.cardBorder}`}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">
                      {eventTypes.find(t => t.value === event.type)?.icon || '📅'}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{event.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      eventTypes.find(t => t.value === event.type)?.color || 'bg-gray-100 text-gray-800'
                    }`}>
                      {eventTypes.find(t => t.value === event.type)?.label}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      statuses.find(s => s.value === event.status)?.color || 'bg-gray-100 text-gray-800'
                    }`}>
                      {statuses.find(s => s.value === event.status)?.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <div>
                      <span className="font-medium">Datum:</span> {formatDate(event.date)}
                    </div>
                    <div>
                      <span className="font-medium">Zeit:</span> {formatTime(event.time)} - {formatTime(event.end_time)}
                    </div>
                    <div>
                      <span className="font-medium">Ort:</span> {event.location}
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">{event.description}</p>
                  
                  {/* Participants Preview */}
                  {event.participants_details && event.participants_details.length > 0 && (
                    <div className="mb-3">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Teilnehmer*innen:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {event.participants_details.map((participant, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {participant.name} ({participant.role})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Links Preview */}
                  {event.additionalLinks && event.additionalLinks.length > 0 && (
                    <div className="mb-3">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Links:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {event.additionalLinks.map((link, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {linkTypes.find(t => t.value === link.type)?.icon} {link.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  {/* Move Up/Down Buttons */}
                  <button
                    onClick={() => handleMoveEvent(event.id, 'up')}
                    disabled={index === 0}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Nach oben"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveEvent(event.id, 'down')}
                    disabled={index === filteredEvents.length - 1}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Nach unten"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => setEditingEvent(event)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Keine Events gefunden</h3>
          <p className="text-gray-600 dark:text-gray-400">Versuche deine Datumsfilter anzupassen oder füge neue Events hinzu</p>
        </div>
      )}

      {/* Edit Modal */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Event bearbeiten</h2>
            {renderEventForm(editingEvent, false)}
          </div>
        </div>
      )}
    </div>
  );
}
