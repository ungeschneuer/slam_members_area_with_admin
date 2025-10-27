import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTimetable, useParticipants, useCreateTimetableEvent, useUpdateTimetableEvent, useDeleteTimetableEvent, useAddTimetableParticipant, useRemoveTimetableParticipant } from '../../hooks/index.js';
import LoadingSpinner from '../LoadingSpinner.jsx';
import ErrorBoundary from '../ErrorBoundary.jsx';
import { useFieldArray, Controller } from 'react-hook-form';
import TextareaInput from '../forms/TextareaInput.jsx';
import { useFormManager } from '../../hooks/useFormManager.js';
import { createValidationSchema, getDefaultValues } from '../../../shared/schemas/validationFactory.js';
import { getRoleOptions, getStatusOptions } from '../../utils/adminFormSchemas.js';
import { generateSlug } from '../../utils/slugUtils.js';
import { getSlugConfig } from '../../../server/config/slugConfig.js';
import { getRoundStatusColor } from '../../utils/categoryTranslations.js';
import ParticipantDropdown from './ParticipantDropdown.jsx';
import { ADMIN_PARTICIPANTS_LIMIT } from '../../config/api.js';
import { formatDateForDisplay, isValidDateString } from '../../utils/dateUtils.js';

export default function AdminTimetable() {
  const { data: eventsData, isLoading: loadingEvents, error: errorEvents } = useTimetable({}, true); // isAdmin = true
  const { data: participantsData, isLoading: loadingParticipants, error: errorParticipants } = useParticipants({ limit: 10000 }, true); // isAdmin = true, increased limit to ensure all participants load
  const createEvent = useCreateTimetableEvent();
  const updateEvent = useUpdateTimetableEvent();
  const deleteEvent = useDeleteTimetableEvent();
  const addParticipantMutation = useAddTimetableParticipant();
  const removeParticipantMutation = useRemoveTimetableParticipant();
  const queryClient = useQueryClient();
  
  const loading = loadingEvents || loadingParticipants;
  const error = errorEvents || errorParticipants;
  const events = useMemo(() => Array.isArray(eventsData) ? eventsData : [], [eventsData]);
  const availableParticipants = useMemo(() => {
    // Handle the nested data structure from useParticipants
    const participantsArray = participantsData?.data || [];
    return Array.isArray(participantsArray) ? participantsArray : [];
  }, [participantsData]);

  // Live data handled by useLiveData

  // Consolidated modal state management to prevent invalid states
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: null, // 'create' or 'edit'
    eventId: null
  });
  
  // Derived state for backward compatibility with error handling and race condition prevention
  const editingEvent = useMemo(() => {
    if (modalState.mode !== 'edit' || !modalState.eventId) {
      return null;
    }
    
    // Validate that eventsData exists and is an array
    if (!eventsData || !Array.isArray(eventsData)) {
      console.error('AdminTimetable: eventsData is not available or not an array', { eventsData });
      return null;
    }
    
    // Use a more robust find with type checking to prevent race conditions
    const event = eventsData.find(event => {
      // Ensure both IDs are numbers for reliable comparison
      const eventId = typeof event?.id === 'number' ? event.id : parseInt(event?.id);
      const modalEventId = typeof modalState.eventId === 'number' ? modalState.eventId : parseInt(modalState.eventId);
      return eventId === modalEventId;
    });
    
    if (!event) {
      console.warn('AdminTimetable: Event not found for ID', modalState.eventId, 'Available IDs:', eventsData.map(e => e.id));
    }
    
    return event || null;
  }, [modalState.mode, modalState.eventId, eventsData]);
  
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedParticipant, setSelectedParticipant] = useState('');
  const [participantAssignments, setParticipantAssignments] = useState([]);
  
  const handleAddParticipant = () => {
    if (!selectedParticipant) return;
    
    const participantData = availableParticipants.find(p => p.id === parseInt(selectedParticipant));
    if (!participantData) return;
    
    // Check for duplicates
    const isDuplicate = participantAssignments.some(p => p.participantId === parseInt(selectedParticipant));
    if (isDuplicate) {
      alert('Diese*r Teilnehmer*in ist bereits zugewiesen.');
      setSelectedParticipant('');
      return;
    }
    
    // Simple state update - like rounds line 134-140
    setParticipantAssignments([...participantAssignments, {
      participantId: parseInt(selectedParticipant),
      name: participantData.name,
      role: 'Teilnehmer*in'
    }]);
    
    setSelectedParticipant('');
  };
  
  // State transition validation utility
  const isValidStateTransition = useCallback((currentState, newState) => {
    // Prevent invalid transitions
    if (currentState.isOpen && newState.isOpen && currentState.mode !== newState.mode) {
      console.warn('AdminTimetable: Attempting to change mode while modal is open', {
        current: currentState.mode,
        new: newState.mode
      });
      return false;
    }
    
    // Prevent opening edit mode without valid eventId
    if (newState.mode === 'edit' && !newState.eventId) {
      console.error('AdminTimetable: Cannot open edit mode without eventId');
      return false;
    }
    
    return true;
  }, []);

  // Safe modal state management with validation and state transition checks
  const setModalStateSafe = useCallback((newStateOrUpdater) => {
    setModalState((prevModalState) => {
      try {
        const newState = typeof newStateOrUpdater === 'function' 
          ? newStateOrUpdater(prevModalState)
          : newStateOrUpdater;
        
        if (typeof newState !== 'object' || newState === null) {
          console.error('AdminTimetable: Invalid modal state object', newState);
          return prevModalState;
        }
        
        const { isOpen, mode, eventId } = newState;
        
        if (typeof isOpen !== 'boolean') {
          console.error('AdminTimetable: Invalid isOpen value', isOpen);
          return prevModalState;
        }
        
        if (mode !== null && !['create', 'edit'].includes(mode)) {
          console.error('AdminTimetable: Invalid mode value', mode);
          return prevModalState;
        }
        
        if (mode === 'edit' && (!eventId || typeof eventId !== 'number')) {
          console.error('AdminTimetable: Invalid eventId for edit mode', eventId);
          return prevModalState;
        }
        
        if (mode === 'create' && eventId !== null) {
          console.error('AdminTimetable: eventId should be null for create mode', eventId);
          return prevModalState;
        }
        
        if (!isValidStateTransition(prevModalState, newState)) {
          return prevModalState;
        }
        
        return newState;
      } catch (error) {
        console.error('AdminTimetable: Error setting modal state', error, newStateOrUpdater);
        return prevModalState;
      }
    });
  }, [isValidStateTransition]);
  
  // Accessibility refs
  const modalRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const lastFocusableRef = useRef(null);

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
      setModalStateSafe({ isOpen: false, mode: null, eventId: null });
    }
  }, [createEvent?.isSuccess, setModalStateSafe]);

  // Reset form when switching to create mode - use requestAnimationFrame for better timing
  useEffect(() => {
    if (modalState.mode === 'create') {
      // Use requestAnimationFrame to ensure this runs after DOM updates
      const frameId = requestAnimationFrame(() => {
        form.reset(getDefaultValues('timetable'));
        setParticipantAssignments([]);
      });
      
      return () => cancelAnimationFrame(frameId);
    }
  }, [modalState.mode, form]);

  // Accessibility: Focus management for modal - use requestAnimationFrame for better timing
  useEffect(() => {
    if (modalState.isOpen) {
      const focusModal = () => {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements && focusableElements.length > 0) {
          firstFocusableRef.current = focusableElements[0];
          lastFocusableRef.current = focusableElements[focusableElements.length - 1];
          firstFocusableRef.current?.focus();
        }
      };
      
      // Use requestAnimationFrame to ensure DOM is ready
      const frameId = requestAnimationFrame(focusModal);
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        cancelAnimationFrame(frameId);
        // Restore body scroll when modal closes
        document.body.style.overflow = 'unset';
      };
    }
  }, [modalState.isOpen]);

  // Accessibility: Handle escape key and focus trap
  const handleModalKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCloseModal();
    } else if (e.key === 'Tab') {
      // Focus trap
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusableRef.current) {
          e.preventDefault();
          lastFocusableRef.current?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusableRef.current) {
          e.preventDefault();
          firstFocusableRef.current?.focus();
        }
      }
    }
  };

  // Close modal handler with focus restoration
  const handleCloseModal = useCallback(() => {
    try {
      // Store reference to the element that opened the modal for focus restoration
      const previouslyFocusedElement = document.activeElement;
      
      setModalStateSafe((prev) => {
        // Check if we're in create mode and reset form
        if (prev.mode === 'create') {
          form.reset(getDefaultValues('timetable'));
          setParticipantAssignments([]);
        }
        
        // Return new closed state
        return { isOpen: false, mode: null, eventId: null };
      });
      
      // Restore focus to the element that opened the modal
      requestAnimationFrame(() => {
        if (previouslyFocusedElement && previouslyFocusedElement !== document.body) {
          previouslyFocusedElement.focus();
        }
      });
    } catch (error) {
      console.error('AdminTimetable: Error closing modal', error);
    }
  }, [form, setModalStateSafe]);

  // Get slug configuration for timetable
  const slugConfig = getSlugConfig('timetable');

  // Auto-generate slug when title changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'title' && value?.title) {
        const slug = generateSlug(value.title, slugConfig);
        form.setValue('slug', slug, { shouldDirty: true, shouldValidate: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [slugConfig]);

  // Populate form when editing event with error handling
  useEffect(() => {
    if (!modalState.isOpen || !editingEvent) return;
    
    requestAnimationFrame(() => {
      try {
        // Validate editingEvent structure
        if (!editingEvent.id) {
          console.error('AdminTimetable: editingEvent missing required id field', editingEvent);
          return;
        }
        
        // Map participants from the event to the form format with validation
        const formParticipants = (editingEvent.assignments || [])
          .filter(assignment => {
            // Enhanced validation
            if (!assignment || typeof assignment !== 'object') {
              console.warn('AdminTimetable: Invalid assignment object', assignment);
              return false;
            }
            return assignment.participant_id && assignment.participant_name;
          })
          .map(assignment => ({
            participantId: assignment.participant_id,
            name: assignment.participant_name,
            role: assignment.role || 'Teilnehmer*in' // Standardized fallback
          }));
        
        // Validate form data before reset
        const formData = {
          ...editingEvent,
          endTime: editingEvent.end_time,
          detailedDescription: editingEvent.detailed_description,
          additionalLinks: editingEvent.additional_links || [],
          participants: formParticipants
        };
        
        // Validate required fields
        if (!formData.title || !formData.date || !formData.time) {
          console.error('AdminTimetable: Missing required form fields', {
            title: formData.title,
            date: formData.date,
            time: formData.time
          });
          return;
        }
        
        form.reset(formData);
        
        // Load participants into state - transform from API format to form format
        const transformedAssignments = (formData.assignments || []).map(assignment => ({
          participantId: assignment.participant_id,
          name: assignment.participant_name,
          role: assignment.role || 'Teilnehmer*in'
        }));
        setParticipantAssignments(transformedAssignments);
      } catch (error) {
        console.error('AdminTimetable: Error populating form for editing event', error, editingEvent);
      }
    });
  }, [editingEvent, form, modalState.isOpen]);

  // Field arrays for form management
  const { fields: linkFields, append: appendLink, remove: removeLinkRHF, update: updateLinkRHF } = useFieldArray({ control: form.control, name: 'additionalLinks' });

  const eventTypes = [
    { value: 'team-round', label: 'Team-Runde', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: '👥' },
    { value: 'individual-round', label: 'Einzel-Runde', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: '👤' },
    { value: 'workshop', label: 'Workshop', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: '🎓' },
    { value: 'fun', label: 'Fun', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: '🎉' },
    { value: 'aftershow', label: 'Aftershow', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: '🎭' },
    { value: 'panel', label: 'Panel', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: '🎤' },
    { value: 'networking', label: 'Netzwerktreffen', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200', icon: '🤝' }
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

  // Direct field mapping - convert camelCase form data to snake_case API format
  const mapFormToAPI = (formData) => {
    // Transform participants to API format
    const transformedParticipants = (participantAssignments || []).map(participant => ({
      participant_id: participant.participantId,
      participant_name: participant.name,
      role: participant.role || 'Teilnehmer*in'
    }));

    return {
      title: formData.title,
      description: formData.description,
      detailed_description: formData.detailedDescription,
      location: formData.location,
      date: formData.date ? new Date(formData.date + 'T00:00:00.000Z').toISOString() : null,
      time: formData.time,
      end_time: formData.endTime || null, // Convert empty string to null for database
      type: formData.type,
      status: formData.status || 'confirmed',
      additional_links: Array.isArray(formData.additionalLinks) ? formData.additionalLinks : [],
      slug: formData.slug,
      participants: transformedParticipants
    };
  };

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
      case 'panel':
        return {
          cardBg: 'bg-orange-100 dark:bg-orange-900/40',
          cardBorder: 'border-orange-300 dark:border-orange-700'
        };
      case 'networking':
        return {
          cardBg: 'bg-teal-100 dark:bg-teal-900/40',
          cardBorder: 'border-teal-300 dark:border-teal-700'
        };
      default:
        return {
          cardBg: 'bg-gray-100 dark:bg-gray-800',
          cardBorder: 'border-gray-300 dark:border-gray-600'
        };
    }
  };


  // Wrapper function to generate slug before form submission
  const handleFormSubmit = (data) => {
    // Generate slug if not provided
    if (!data.slug && data.title) {
      data.slug = generateSlug(data.title, slugConfig);
    }
    
    // Merge participants - EXACTLY like rounds
    const submitData = {
      ...data,
      participants: participantAssignments
    };
    
    if (modalState.mode === 'create') {
      return handleAdd(submitData);
    } else {
      return handleUpdate(submitData);
    }
  };

  // Expose React Hook Form methods to window object for testing (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      window.testForm = {
        setValue: form.setValue,
        getValues: form.getValues,
        trigger: form.trigger,
        reset: form.reset,
        handleSubmit: form.handleSubmit,
        formState: form.formState
      };
      
      // Create testing utilities
      window.testFormUtils = {
        fillForm: (data) => {
          console.log('Filling form with data:', data);
          Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              form.setValue(key, value, { shouldValidate: true });
            }
          });
          form.trigger();
          console.log('Form filled, current values:', form.getValues());
          console.log('Form errors:', form.formState.errors);
          console.log('Form valid:', form.formState.isValid);
        },
        
        getFormState: () => ({
          values: form.getValues(),
          errors: form.formState.errors,
          isValid: form.formState.isValid,
          isDirty: form.formState.isDirty,
          isSubmitting: form.formState.isSubmitting,
          touchedFields: form.formState.touchedFields,
          dirtyFields: form.formState.dirtyFields
        }),
        
        submitForm: () => {
          console.log('Attempting form submission...');
          console.log('Pre-submission state:', window.testFormUtils.getFormState());
          return form.handleSubmit((data) => {
            console.log('Form submitted with data:', data);
            // Trigger the actual handleAdd function
            return handleAdd(data);
          })();
        },
        
        submitFormReal: () => {
          console.log('Attempting real form submission...');
          const formData = form.getValues();
          console.log('Form data for submission:', formData);
          return handleAdd(formData);
        },
        
        addParticipant: (participantIdOrName, name) => {
          // If only one parameter is provided, treat it as a name and find the participant
          let participantId, participantName;
          if (name === undefined) {
            // Only name provided, find participant by name
            const participant = availableParticipants.find(p => p.name === participantIdOrName);
            if (!participant) {
              return { success: false, error: `Participant not found: ${participantIdOrName}` };
            }
            participantId = participant.id;
            participantName = participant.name;
          } else {
            // Both ID and name provided
            participantId = parseInt(participantIdOrName);
            participantName = name;
          }
          
          const newParticipant = {
            participantId: participantId,
            name: participantName,
            role: 'Teilnehmer*in'
          };
          setParticipantAssignments(prev => [...prev, newParticipant]);
          return { success: true, participantId, name: participantName };
        },
        
        removeParticipant: (index) => {
          setParticipantAssignments(prev => prev.filter((_, i) => i !== index));
          return { success: true, index };
        },
        
        getParticipants: () => participantAssignments,
        availableParticipants: availableParticipants,
        
        debugForm: () => {
          console.log('=== FORM DEBUG INFO ===');
          console.log('Values:', form.getValues());
          console.log('Errors:', form.formState.errors);
          console.log('Valid:', form.formState.isValid);
          console.log('Dirty:', form.formState.isDirty);
          console.log('Touched:', form.formState.touchedFields);
          console.log('Dirty Fields:', form.formState.dirtyFields);
          console.log('========================');
        },
        
        testCompleteWorkflow: async () => {
          console.log('Testing complete event creation workflow...');
          
          try {
            // 1. Fill form
            const formData = {
              title: 'Complete Workflow Test Event',
              slug: 'complete-workflow-test-event',
              description: 'Testing complete workflow with React Hook Form',
              location: 'Berlin',
              date: '2025-12-31',
              time: '19:00',
              endTime: '21:00',
              type: 'workshop',
              status: 'confirmed'
            };
            
            window.testFormUtils.fillForm(formData);
            
            // 2. Add participants
            window.testFormUtils.addParticipant(1, 'Test Participant 1');
            window.testFormUtils.addParticipant(2, 'Test Participant 2');
            window.testFormUtils.addParticipant(3, 'Test Participant 3');
            
            // 3. Verify form state
            const formState = window.testFormUtils.getFormState();
            console.log('Form state before submission:', formState);
            
            // 4. Submit form
            const result = await window.testFormUtils.submitFormReal();
            
            // 5. Return result
            console.log('Complete workflow test result:', result);
            return { success: true, result, formState };
            
          } catch (error) {
            console.error('Complete workflow test failed:', error);
            return { success: false, error: error.message };
          }
        }
      };
      
      console.log('React Hook Form testing utilities exposed to window.testFormUtils');
    }
  }, [form, participantAssignments, setParticipantAssignments]);

  const handleAdd = async (data) => {
    try {
      const apiData = mapFormToAPI(data);
      const createdEvent = await createEvent.mutateAsync(apiData);
      
      // Save participants sequentially with error tracking
      if (data.participants && data.participants.length > 0 && createdEvent?.data?.id) {
        const participantErrors = [];
        
        for (const participant of data.participants) {
          if (participant.participantId) {
            try {
              await addParticipantMutation.mutateAsync({
                entryId: createdEvent.data.id,
                participantId: participant.participantId,
                role: participant.role || 'Teilnehmer*in'
              });
            } catch (participantError) {
              console.error('Error adding participant:', participantError);
              participantErrors.push(participant.name || `ID ${participant.participantId}`);
            }
          }
        }
        
        // Show error message if any participants failed
        if (participantErrors.length > 0) {
          alert(`Event erstellt, aber folgende Teilnehmer*innen konnten nicht hinzugefügt werden: ${participantErrors.join(', ')}`);
        }
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['timetable']);
      
      form.reset();
      setModalStateSafe({ isOpen: false, mode: null, eventId: null });
    } catch (error) {
      console.error('Error creating event:', error);
      // Error is handled by React Query error state
    }
  };

  const handleUpdate = async (data) => {
    try {
      const apiData = mapFormToAPI(data);
      await updateEvent.mutateAsync({ id: editingEvent.id, ...apiData });
      
      // Sync participants sequentially for better error handling
      if (editingEvent?.id) {
        const currentParticipants = editingEvent.assignments || [];
        const newParticipants = data.participants || [];
        const errors = [];
        
        // Remove participants no longer selected
        for (const current of currentParticipants) {
          const stillSelected = newParticipants.some(p => p.participantId === current.participant_id);
          if (!stillSelected && current.participant_id) {
            try {
              await removeParticipantMutation.mutateAsync({
                entryId: editingEvent.id,
                participantId: current.participant_id
              });
            } catch (error) {
              console.error('Error removing participant:', error);
              errors.push(`Entfernen: ${current.participant_name}`);
            }
          }
        }
        
        // Add new participants
        for (const participant of newParticipants) {
          if (participant.participantId) {
            const alreadyExists = currentParticipants.some(p => p.participant_id === participant.participantId);
            if (!alreadyExists) {
              try {
                await addParticipantMutation.mutateAsync({
                  entryId: editingEvent.id,
                  participantId: participant.participantId,
                  role: participant.role || 'Teilnehmer*in'
                });
              } catch (error) {
                console.error('Error adding participant:', error);
                errors.push(`Hinzufügen: ${participant.name}`);
              }
            }
          }
        }
        
        // Show errors if any
        if (errors.length > 0) {
          alert(`Event aktualisiert, aber Fehler bei Teilnehmer*innen: ${errors.join(', ')}`);
        }
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['timetable']);
      
      form.reset();
      setModalStateSafe({ isOpen: false, mode: null, eventId: null });
    } catch (error) {
      console.error('Error updating event:', error);
      // Error is handled by React Query error state
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bist du sicher, dass du dieses Event löschen möchtest?')) {
      try {
        await deleteEvent.mutateAsync(id);
      } catch (error) {
        // Error deleting event - handled by error state
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
      // Error moving event - handled by error state
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

  const removeParticipant = (index) => {
    setParticipantAssignments(prev => prev.filter((_, i) => i !== index));
  };

  // Link management functions
  const addLink = (event) => {
    const newLink = { title: '', url: '', type: 'info' };

    if (editingEvent && editingEvent.id === event.id) {
      const currentLinks = form.getValues('additionalLinks') || [];
      form.setValue('additionalLinks', [...currentLinks, newLink]);
    } else {
      appendLink(newLink);
    }
  };

  const updateLink = (event, index, field, value) => {
    if (editingEvent && editingEvent.id === event.id) {
      const currentLinks = form.getValues('additionalLinks') || [];
      const updatedLinks = [...currentLinks];
      updatedLinks[index] = { ...updatedLinks[index], [field]: value };
      form.setValue('additionalLinks', updatedLinks);
    } else {
      const current = form.getValues('additionalLinks');
      const updated = [...current];
      updated[index] = { ...updated[index], [field]: value };
      updateLinkRHF(index, updated[index]);
    }
  };

  const removeLink = (event, index) => {
    if (editingEvent && editingEvent.id === event.id) {
      const currentLinks = form.getValues('additionalLinks') || [];
      const updatedLinks = currentLinks.filter((_, i) => i !== index);
      form.setValue('additionalLinks', updatedLinks);
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

  const renderEventForm = (event) => {
    const currentForm = form;
    const currentEvent = modalState.mode === 'create' ? null : editingEvent;

      return (
      <form onSubmit={form.handleSubmit(handleFormSubmit)}>
        <div className="space-y-6">
        
        {/* Form Validation Errors */}
        {Object.keys(form.formState.errors).length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4" role="alert" aria-live="polite">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
              Bitte korrigieren Sie die folgenden Fehler:
            </h3>
            <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
              {Object.entries(form.formState.errors).map(([field, error]) => (
                <li key={field}>
                  <span className="font-medium">{field}:</span> {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Component Error Display */}
        {componentError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4" role="alert" aria-live="polite">
            <p className="text-sm text-red-700 dark:text-red-300">
              {componentError.message || componentError}
            </p>
          </div>
        )}
        
        {/* Helper text for required fields */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Felder mit <span className="text-red-500">*</span> sind Pflichtfelder
        </p>
        
        {/* Basic Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Titel <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              aria-label="Titel"
              aria-required="true"
              {...form.register('title')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Slug (URL-freundlich) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              aria-label="Slug"
              aria-required="true"
              {...form.register('slug')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Wird automatisch generiert"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Wird automatisch aus dem Titel generiert, kann aber manuell angepasst werden</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ort <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              aria-label="Ort"
              aria-required="true"
              {...form.register('location')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Datum <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              aria-label="Datum"
              aria-required="true"
              {...form.register('date')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Startzeit <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                aria-label="Startzeit"
                aria-required="true"
                {...form.register('time')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Endzeit</label>
              <input
                type="time"
                aria-label="Endzeit"
                {...form.register('endTime')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Typ</label>
            <select
              aria-label="Typ"
              {...form.register('type')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              {eventTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
            <select
              aria-label="Status"
              {...form.register('status')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              {statuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
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
        {/* Participants Section */}
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
                  onClick={handleAddParticipant}
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
                      onClick={() => removeParticipant(index)}
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

        {/* Additional Links */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Zusätzliche Links</h3>
            <button
              type="button"
              onClick={() => appendLink({ type: linkTypes[0]?.value || '', title: '', url: '' })}
              className="min-h-[44px] px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors touch-manipulation active:scale-95"
            >
              Link hinzufügen
            </button>
          </div>
          
        {linkFields.map((link, index) => (
          <div key={`timetable-link-${link.id || `new-${index}`}`} className="flex items-center space-x-3 mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
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
              onClick={() => removeLinkRHF(index)}
              className="min-h-[44px] min-w-[44px] px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 focus-contained rounded flex items-center justify-center touch-manipulation active:scale-95"
            >
              ✕
            </button>
          </div>
        ))}
        </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors touch-manipulation active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-describedby="submit-help"
          >
            {isSubmitting ? (
              <>
                <span aria-hidden="true">⏳</span>
                {modalState.mode === 'create' ? 'Erstelle...' : 'Speichere...'}
              </>
            ) : (
              modalState.mode === 'create' ? 'Event hinzufügen' : 'Änderungen speichern'
            )}
          </button>
          <div id="submit-help" className="sr-only">
            {isSubmitting ? 'Formular wird verarbeitet' : 'Speichert die Event-Daten'}
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            disabled={isSubmitting}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors touch-manipulation active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
          onClick={() => setModalStateSafe({ isOpen: true, mode: 'create', eventId: null })}
          disabled={modalState.isOpen}
          className="mt-4 sm:mt-0 w-full sm:w-auto min-h-[44px] btn-primary disabled:opacity-50 touch-manipulation active:scale-95"
        >
          {modalState.mode === 'create' ? 'Erstelle...' : 'Event hinzufügen'}
        </button>
      </div>

      {/* Date Filter */}
      <div className="card-base p-6">
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


      {/* Events List */}
      <div className="space-y-4">
        {filteredEvents.map((event, index) => {
          const colors = getCategoryColors(event.type);
          return (
          <div key={event.id} className={`${colors.cardBg} rounded-xl shadow-sm border ${colors.cardBorder}`}>
            <div className="p-6">
              {/* Header with title and badges */}
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">
                  {eventTypes.find(t => t.value === event.type)?.icon || '📅'}
                </span>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">{event.title}</h3>
                <div className="flex gap-2">
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
              </div>

              {/* Event details */}
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
                <div className="mb-4">
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

              {/* Action Buttons - Now properly contained within the card */}
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-200 dark:border-gray-600">
                {/* Move Up/Down Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMoveEvent(event.id, 'up')}
                    disabled={index === 0}
                    className="min-h-[44px] min-w-[44px] text-xs px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95"
                    title="Nach oben"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveEvent(event.id, 'down')}
                    disabled={index === filteredEvents.length - 1}
                    className="min-h-[44px] min-w-[44px] text-xs px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95"
                    title="Nach unten"
                  >
                    ↓
                  </button>
                </div>
                {/* Action Buttons */}
                <div className="flex gap-2 flex-1">
                  <button
                    onClick={() => setModalStateSafe({ isOpen: true, mode: 'edit', eventId: event.id })}
                    className="min-h-[44px] px-3 py-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 touch-manipulation active:scale-95 rounded text-sm flex-1 sm:flex-none"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="min-h-[44px] px-3 py-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 touch-manipulation active:scale-95 rounded text-sm flex-1 sm:flex-none"
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

      {/* Edit/Create Modal */}
      {modalState.isOpen && (
        <div 
          ref={modalRef}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
          onKeyDown={handleModalKeyDown}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            role="document"
          >
            <h2 id="modal-title" className="heading-secondary mb-4">
              {modalState.mode === 'create' ? 'Neues Event hinzufügen' : 'Event bearbeiten'}
            </h2>
            <div id="modal-description" className="sr-only">
              {modalState.mode === 'create' ? 'Formular zum Hinzufügen eines neuen Events zum Zeitplan' : 'Formular zum Bearbeiten eines bestehenden Events'}
            </div>
            <ErrorBoundary fallback={
              <div 
                className="text-red-600 p-4 border border-red-300 rounded-lg bg-red-50 dark:bg-red-900/20" 
                role="alert" 
                aria-live="assertive"
                aria-describedby="error-description"
              >
                <h3 className="font-medium mb-2">Fehler beim Laden des Formulars</h3>
                <p id="error-description">Bitte versuchen Sie es erneut oder laden Sie die Seite neu.</p>
              </div>
            }>
              {renderEventForm(editingEvent)}
            </ErrorBoundary>
          </div>
        </div>
      )}
    </div>
  );
}
