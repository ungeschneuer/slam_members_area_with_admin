import React, { useState, useEffect } from 'react';
import hybridDataService from '../../services/hybridDataService.js';
import LoadingSpinner from '../LoadingSpinner';
import { ErrorMessage, SuccessMessage } from '../ErrorBoundary.jsx';

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

export default function AdminParticipants() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [success, setSuccess] = useState(null);

  const [newParticipant, setNewParticipant] = useState({
    name: '',
    region: '',
    role: 'Teilnehmer',
    pronouns: '',
    instagram: ''
  });

  const bundeslaender = [
    'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen',
    'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen',
    'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen',
    'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen',
    'Österreich', 'Schweiz', 'Belgien', 'Luxemburg', 'Südtirol'
  ];

  const roles = ['Teilnehmer', 'Supporter', 'Crew'];

  // Pronouns is now a free-form text field

  // Load participants data
  useEffect(() => {
    const loadParticipants = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await hybridDataService.getData('participants');
        setParticipants(data || []);
      } catch (err) {
        setError(err.message);
        console.error('Error loading participants:', err);
      } finally {
        setLoading(false);
      }
    };

    loadParticipants();

    // Subscribe to data changes
    const unsubscribe = hybridDataService.subscribe((dataType) => {
      if (dataType === 'participants') {
        console.log('AdminParticipants: Data changed, refreshing...');
        loadParticipants();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const filteredParticipants = participants.filter(participant => {
    const matchesSearchTerm = (participant.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                               (participant.region || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                               (participant.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                               (participant.pronouns || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRoleFilter = roleFilter === 'all' || participant.role === roleFilter;
    const matchesRegionFilter = regionFilter === 'all' || participant.region === regionFilter;

    return matchesSearchTerm && matchesRoleFilter && matchesRegionFilter;
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await hybridDataService.setData('participants', newParticipant);
      setNewParticipant({ name: '', region: '', role: 'Teilnehmer', pronouns: '', instagram: '' });
      setShowAddForm(false);
      setSuccess('Teilnehmer erfolgreich hinzugefügt!');
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      // Data will be automatically updated via WebSocket
    } catch (error) {
      setError(error.message);
      console.error('Error adding participant:', error);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await hybridDataService.setData('participants', editingParticipant, editingParticipant.id);
      setEditingParticipant(null);
      setSuccess('Teilnehmer erfolgreich aktualisiert!');
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      // Data will be automatically updated via WebSocket
    } catch (error) {
      setError(error.message);
      console.error('Error updating participant:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bist du sicher, dass du diesen Teilnehmer löschen möchtest?')) {
      try {
        await hybridDataService.deleteData('participants', id);
        setSuccess('Teilnehmer erfolgreich gelöscht!');
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
        // Data will be automatically updated via WebSocket
      } catch (error) {
        setError(error.message);
        console.error('Error deleting participant:', error);
      }
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Teilnehmer': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Supporter': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'Crew': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getRegionFlag = (region) => {
    switch (region) {
      case 'Baden-Württemberg': return '🇩🇪';
      case 'Bayern': return '🇩🇪';
      case 'Berlin': return '🇩🇪';
      case 'Brandenburg': return '🇩🇪';
      case 'Bremen': return '🇩🇪';
      case 'Hamburg': return '🇩🇪';
      case 'Hessen': return '🇩🇪';
      case 'Mecklenburg-Vorpommern': return '🇩🇪';
      case 'Niedersachsen': return '🇩🇪';
      case 'Nordrhein-Westfalen': return '🇩🇪';
      case 'Rheinland-Pfalz': return '🇩🇪';
      case 'Saarland': return '🇩🇪';
      case 'Sachsen': return '🇩🇪';
      case 'Sachsen-Anhalt': return '🇩🇪';
      case 'Schleswig-Holstein': return '🇩🇪';
      case 'Thüringen': return '🇩🇪';
      case 'Österreich': return '🇦🇹';
      case 'Schweiz': return '🇨🇭';
      case 'Belgien': return '🇧🇪';
      case 'Luxemburg': return '🇱🇺';
      case 'Südtirol': return '🇮🇹';
      default: return '🌎';
    }
  };

  if (loading) {
    return <LoadingSpinner size="xl" text="Teilnehmer werden geladen..." />;
  }

  if (error) {
    return (
      <ErrorMessage 
        error={error} 
        onRetry={() => window.location.reload()} 
        className="max-w-4xl mx-auto"
      />
    );
  }

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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Teilnehmer verwalten</h2>
            <p className="text-gray-600 dark:text-gray-400">Fügen Sie neue Teilnehmer hinzu oder bearbeiten Sie bestehende</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {showAddForm ? 'Abbrechen' : 'Teilnehmer hinzufügen'}
          </button>
        </div>

        {/* Add Participant Form */}
        {showAddForm && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Neuen Teilnehmer hinzufügen</h3>
            <form onSubmit={handleAdd} className="space-y-4">
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
                {roles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
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
                  {bundeslaender.map(bundesland => (
                    <option key={bundesland} value={bundesland}>{bundesland}</option>
                  ))}
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
                type="url"
                placeholder="Instagram-Profil (optional)"
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
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
                          <option value="all">Alle Rollen</option>
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
          </select>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Alle Regionen</option>
            {bundeslaender.map(bundesland => (
              <option key={bundesland} value={bundesland}>{bundesland}</option>
            ))}
          </select>
        </div>

        {/* Participants Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rolle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Region</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pronomen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Instagram</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aktionen</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredParticipants.map((participant) => (
                <tr key={participant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                        {participant.name ? participant.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{participant.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(participant.role)}`}>
                      {participant.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="flex items-center space-x-2">
                      <span>{getRegionFlag(participant.region)}</span>
                      <span>{participant.region}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {participant.pronouns || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {participant.instagram ? (
                      <a
                        href={formatInstagramUrl(participant.instagram)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-600 hover:text-pink-700 transition-colors"
                      >
                        Instagram
                      </a>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingParticipant(participant)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      >
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => handleDelete(participant.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      >
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* Edit Participant Modal */}
      {editingParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Teilnehmer bearbeiten</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={editingParticipant.name}
                onChange={(e) => setEditingParticipant({...editingParticipant, name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
              />
              <select
                value={editingParticipant.role}
                onChange={(e) => setEditingParticipant({...editingParticipant, role: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Rolle auswählen</option>
                {roles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <select
                value={editingParticipant.region}
                onChange={(e) => setEditingParticipant({...editingParticipant, region: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Bundesland/Region auswählen</option>
                {bundeslaender.map(bundesland => (
                  <option key={bundesland} value={bundesland}>{bundesland}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Pronomen"
                value={editingParticipant.pronouns || ''}
                onChange={(e) => setEditingParticipant({...editingParticipant, pronouns: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <input
                type="text"
                placeholder="Instagram-Benutzername (z.B. john_doe oder @john_doe)"
                value={editingParticipant.instagram || ''}
                onChange={(e) => setEditingParticipant({...editingParticipant, instagram: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Speichern
                </button>
                <button
                  type="button"
                  onClick={() => setEditingParticipant(null)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
