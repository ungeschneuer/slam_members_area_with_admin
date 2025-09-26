import React, { useState, useEffect } from 'react';
import hybridDataService from '../../services/hybridDataService.js';
import LoadingSpinner from '../LoadingSpinner';

export default function AdminTimetable() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);
  const [participants, setParticipants] = useState([]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [eventsData, participantsData] = await Promise.all([
          hybridDataService.getData('timetable'),
          hybridDataService.getData('participants')
        ]);
        setEvents(eventsData || []);
        setParticipants(participantsData || []);
      } catch (err) {
        setError(err.message);
        console.error('Error loading timetable data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to data changes
    const unsubscribe = hybridDataService.subscribe((dataType) => {
      if (dataType === 'timetable' || dataType === 'participants') {
        console.log('AdminTimetable: Data changed, refreshing...');
        loadData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const [editingEvent, setEditingEvent] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState('all');

  const [newEvent, setNewEvent] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    location: '',
    type: 'competition',
    description: '',
    detailedDescription: '',
    additionalLinks: [],
    participants: [],
    status: 'upcoming'
  });

  const eventTypes = [
    { value: 'registration', label: 'Anmeldung', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: '📝' },
    { value: 'opening', label: 'Eröffnung', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: '🎭' },
    { value: 'competition', label: 'Wettbewerb', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: '🏆' },
    { value: 'break', label: 'Pause', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: '☕' },
    { value: 'dinner', label: 'Abendessen', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: '🍽️' },
    { value: 'celebration', label: 'Feier', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: '🎉' }
  ];

  const statuses = [
    { value: 'upcoming', label: 'Anstehend', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
    { value: 'active', label: 'Aktiv', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    { value: 'completed', label: 'Abgeschlossen', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    { value: 'cancelled', label: 'Abgesagt', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
  ];

  const linkTypes = [
    { value: 'form', label: 'Formular', icon: '📝' },
    { value: 'document', label: 'Dokument', icon: '📄' },
    { value: 'list', label: 'Liste', icon: '📋' },
    { value: 'stream', label: 'Live-Stream', icon: '📺' },
    { value: 'menu', label: 'Speisekarte', icon: '🍽️' },
    { value: 'info', label: 'Information', icon: 'ℹ️' },
    { value: 'ticket', label: 'Tickets', icon: '🎫' }
  ];

  const participantRoles = [
    'Moderator',
    'Jury-Mitglied',
    'Teilnehmer',
    'Organisator',
    'Techniker',
    'Catering',
    'Security',
    'Photograph',
    'Videograf'
  ];

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await hybridDataService.createTimetable(newEvent);
      setNewEvent({
        title: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '11:00',
        location: '',
        type: 'competition',
        description: '',
        detailedDescription: '',
        additionalLinks: [],
        participants: [],
        status: 'upcoming'
      });
      setShowAddForm(false);
      // Data will be automatically updated via WebSocket
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await hybridDataService.updateTimetable(editingEvent.id, editingEvent);
      setEditingEvent(null);
      // Data will be automatically updated via WebSocket
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bist du sicher, dass du dieses Event löschen möchtest?')) {
      try {
        await hybridDataService.deleteTimetable(id);
        // Data will be automatically updated via WebSocket
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
        await hybridDataService.updateTimetable(updatedEvents[i].id, updatedEvents[i]);
      }
      setEvents(updatedEvents);
    } catch (error) {
      console.error('Error moving event:', error);
    }
  };

  // Participant management functions
  const addParticipant = (event, participantId, role) => {
    const participant = participants.find(p => p.id === parseInt(participantId));
    if (!participant) return;

    const newParticipant = {
      participantId: parseInt(participantId),
      name: participant.name,
      role: role
    };

    const updatedParticipants = [...(event.participants || []), newParticipant];
    
    if (editingEvent && editingEvent.id === event.id) {
      setEditingEvent({ ...editingEvent, participants: updatedParticipants });
    } else {
      setNewEvent({ ...newEvent, participants: updatedParticipants });
    }
  };

  const removeParticipant = (event, participantId) => {
    const updatedParticipants = (event.participants || []).filter(p => p.participantId !== parseInt(participantId));
    
    if (editingEvent && editingEvent.id === event.id) {
      setEditingEvent({ ...editingEvent, participants: updatedParticipants });
    } else {
      setNewEvent({ ...newEvent, participants: updatedParticipants });
    }
  };

  // Link management functions
  const addLink = (event) => {
    const newLink = {
      title: '',
      url: '',
      type: 'info'
    };

    if (editingEvent && editingEvent.id === event.id) {
      setEditingEvent({ 
        ...editingEvent, 
        additionalLinks: [...(editingEvent.additionalLinks || []), newLink] 
      });
    } else {
      setNewEvent({ 
        ...newEvent, 
        additionalLinks: [...(newEvent.additionalLinks || []), newLink] 
      });
    }
  };

  const updateLink = (event, index, field, value) => {
    const updatedLinks = [...(event.additionalLinks || [])];
    updatedLinks[index] = { ...updatedLinks[index], [field]: value };

    if (editingEvent && editingEvent.id === event.id) {
      setEditingEvent({ ...editingEvent, additionalLinks: updatedLinks });
    } else {
      setNewEvent({ ...newEvent, additionalLinks: updatedLinks });
    }
  };

  const removeLink = (event, index) => {
    const updatedLinks = (event.additionalLinks || []).filter((_, i) => i !== index);

    if (editingEvent && editingEvent.id === event.id) {
      setEditingEvent({ ...editingEvent, additionalLinks: updatedLinks });
    } else {
      setNewEvent({ ...newEvent, additionalLinks: updatedLinks });
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
    const assignedParticipantIds = (event.participants || []).map(p => p.participantId);
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

    return (
      <form onSubmit={isNew ? handleAdd : handleUpdate} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Titel</label>
            <input
              type="text"
              required
              value={currentEvent.title}
              onChange={(e) => setCurrentEvent({...currentEvent, title: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ort</label>
            <input
              type="text"
              required
              value={currentEvent.location}
              onChange={(e) => setCurrentEvent({...currentEvent, location: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Datum</label>
            <input
              type="date"
              required
              value={currentEvent.date}
              onChange={(e) => setCurrentEvent({...currentEvent, date: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Startzeit</label>
              <input
                type="time"
                required
                value={currentEvent.startTime}
                onChange={(e) => setCurrentEvent({...currentEvent, startTime: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Endzeit</label>
              <input
                type="time"
                required
                value={currentEvent.endTime}
                onChange={(e) => setCurrentEvent({...currentEvent, endTime: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Typ</label>
            <select
              required
              value={currentEvent.type}
              onChange={(e) => setCurrentEvent({...currentEvent, type: e.target.value})}
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
              required
              value={currentEvent.status}
              onChange={(e) => setCurrentEvent({...currentEvent, status: e.target.value})}
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kurze Beschreibung</label>
            <textarea
              required
              rows={3}
              value={currentEvent.description}
              onChange={(e) => setCurrentEvent({...currentEvent, description: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Kurze Beschreibung des Events..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Detaillierte Beschreibung</label>
            <textarea
              rows={5}
              value={currentEvent.detailedDescription || ''}
              onChange={(e) => setCurrentEvent({...currentEvent, detailedDescription: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Detaillierte Beschreibung mit allen wichtigen Informationen..."
            />
          </div>
        </div>

        {/* Participants */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Teilnehmer & Rollen</h3>
            <button
              type="button"
              onClick={() => addParticipant(currentEvent, participants[0]?.id, participantRoles[0])}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Teilnehmer hinzufügen
            </button>
          </div>
          
          {(currentEvent.participants || []).map((participant, index) => (
            <div key={index} className="flex items-center space-x-3 mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <select
                value={participant.participantId}
                onChange={(e) => {
                  const selectedParticipant = participants.find(p => p.id === parseInt(e.target.value));
                  const updatedParticipants = [...(currentEvent.participants || [])];
                  updatedParticipants[index] = {
                    ...updatedParticipants[index],
                    participantId: parseInt(e.target.value),
                    name: selectedParticipant?.name || ''
                  };
                  setCurrentEvent({...currentEvent, participants: updatedParticipants});
                }}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Teilnehmer auswählen...</option>
                {getAvailableParticipants(currentEvent).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                value={participant.role}
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
              <button
                type="button"
                onClick={() => removeParticipant(currentEvent, participant.participantId)}
                className="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Additional Links */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Zusätzliche Links</h3>
            <button
              type="button"
              onClick={() => addLink(currentEvent)}
              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              Link hinzufügen
            </button>
          </div>
          
          {(currentEvent.additionalLinks || []).map((link, index) => (
            <div key={index} className="flex items-center space-x-3 mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <select
                value={link.type}
                onChange={(e) => updateLink(currentEvent, index, 'type', e.target.value)}
                className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {linkTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Titel"
                value={link.title}
                onChange={(e) => updateLink(currentEvent, index, 'title', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <input
                type="url"
                placeholder="URL"
                value={link.url}
                onChange={(e) => updateLink(currentEvent, index, 'url', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={() => removeLink(currentEvent, index)}
                className="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                ✕
              </button>
            </div>
          ))}
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
        {filteredEvents.map((event, index) => (
          <div key={event.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
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
                      <span className="font-medium">Zeit:</span> {formatTime(event.startTime)} - {formatTime(event.endTime)}
                    </div>
                    <div>
                      <span className="font-medium">Ort:</span> {event.location}
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">{event.description}</p>
                  
                  {/* Participants Preview */}
                  {event.participants && event.participants.length > 0 && (
                    <div className="mb-3">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Teilnehmer:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {event.participants.map((participant, idx) => (
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
        ))}
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
