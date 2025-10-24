import React, { useState, useMemo, useEffect } from 'react';
import { useTimetable, useParticipants, useCreateTimetableEvent, useUpdateTimetableEvent, useDeleteTimetableEvent, useUpdateTimetableParticipantRole } from '../../hooks/index.js';
import LoadingSpinner from '../LoadingSpinner.jsx';
import { useFieldArray, Controller } from 'react-hook-form';
import TextareaInput from '../forms/TextareaInput.jsx';
import { useFormManager } from '../../hooks/useFormManager.js';
import { createValidationSchema, getDefaultValues } from '../../../shared/schemas/validationFactory.js';
import { getRoleOptions, getStatusOptions } from '../../utils/adminFormSchemas.js';
import { generateSlug } from '../../utils/slugUtils.js';
import { getSlugConfig } from '../../../server/config/slugConfig.js';
import { getRoundStatusColor } from '../../utils/categoryTranslations.js';
import { mapTimetableFormToAPI } from '../../utils/formMappers.js';
import ParticipantDropdown from './ParticipantDropdown.jsx';
import { ADMIN_PARTICIPANTS_LIMIT } from '../../config/api.js';
import { formatDateForDisplay, isValidDateString } from '../../utils/dateUtils.js';

export default function AdminTimetable() {
  const { data: eventsData, isLoading: loadingEvents, error: errorEvents } = useTimetable({}, true); // isAdmin = true
  const { data: participantsData, isLoading: loadingParticipants, error: errorParticipants } = useParticipants({ limit: ADMIN_PARTICIPANTS_LIMIT }, true); // isAdmin = true
  const createEvent = useCreateTimetableEvent();
  const updateEvent = useUpdateTimetableEvent();
  const deleteEvent = useDeleteTimetableEvent();
  const updateParticipantRole = useUpdateTimetableParticipantRole();
  
  const loading = loadingEvents || loadingParticipants;
  const error = errorEvents || errorParticipants;
  const events = useMemo(() => Array.isArray(eventsData) ? eventsData : [], [eventsData]);
  const participants = useMemo(() => {
    // Handle the nested data structure from useParticipants
    const participantsArray = participantsData?.data || [];
    return Array.isArray(participantsArray) ? participantsArray : [];
  }, [participantsData]);

  // Live data handled by useLiveData

  const [editingEvent, setEditingEvent] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDate, setSelectedDate] = useState('all');

  // Form management with centralized error handling
  const { 
    form, 
    error: componentError, 
    isSubmitting, 
    submitForm, 
    resetForm, 
    setFormValues,
    clearError 
  } = useFormManager(createValidationSchema('timetable'), { 
    defaultValues: getDefaultValues('timetable') 
  });

  // Ensure the add form closes automatically after a successful creation
  useEffect(() => {
    if (createEvent?.isSuccess) {
      setIsCreating(false);
    }
  }, [createEvent?.isSuccess]);

  // Get slug configuration for timetable
  const slugConfig = getSlugConfig('timetable');

  // Auto-generate slug when title changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'title' && value?.title) {
        const slug = generateSlug(value.title, slugConfig);
        form.setValue('slug', slug, { shouldDirty: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, form.setValue, slugConfig]);

  // Field arrays for form management
  const { fields: linkFields, append: appendLink, remove: removeLinkRHF, update: updateLinkRHF } = useFieldArray({ control: form.control, name: 'additionalLinks' });
  const { fields: participantFields, append: appendParticipant, remove: removeParticipantRHF, update: updateParticipantRHF } = useFieldArray({ control: form.control, name: 'participants' });

  const eventTypes = [
    { value: 'team-round', label: 'Team-Runde', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: '👥' },
    { value: 'individual-round', label: 'Einzel-Runde', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: '👤' },
    { value: 'workshop', label: 'Workshop', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: '🎓' },
    { value: 'fun', label: 'Fun', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: '🎉' },
    { value: 'aftershow', label: 'Aftershow', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: '🎭' },
    { value: 'panel', label: 'Panel', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: '🎤' }
  ];

  const statuses = getStatusOptions('timetable').map(status => ({
    ...status,
    color: getRoundStatusColor(status.value)
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
      const apiData = mapTimetableFormToAPI(data);
      await createEvent.mutateAsync(apiData);
      form.reset();
      setIsCreating(false);
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

  // Junction table hooks removed - using simple database queries

  // Participant management functionality
  const [participantSearchTerm, setParticipantSearchTerm] = useState('');
  const [showParticipantSearch, setShowParticipantSearch] = useState(false);
  
  const getAvailableParticipants = (currentParticipants = []) => {
    if (!participants) return [];
    const currentIds = currentParticipants.map(p => p.participantId || p.id);
    return participants.filter(p => !currentIds.includes(p.id));
  };

  const addParticipant = async (event, participantId = null, role = null) => {
    console.log('Adding participant:', participantId, 'with role:', role, 'event:', event);
    console.log('editingEvent:', editingEvent);
    
    if (!participantId) {
      // Add a new participant row to the form
      if (editingEvent) {
        const newParticipant = { participantId: '', role: '' };
        const updatedEvent = {
          ...editingEvent,
          participants: [...(editingEvent.participants || []), newParticipant]
        };
        console.log('Setting editingEvent to:', updatedEvent);
        setEditingEvent(updatedEvent);
      } else {
        console.log('No editingEvent, using appendParticipant');
        appendParticipant({ participantId: '', role: '' });
      }
    } else {
      // Actually add the participant to the event
      try {
        await updateParticipantRole.mutateAsync({
          entryId: event.id,
          participantId: participantId,
          role: role || 'Teilnehmer*in'
        });
      } catch (error) {
        console.error('Error adding participant:', error);
      }
    }
  };

  const removeParticipant = async (event, participantId) => {
    console.log('Removing participant:', participantId);
    
    if (editingEvent) {
      setEditingEvent({
        ...editingEvent,
        participants: (editingEvent.participants || []).filter(p => p.participantId !== participantId)
      });
    } else {
      removeParticipantRHF(participantId);
    }
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
      const updatedLinks = [...(editingEvent.additionalLinks || [])];
      updatedLinks[index] = { ...updatedLinks[index], [field]: value };
      setEditingEvent({ ...editingEvent, additionalLinks: updatedLinks });
    } else {
      const current = form.getValues('additionalLinks');
      const updated = [...current];
      updated[index] = { ...updated[index], [field]: value };
      updateLinkRHF(index, updated[index]);
    }
  };

  const removeLink = (event, index) => {
    if (editingEvent && editingEvent.id === event.id) {
      const updatedLinks = (editingEvent.additionalLinks || []).filter((_, i) => i !== index);
      setEditingEvent({ ...editingEvent, additionalLinks: updatedLinks });
    } else {
      removeLinkRHF(index);
    }
  };

  const filteredEvents = events.filter(event => {
    return selectedDate === 'all' || event.date === selectedDate;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'Kein Datum';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Ungültiges Datum';
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    // Handle HH:mm format
    if (typeof timeString === 'string' && /^\d{2}:\d{2}/.test(timeString)) {
      return timeString.substring(0, 5);
    }
    return timeString;
  };

  const getUniqueDates = () => {
    const dates = [...new Set(events.map(event => event.date))];
    return dates.sort();
  };

  // getAvailableParticipants function already defined above

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
        <p className="text-gray-600 dark:text-gray-400">{error?.message || error}</p>
      </div>
    );
  }

  const renderEventForm = (event, isNew = false) => {
    const currentForm = form;
    const currentEvent = isNew ? null : editingEvent;

    return (
      <form onSubmit={form.handleSubmit(isNew ? handleAdd : async (data) => {
        try {
          const apiData = mapTimetableFormToAPI(data);
          await updateEvent.mutateAsync({ id: editingEvent.id, ...apiData });
          setEditingEvent(null);
        } catch (error) {
          console.error('Error updating event:', error);
        }
      })} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Titel</label>
            {isNew ? (
              <input
                type="text"
                required
                aria-label="Titel"
                {...form.register('title', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            ) : (
              <input
                type="text"
                required
                aria-label="Titel"
                {...form.register('title', { required: true })}
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
                aria-label="Slug"
                {...form.register('slug', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Wird automatisch generiert"
              />
            ) : (
              <input
                type="text"
                required
                aria-label="Slug"
                {...form.register('slug', { required: true })}
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
                aria-label="Ort"
                {...form.register('location', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            ) : (
              <input
                type="text"
                required
                aria-label="Ort"
                {...form.register('location', { required: true })}
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
                aria-label="Datum"
                {...form.register('date', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            ) : (
              <input
                type="date"
                required
                aria-label="Datum"
                {...form.register('date', { required: true })}
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
                  aria-label="Startzeit"
                  {...form.register('time', { required: true })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              ) : (
              <input
                type="time"
                required
                aria-label="Startzeit"
                {...form.register('time', { required: true })}
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
                  aria-label="Endzeit"
                  {...form.register('endTime', { required: true })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              ) : (
              <input
                type="time"
                required
                aria-label="Endzeit"
                {...form.register('endTime', { required: true })}
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
                aria-label="Typ"
                {...form.register('type', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {eventTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            ) : (
              <select
                required
                aria-label="Typ"
                {...form.register('type', { required: true })}
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
                aria-label="Status"
                {...form.register('status', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {statuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            ) : (
              <select
                required
                aria-label="Status"
                {...form.register('status', { required: true })}
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
              register={form.register}
              errors={form.formState.errors}
              placeholder="Kurze Beschreibung des Events..."
              rows={3}
              rules={{ required: true }}
              ariaLabel="Kurze Beschreibung"
            />
          </div>
          <div>
            <TextareaInput
              label="Detaillierte Beschreibung"
              name="detailedDescription"
              register={form.register}
              errors={form.formState.errors}
              placeholder="Detaillierte Beschreibung mit allen wichtigen Informationen..."
              rows={5}
              ariaLabel="Detaillierte Beschreibung"
            />
          </div>
        </div>

        {/* Participants */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Teilnehmer*innen & Rollen</h3>
            <button
              type="button"
              onClick={() => addParticipant(editingEvent)}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Teilnehmer*innen hinzufügen
            </button>
          </div>
          
          {/* Always show participant interface when editing */}
          {editingEvent && (
            <div className="space-y-3">
              {((editingEvent?.assignments || editingEvent?.participants) || []).map((participant, index) => {
            // Handle both old and new structure
            const participantId = participant.participant_id || participant.id || participant.participantId;
            const participantName = participant.participant_name || participant.name || '';
            const participantRole = participant.role || '';
            
        return (
          <div key={`timetable-participant-${participantId || participant.slug || index}`} className="flex items-center space-x-3 mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Controller
                  control={form.control}
                  name={`participants.${index}.id`}
                  render={({ field }) => (
                    <ParticipantDropdown
                      items={participants}
                      value={field.value || ''}
                      onChange={async (newId) => {
                        if (isNew) {
                          // For new events, update the form state
                          const selectedParticipant = participants.find(p => p.id === parseInt(newId));
                          const updatedParticipants = [...(editingEvent?.participants || [])];
                          updatedParticipants[index] = {
                            ...updatedParticipants[index],
                            participantId: newId,
                            name: selectedParticipant?.name || ''
                          };
                          setEditingEvent({...editingEvent, participants: updatedParticipants});
                        } else {
                          // For editing, use junction table operations
                          if (participantId) {
                            await removeParticipant(editingEvent, participantId);
                          }
                          if (newId) {
                            await addParticipant(editingEvent, newId, participantRole);
                          }
                        }
                        field.onChange(newId);
                      }}
                      placeholder="Teilnehmer*innen auswählen..."
                      searchPlaceholder="Suchen..."
                      disabled={loadingParticipants}
                      loading={loadingParticipants}
                      filterFn={(p) => !editingEvent?.participants?.some(ep => ep.id === p.id)}
                      searchThreshold={8}
                      className="flex-1"
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name={`participants.${index}.role`}
                  render={({ field }) => (
                    <select
                      value={field.value || ''}
                      aria-label="Rolle auswählen"
                      onChange={async (e) => {
                        const newRole = e.target.value;
                        if (isNew) {
                          // For new events, update the form state
                          const updatedParticipants = [...(editingEvent?.participants || [])];
                          updatedParticipants[index] = {
                            ...updatedParticipants[index],
                            role: newRole
                          };
                          setEditingEvent({...editingEvent, participants: updatedParticipants});
                        } else {
                          // For editing, update participant role in database
                          if (participantId && editingEvent?.id) {
                            updateParticipantRole.mutate({
                              entryId: editingEvent.id,
                              participantId: participantId,
                              role: newRole
                            });
                          }
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
                <button
                  type="button"
                  onClick={() => removeParticipant(editingEvent, participantId)}
                  className="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            );
          })}
              
              {/* Show message when no participants are assigned */}
              {(!editingEvent?.assignments && !editingEvent?.participants) && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  <p>Noch keine Teilnehmer*innen zugewiesen</p>
                  <p className="text-sm">Klicken Sie auf "Teilnehmer*innen hinzufügen" um welche hinzuzufügen</p>
                </div>
              )}
            </div>
          )}
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
          
        {linkFields.map((link, index) => (
          <div key={`timetable-link-${link.id || link.slug || `new-${index}`}`} className="flex items-center space-x-3 mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              {isNew ? (
                <>
                  <select
                    {...form.register(`additionalLinks.${index}.type`)}
                    aria-label="Link-Typ"
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    {linkTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Titel"
                    aria-label="Link-Titel"
                    {...form.register(`additionalLinks.${index}.title`)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="url"
                    placeholder="URL"
                    aria-label="Link-URL"
                    {...form.register(`additionalLinks.${index}.url`)}
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
                    {...form.register(`additionalLinks.${index}.type`)}
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    {linkTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Titel"
                    {...form.register(`additionalLinks.${index}.title`)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="url"
                    placeholder="URL"
                    {...form.register(`additionalLinks.${index}.url`)}
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
              aria-label="Interne Verlinkung"
              {...form.register('internalLink')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="https://example.com/custom-page (überschreibt die Standard-Detailseite)"
            />
          ) : (
            <input
              type="url"
              aria-label="Interne Verlinkung"
              {...form.register('internalLink')}
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
            onClick={() => isNew ? setIsCreating(false) : setEditingEvent(null)}
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
          onClick={() => setIsCreating(true)}
          disabled={isCreating}
          className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isCreating ? 'Erstelle...' : 'Event hinzufügen'}
        </button>
      </div>

      {/* Date Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nach Datum filtern</label>
        <select
          value={selectedDate}
          aria-label="Nach Datum filtern"
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full md:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        >
          <option value="all">Alle Daten</option>
          {getUniqueDates().map(date => (
            <option key={date} value={date}>{formatDate(date)}</option>
          ))}
        </select>
      </div>

      {/* Add Form - Inline */}
      {isCreating && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 shadow-sm border border-blue-200 dark:border-blue-700">
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
                  {event.assignments && event.assignments.length > 0 && (
                    <div className="mb-3">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Teilnehmer*innen:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {event.assignments.map((participant, idx) => (
                          <span key={`participant-${participant.participant_id || participant.id || idx}`} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {participant.participant_name} ({participant.role})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Links Preview */}
                  {event.additional_links && event.additional_links.length > 0 && (
                    <div className="mb-3">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Links:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {event.additional_links.map((link, idx) => (
                          <span key={`link-${link.id || link.title || idx}`} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
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
