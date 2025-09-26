import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import hybridDataService from '../services/hybridDataService.js';
import LoadingSpinner from './LoadingSpinner';
import { ErrorMessage, SuccessMessage } from './ErrorBoundary.jsx';

// Utility function to format Instagram URLs
const formatInstagramUrl = (instagram) => {
  if (!instagram) return null;
  
  // Remove any existing protocol and domain
  let username = instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '');
  
  // Remove leading @ if present
  username = username.replace(/^@/, '');
  
  // Remove trailing slash if present
  username = username.replace(/\/$/, '');
  
  return `https://instagram.com/${username}`;
};

export default function Participants() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterBundesland, setFilterBundesland] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    role: '',
    region: '',
    pronouns: '',
    instagram: '',
  });
  const [success, setSuccess] = useState(null);

  // Load participants data
  useEffect(() => {
    const loadParticipants = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await hybridDataService.getData('participants');
        setParticipants(data || []);
      } catch (error) {
        console.error('Error loading participants:', error);
        setError('Fehler beim Laden der Teilnehmer');
      } finally {
        setLoading(false);
      }
    };

    loadParticipants();

    // Subscribe to data changes
    const unsubscribe = hybridDataService.subscribe((dataType) => {
      if (dataType === 'participants') {
        console.log('Participants: Data changed, refreshing...');
        loadParticipants();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (loading) return <LoadingSpinner size="xl" text="Teilnehmer werden geladen..." />;
  if (error) return <div className="text-red-600">Fehler beim Laden der Teilnehmer: {error}</div>;

  const filteredParticipants = participants
    .filter(participant => {
      const fullName = participant.name || '';
      const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           participant.region?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           participant.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           participant.pronouns?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBundesland = filterBundesland === 'all' || participant.region === filterBundesland;
          const matchesRole = filterRole === 'all' || participant.role === filterRole;
    return matchesSearch && matchesBundesland && matchesRole;
    })
    .sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      
      switch (sortBy) {
        case 'name':
          return nameA.localeCompare(nameB);
        case 'bundesland':
          return (a.region || '').localeCompare(b.region || '');
        case 'role':
          return (a.role || '').localeCompare(b.role || '');
        case 'pronouns':
          return (a.pronouns || '').localeCompare(b.pronouns || '');
        default:
          return 0;
      }
    });

  const uniqueBundeslaender = [...new Set(participants.map(p => p.region).filter(Boolean))].sort();
  const uniqueRoles = [...new Set(participants.map(p => p.role).filter(Boolean))].sort();

  const getRegionFlag = (region) => {
    const flagMap = {
      // Deutsche Bundesländer
      'Baden-Württemberg': '🏛️',
      'Bayern': '🏔️',
      'Berlin': '🐻',
      'Brandenburg': '🦅',
      'Bremen': '⚓',
      'Hamburg': '⚓',
      'Hessen': '🦁',
      'Mecklenburg-Vorpommern': '🐎',
      'Niedersachsen': '🐎',
      'Nordrhein-Westfalen': '🌹',
      'Rheinland-Pfalz': '🍇',
      'Saarland': '⚒️',
      'Sachsen': '⚒️',
      'Sachsen-Anhalt': '🏛️',
      'Schleswig-Holstein': '🌊',
      'Thüringen': '🌲',
      // Internationale Regionen
      'Österreich': '🇦🇹',
      'Schweiz': '🇨🇭',
      'Belgien': '🇧🇪',
      'Luxemburg': '🇱🇺',
      'Südtirol': '🏔️'
    };
    return flagMap[region] || '🌍';
  };

  const handleAddParticipant = async (e) => {
    e.preventDefault();
    try {
      await hybridDataService.addParticipant(newParticipant);
      setSuccess('Teilnehmer erfolgreich hinzugefügt!');
      setNewParticipant({
        name: '',
        role: '',
        region: '',
        pronouns: '',
        instagram: '',
      });
      setShowAddForm(false);
    } catch (err) {
      setError(err.message);
      console.error('Error adding participant:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Error and Success Messages */}
      {error && (
        <ErrorMessage 
          error={error} 
          onRetry={() => window.location.reload()} 
          className="max-w-4xl mx-auto"
        />
      )}
      
      {success && (
        <SuccessMessage 
          message={success} 
          onDismiss={() => setSuccess(null)} 
          className="max-w-4xl mx-auto"
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Teilnehmer</h1>
            <p className="text-gray-600 dark:text-gray-400">Übersicht aller Poetry Slam Teilnehmer und Crew-Mitglieder</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {showAddForm ? 'Abbrechen' : 'Teilnehmer hinzufügen'}
            </button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <input
            type="text"
            placeholder="Teilnehmer suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
                          <option value="all">Alle Rollen</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
          </select>
          <select
            value={filterBundesland} // Changed from regionFilter to filterBundesland
            onChange={(e) => setFilterBundesland(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Alle Bundesländer/Regionen</option>
            {uniqueBundeslaender.map(bundesland => (
              <option key={bundesland} value={bundesland}>{bundesland}</option>
            ))}
          </select>
        </div>

        {/* Add Participant Form */}
        {showAddForm && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Neuen Teilnehmer hinzufügen</h2>
            <form onSubmit={handleAddParticipant} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={newParticipant.name}
                  onChange={(e) => setNewParticipant({...newParticipant, name: e.target.value})}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
                <select
                  value={newParticipant.role}
                  onChange={(e) => setNewParticipant({...newParticipant, role: e.target.value})}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Rolle auswählen</option>
                  <option value="Teilnehmer">Teilnehmer</option>
                  <option value="Supporter">Supporter</option>
                  <option value="Crew">Crew</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select
                  value={newParticipant.region}
                  onChange={(e) => setNewParticipant({...newParticipant, region: e.target.value})}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Bundesland/Region auswählen</option>
                  <option value="Sachsen">Sachsen</option>
                  <option value="Bayern">Bayern</option>
                  <option value="Baden-Württemberg">Baden-Württemberg</option>
                  <option value="Berlin">Berlin</option>
                  <option value="Brandenburg">Brandenburg</option>
                  <option value="Bremen">Bremen</option>
                  <option value="Hamburg">Hamburg</option>
                  <option value="Hessen">Hessen</option>
                  <option value="Mecklenburg-Vorpommern">Mecklenburg-Vorpommern</option>
                  <option value="Niedersachsen">Niedersachsen</option>
                  <option value="Nordrhein-Westfalen">Nordrhein-Westfalen</option>
                  <option value="Rheinland-Pfalz">Rheinland-Pfalz</option>
                  <option value="Saarland">Saarland</option>
                  <option value="Schleswig-Holstein">Schleswig-Holstein</option>
                  <option value="Thüringen">Thüringen</option>
                  <option value="Österreich">Österreich</option>
                  <option value="Schweiz">Schweiz</option>
                  <option value="Belgien">Belgien</option>
                  <option value="Luxemburg">Luxemburg</option>
                  <option value="Südtirol">Südtirol</option>
                </select>
                <input
                  type="text"
                  placeholder="Pronomen (z.B. er/ihm, sie/ihr, they/them)"
                  value={newParticipant.pronouns}
                  onChange={(e) => setNewParticipant({...newParticipant, pronouns: e.target.value})}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <input
                type="text"
                placeholder="Instagram-Benutzername (optional, z.B. john_doe oder @john_doe)"
                value={newParticipant.instagram}
                onChange={(e) => setNewParticipant({...newParticipant, instagram: e.target.value})}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Hinzufügen
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Participants Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredParticipants.map((participant) => (
            <div
              key={participant.id}
              className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200 hover:-translate-y-1"
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {participant.name ? participant.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{participant.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{participant.role}</p>
                </div>
                <div className="text-lg" title={participant.region}>
                  {getRegionFlag(participant.region)}
                </div>
              </div>
              
              <div className="space-y-2">
                {participant.pronouns && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>👤</span>
                    <span>{participant.pronouns}</span>
                  </div>
                )}
                {participant.instagram && (
                  <div className="flex items-center space-x-2 text-sm">
                    <a
                      href={formatInstagramUrl(participant.instagram)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:text-pink-700 transition-colors"
                    >
                      📸 Instagram
                    </a>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>📍</span>
                  <span>{participant.region}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredParticipants.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Keine Teilnehmer gefunden
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Versuchen Sie andere Suchkriterien oder fügen Sie einen neuen Teilnehmer hinzu.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
