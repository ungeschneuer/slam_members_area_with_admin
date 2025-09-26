import React, { useState, useEffect } from 'react';
import hybridDataService from '../../services/hybridDataService.js';
import LoadingSpinner from '../LoadingSpinner.jsx';

export default function AdminRounds() {
  const [rounds, setRounds] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [selectedRound, setSelectedRound] = useState(null);

  const [newRound, setNewRound] = useState({
    title: '',
    startDateTime: '',
    endDateTime: '',
    location: '',
    address: '',
    description: '',
    afterPlayReport: '',
    competitionType: 'Einzelwettbewerb',
    crew: [],
    tournamentParticipants: [],
    groups: [],
    featureArtists: [],
    totalJuryMembers: 5,
    status: 'upcoming'
  });

  const [newGroup, setNewGroup] = useState({
    name: '',
    participants: [],
    order: [],
    juryScores: {},
    winners: []
  });

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

  const [crewSearchTerm, setCrewSearchTerm] = useState('');
  const [showCrewSearch, setShowCrewSearch] = useState(false);
  const [participantSearchTerm, setParticipantSearchTerm] = useState('');
  const [showParticipantSearch, setShowParticipantSearch] = useState(false);
  const [featureSearchTerm, setFeatureSearchTerm] = useState('');
  const [showFeatureSearch, setShowFeatureSearch] = useState(false);
  const [selectedCrewRole, setSelectedCrewRole] = useState('Moderator');

  const crewRoles = [
    'Moderator',
    'Bout Manager', 
    'Backstage-Crew',
    'Sound Technician',
    'Light Technician',
    'Stage Manager'
  ];

  const roundStatuses = [
    { value: 'upcoming', label: 'Anstehend' },
    { value: 'active', label: 'Aktiv' },
    { value: 'completed', label: 'Abgeschlossen' }
  ];

  const competitionTypes = [
    { value: 'Einzelwettbewerb', label: 'Einzelwettbewerb' },
    { value: 'Teamwettbewerb', label: 'Teamwettbewerb' },
    { value: 'U20-Wettbewerb', label: 'U20-Wettbewerb' }
  ];

  useEffect(() => {
    loadData();

    // Subscribe to data changes
    const unsubscribe = hybridDataService.subscribe((dataType) => {
      if (dataType === 'rounds' || dataType === 'participants') {
        console.log('AdminRounds: Data changed, refreshing...');
        loadData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [roundsData, participantsData] = await Promise.all([
        hybridDataService.getData('rounds'),
        hybridDataService.getData('participants')
      ]);
      setRounds(roundsData || []);
      setParticipants(participantsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const getParticipantName = (participantId) => {
    const participant = participants.find(p => p.id === participantId);
    return participant ? participant.name : `Teilnehmer ${participantId}`;
  };

  const getAvailableParticipants = () => {
    const currentRound = editingRound || newRound;
    return participants.filter(participant => {
      const fullName = participant.name.toLowerCase();
      const searchLower = participantSearchTerm.toLowerCase();
      const isAlreadySelected = currentRound.tournamentParticipants.includes(participant.id);
      
      return fullName.includes(searchLower) && !isAlreadySelected;
    });
  };

  const getAvailableCrewMembers = () => {
    const currentRound = editingRound || newRound;
    return participants.filter(participant => {
      const fullName = participant.name.toLowerCase();
      const searchLower = crewSearchTerm.toLowerCase();
      const isAlreadyCrew = currentRound.crew.some(crew => crew.participantId === participant.id);
      
      return fullName.includes(searchLower) && !isAlreadyCrew;
    });
  };

  const getAvailableFeatureArtists = () => {
    const currentRound = editingRound || newRound;
    return participants.filter(participant => {
      const fullName = participant.name.toLowerCase();
      const searchLower = featureSearchTerm.toLowerCase();
      const isAlreadyFeature = currentRound.featureArtists.some(feature => feature.participantId === participant.id);
      
      return fullName.includes(searchLower) && !isAlreadyFeature;
    });
  };

  const addCrewMember = (participantId) => {
    const participant = participants.find(p => p.id === participantId);
    if (participant) {
      if (editingRound) {
        setEditingRound(prev => ({
          ...prev,
          crew: [...prev.crew, { participantId, role: selectedCrewRole }]
        }));
      } else {
        setNewRound(prev => ({
          ...prev,
          crew: [...prev.crew, { participantId, role: selectedCrewRole }]
        }));
      }
      setCrewSearchTerm('');
      setShowCrewSearch(false);
    }
  };

  const removeCrewMember = (participantId) => {
    if (editingRound) {
      setEditingRound(prev => ({
        ...prev,
        crew: prev.crew.filter(crew => crew.participantId !== participantId)
      }));
    } else {
      setNewRound(prev => ({
        ...prev,
        crew: prev.crew.filter(crew => crew.participantId !== participantId)
      }));
    }
  };

  const addTournamentParticipant = (participantId) => {
    const currentRound = editingRound || newRound;
    if (!currentRound.tournamentParticipants.includes(participantId)) {
      if (editingRound) {
        setEditingRound(prev => ({
          ...prev,
          tournamentParticipants: [...prev.tournamentParticipants, participantId]
        }));
      } else {
        setNewRound(prev => ({
          ...prev,
          tournamentParticipants: [...prev.tournamentParticipants, participantId]
        }));
      }
      setParticipantSearchTerm('');
      setShowParticipantSearch(false);
    }
  };

  const removeTournamentParticipant = (participantId) => {
    if (editingRound) {
      setEditingRound(prev => ({
        ...prev,
        tournamentParticipants: prev.tournamentParticipants.filter(id => id !== participantId)
      }));
    } else {
      setNewRound(prev => ({
        ...prev,
        tournamentParticipants: prev.tournamentParticipants.filter(id => id !== participantId)
      }));
    }
  };

  const addFeatureArtist = (participantId) => {
    const participant = participants.find(p => p.id === participantId);
    if (participant) {
      if (editingRound) {
        setEditingRound(prev => ({
          ...prev,
          featureArtists: [...prev.featureArtists, {
            participantId,
            name: participant.name,
            order: prev.featureArtists.length + 1,
            description: ''
          }]
        }));
      } else {
        setNewRound(prev => ({
          ...prev,
          featureArtists: [...prev.featureArtists, {
            participantId,
            name: participant.name,
            order: prev.featureArtists.length + 1,
            description: ''
          }]
        }));
      }
      setFeatureSearchTerm('');
      setShowFeatureSearch(false);
    }
  };

  const removeFeatureArtist = (participantId) => {
    if (editingRound) {
      setEditingRound(prev => ({
        ...prev,
        featureArtists: prev.featureArtists.filter(feature => feature.participantId !== participantId)
      }));
    } else {
      setNewRound(prev => ({
        ...prev,
        featureArtists: prev.featureArtists.filter(feature => feature.participantId !== participantId)
      }));
    }
  };

  const addGroup = () => {
    if (newGroup.name.trim()) {
      const newGroupWithId = { ...newGroup, id: Date.now() };
      
      if (editingRound) {
        setEditingRound(prev => ({
          ...prev,
          groups: [...prev.groups, newGroupWithId]
        }));
      } else {
        setNewRound(prev => ({
          ...prev,
          groups: [...prev.groups, newGroupWithId]
        }));
      }
      
      setNewGroup({
        name: '',
        participants: [],
        order: [],
        juryScores: {},
        winners: []
      });
    }
  };

  const removeGroup = (groupId) => {
    if (editingRound) {
      setEditingRound(prev => ({
        ...prev,
        groups: prev.groups.filter(group => group.id !== groupId)
      }));
    } else {
      setNewRound(prev => ({
        ...prev,
        groups: prev.groups.filter(group => group.id !== groupId)
      }));
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
      setNewRound(prev => ({
        ...prev,
        groups: updateGroups(prev.groups)
      }));
    }
    setGroupParticipantSearchTerm('');
    setShowGroupParticipantSearch(false);
  };

  const removeGroupParticipant = (groupId, participantId) => {
    const updateGroups = (groups) => groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          participants: group.participants.filter(id => id !== participantId),
          order: group.order.filter(id => id !== participantId),
          winners: group.winners.filter(id => id !== participantId),
          juryScores: Object.fromEntries(
            Object.entries(group.juryScores).filter(([key]) => key !== participantId.toString())
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
      setNewRound(prev => ({
        ...prev,
        groups: updateGroups(prev.groups)
      }));
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
      setNewRound(prev => ({
        ...prev,
        groups: updateGroups(prev.groups)
      }));
    }
  };

  const toggleGroupWinner = (groupId, participantId) => {
    const updateGroups = (groups) => groups.map(group => {
      if (group.id === groupId) {
        const newWinners = group.winners.includes(participantId)
          ? group.winners.filter(id => id !== participantId)
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
      setNewRound(prev => ({
        ...prev,
        groups: updateGroups(prev.groups)
      }));
    }
  };

  const updateJuryScore = (groupId, participantId, juryIndex, score) => {
    const updateGroups = (groups) => groups.map(group => {
      if (group.id === groupId) {
        const currentScores = group.juryScores[participantId] || [];
        const newScores = [...currentScores];
        newScores[juryIndex] = parseFloat(score) || 0;
        return {
          ...group,
          juryScores: {
            ...group.juryScores,
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
      setNewRound(prev => ({
        ...prev,
        groups: updateGroups(prev.groups)
      }));
    }
  };

  const getAvailableGroupParticipants = (groupId) => {
    const currentRound = editingRound || newRound;
    const currentGroup = currentRound.groups.find(g => g.id === groupId);
    const currentParticipants = currentGroup ? currentGroup.participants : [];
    
    return currentRound.tournamentParticipants.filter(participantId => {
      const fullName = getParticipantName(participantId).toLowerCase();
      const searchLower = groupParticipantSearchTerm.toLowerCase();
      const isAlreadyInGroup = currentParticipants.includes(participantId);
      
      return fullName.includes(searchLower) && !isAlreadyInGroup;
    });
  };

  const handleAddRound = async (e) => {
    e.preventDefault();
    try {
      await hybridDataService.setData('rounds', newRound);
      setNewRound({
        title: '',
        startDateTime: '',
        endDateTime: '',
        location: '',
        address: '',
        description: '',
        afterPlayReport: '',
        crew: [],
        tournamentParticipants: [],
        groups: [],
        featureArtists: [],
        totalJuryMembers: 5,
        status: 'upcoming'
      });
      setShowAddForm(false);
      // loadData(); // Removed manual reload
    } catch (error) {
      console.error('Error creating round:', error);
      alert('Fehler beim Erstellen der Runde');
    }
  };

  const handleUpdateRound = async (e) => {
    e.preventDefault();
    try {
      await hybridDataService.setData('rounds', editingRound, editingRound.id);
      setEditingRound(null);
      // loadData(); // Removed manual reload
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
      groups: round.groups || [],
      featureArtists: round.featureArtists || []
    });
  };

  const handleDeleteRound = async (id) => {
    if (window.confirm('Möchten Sie diese Runde wirklich löschen?')) {
      try {
        await hybridDataService.deleteData('rounds', id);
        // loadData(); // Removed manual reload
      } catch (error) {
        console.error('Error deleting round:', error);
        alert('Fehler beim Löschen der Runde');
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

  const filteredRounds = rounds.filter(round =>
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
                hybridDataService.resetRoundsData();
                // loadData(); // Removed manual reload
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
          
          <form onSubmit={editingRound ? handleUpdateRound : handleAddRound} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Titel *
                </label>
                <input
                  type="text"
                  required
                  value={editingRound ? editingRound.title : newRound.title}
                  onChange={(e) => editingRound 
                    ? setEditingRound({ ...editingRound, title: e.target.value })
                    : setNewRound({ ...newRound, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status *
                </label>
                <select
                  required
                  value={editingRound ? editingRound.status : newRound.status}
                  onChange={(e) => editingRound 
                    ? setEditingRound({ ...editingRound, status: e.target.value })
                    : setNewRound({ ...newRound, status: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {roundStatuses.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Datum & Zeit *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={editingRound ? editingRound.startDateTime : newRound.startDateTime}
                  onChange={(e) => editingRound 
                    ? setEditingRound({ ...editingRound, startDateTime: e.target.value })
                    : setNewRound({ ...newRound, startDateTime: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Datum & Zeit *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={editingRound ? editingRound.endDateTime : newRound.endDateTime}
                  onChange={(e) => editingRound 
                    ? setEditingRound({ ...editingRound, endDateTime: e.target.value })
                    : setNewRound({ ...newRound, endDateTime: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  required
                  value={editingRound ? editingRound.location : newRound.location}
                  onChange={(e) => editingRound 
                    ? setEditingRound({ ...editingRound, location: e.target.value })
                    : setNewRound({ ...newRound, location: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Adresse *
                </label>
                <input
                  type="text"
                  required
                  value={editingRound ? editingRound.address : newRound.address}
                  onChange={(e) => editingRound 
                    ? setEditingRound({ ...editingRound, address: e.target.value })
                    : setNewRound({ ...newRound, address: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Wettbewerbstyp
              </label>
              <select
                value={editingRound ? editingRound.competitionType : newRound.competitionType}
                onChange={(e) => editingRound 
                  ? setEditingRound({ ...editingRound, competitionType: e.target.value })
                  : setNewRound({ ...newRound, competitionType: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {competitionTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Beschreibung
              </label>
              <textarea
                value={editingRound ? editingRound.description : newRound.description}
                onChange={(e) => editingRound 
                  ? setEditingRound({ ...editingRound, description: e.target.value })
                  : setNewRound({ ...newRound, description: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Beschreibung der Runde..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                After Play Report
              </label>
              <textarea
                value={editingRound ? editingRound.afterPlayReport : newRound.afterPlayReport}
                onChange={(e) => editingRound 
                  ? setEditingRound({ ...editingRound, afterPlayReport: e.target.value })
                  : setNewRound({ ...newRound, afterPlayReport: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Bericht nach der Runde..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Anzahl Jury-Mitglieder
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={editingRound ? editingRound.totalJuryMembers : newRound.totalJuryMembers}
                onChange={(e) => editingRound 
                  ? setEditingRound({ ...editingRound, totalJuryMembers: parseInt(e.target.value) || 5 })
                  : setNewRound({ ...newRound, totalJuryMembers: parseInt(e.target.value) || 5 })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
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
                    {getAvailableCrewMembers().map((participant) => (
                      <div
                        key={participant.id}
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
              {((editingRound ? editingRound.crew : newRound.crew) || []).length > 0 && (
                <div className="space-y-2">
                  {(editingRound ? editingRound.crew : newRound.crew || []).map((crewMember) => (
                    <div key={crewMember.participantId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Turnier-Teilnehmer</h3>
              
              <button
                type="button"
                onClick={() => setShowParticipantSearch(!showParticipantSearch)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-4"
              >
                {showParticipantSearch ? 'Suche schließen' : '+ Turnier-Teilnehmer hinzufügen'}
              </button>

              {showParticipantSearch && (
                <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <input
                    type="text"
                    placeholder="Nach Turnier-Teilnehmern suchen..."
                    value={participantSearchTerm}
                    onChange={(e) => setParticipantSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white mb-3"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {getAvailableParticipants().map((participant) => (
                      <div
                        key={participant.id}
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
              {((editingRound ? editingRound.tournamentParticipants : newRound.tournamentParticipants) || []).length > 0 && (
                <div className="space-y-2">
                  {(editingRound ? editingRound.tournamentParticipants : newRound.tournamentParticipants || []).map((participantId) => (
                    <div key={participantId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
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
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={addGroup}
                  disabled={!newGroup.name.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Gruppe hinzufügen
                </button>
              </div>

              {/* Existing Groups */}
              {((editingRound ? editingRound.groups : newRound.groups) || []).length > 0 && (
                <div className="space-y-4">
                                      {(editingRound ? editingRound.groups : newRound.groups || []).map((group) => (
                    <div key={group.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{group.name}</h4>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => setShowGroupParticipantSearch(!showGroupParticipantSearch)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            + Teilnehmer
                          </button>
                          <button
                            type="button"
                            onClick={() => removeGroup(group.id)}
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
                            placeholder="Nach Teilnehmern suchen..."
                            value={groupParticipantSearchTerm}
                            onChange={(e) => setGroupParticipantSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white mb-3"
                          />
                          <div className="max-h-40 overflow-y-auto space-y-2">
                            {getAvailableGroupParticipants(group.id).map((participantId) => (
                              <div
                                key={participantId}
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
                          <h5 className="font-medium text-gray-900 dark:text-white">Teilnehmer in dieser Gruppe:</h5>
                          {group.order.map((participantId, index) => (
                            <div key={participantId} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
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
                                  <span className="text-sm text-gray-500 dark:text-gray-400">Gewinner</span>
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
                                {Array.from({ length: (editingRound || newRound).totalJuryMembers }, (_, juryIndex) => (
                                  <div key={juryIndex} className="text-center">
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                      Jury {juryIndex + 1}
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="10"
                                      step="0.1"
                                      value={group.juryScores[participantId]?.[juryIndex] || ''}
                                      onChange={(e) => updateJuryScore(group.id, participantId, juryIndex, e.target.value)}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                      placeholder="0.0"
                                    />
                                  </div>
                                ))}
                              </div>

                              {/* Total Score Display */}
                              {group.juryScores[participantId] && group.juryScores[participantId].length > 0 && (
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
                    {getAvailableFeatureArtists().map((participant) => (
                      <div
                        key={participant.id}
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
              {((editingRound ? editingRound.featureArtists : newRound.featureArtists) || []).length > 0 && (
                <div className="space-y-2">
                                      {(editingRound ? editingRound.featureArtists : newRound.featureArtists || []).map((feature) => (
                    <div key={feature.participantId} className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
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
          Zeige {filteredRounds.length} von {rounds.length} Runden
        </p>
      </div>

      {/* Rounds List */}
      <div className="space-y-6">
        {filteredRounds.map((round) => (
          <div key={round.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                                 <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{round.title || 'Unbekannte Runde'}</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>📅 {new Date(round.startDateTime).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' })} {new Date(round.startDateTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })} - {new Date(round.endDateTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })}</span>
                                     <span>📍 {round.location || 'Unbekannter Ort'}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    round.status === 'upcoming' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
                    round.status === 'active' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {round.status === 'upcoming' ? 'Anstehend' : 
                     round.status === 'active' ? 'Aktiv' : 'Abgeschlossen'}
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
                  className="px-3 py-1 text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Löschen
                </button>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4">{round.description}</p>

            {/* Crew */}
            {round.crew && round.crew.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Crew:</h4>
                <div className="flex flex-wrap gap-2">
                  {round.crew.map((crewMember) => (
                    <span key={crewMember.participantId} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm">
                      {getParticipantName(crewMember.participantId)} ({crewMember.role})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tournament Participants */}
            {round.tournamentParticipants && round.tournamentParticipants.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Turnier-Teilnehmer ({round.tournamentParticipants.length}):</h4>
                <div className="flex flex-wrap gap-2">
                  {round.tournamentParticipants.map((participantId) => (
                    <span key={participantId} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
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
                  {round.featureArtists.map((feature) => (
                    <span key={feature.participantId} className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-sm">
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
                        {group.participants.map((participantId) => {
                          const scores = group.juryScores[participantId] || [];
                          const totalScore = calculateTotalScore(scores);
                          const isWinner = group.winners.includes(participantId);
                          
                          return (
                            <div key={participantId} className={`flex items-center justify-between p-2 rounded ${isWinner ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700' : 'bg-gray-50 dark:bg-gray-700'}`}>
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
