import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useParticipants } from '../hooks/index.js';
import pwaService from '../services/pwaService.js';
import LoadingSpinner from './LoadingSpinner';
import { ErrorMessage, SuccessMessage } from './StatusMessages.jsx';
import { formatInstagramUrl } from '../utils/instagramUtils.js';

export default function Participants() {
  const { data: participantsData, isLoading: loading, error } = useParticipants();
  const [participants, setParticipants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterBundesland, setFilterBundesland] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [success, setSuccess] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Handle online/offline status
  useEffect(() => {
    const handleOnlineStatus = (event) => {
      setIsOnline(event.detail.isOnline);
    };

    window.addEventListener('pwa:online-status', handleOnlineStatus);
    
    return () => {
      window.removeEventListener('pwa:online-status', handleOnlineStatus);
    };
  }, []);

  // Update local state when useLiveData changes
  useEffect(() => {
    if (participantsData) {
      setParticipants(Array.isArray(participantsData) ? participantsData : []);
    }
  }, [participantsData]);

  if (loading) return <LoadingSpinner size="xl" text="Teilnehmer*innen werden geladen..." />;
  if (error) return <div className="text-red-600">Fehler beim Laden der Teilnehmer*innen: {error?.message || error}</div>;

  // Show offline status if not online
  if (!isOnline) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <h1 className="sr-only">Teilnehmer*innen</h1>
        <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600 dark:text-yellow-300">⚠️</span>
            <span className="text-yellow-800 dark:text-yellow-200 font-medium">
              Sie sind offline. Teilnehmer*innendaten werden aus dem Cache geladen.
            </span>
          </div>
          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
            <p>• Daten werden automatisch synchronisiert, sobald Sie wieder online sind</p>
            <p>• Änderungen werden lokal gespeichert und übertragen</p>
            <p>• Verbindung wird automatisch überprüft</p>
          </div>
        </div>
        
        {/* Offline controls for accessibility testing */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Teilnehmer*innen</h1>
              <p className="text-gray-600 dark:text-gray-400">Übersicht aller Poetry Slam Teilnehmer*innen und Crew-Mitglieder</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <input
              type="text"
              placeholder="Teilnehmer*innen suchen..."
              disabled
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
            <select
              disabled
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            >
              <option value="all">Alle Rollen</option>
            </select>
            <select
              disabled
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            >
              <option value="all">Alle Bundesländer/Regionen</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  const filteredParticipants = (Array.isArray(participants) ? participants : [])
    .filter(participant => {
      const fullName = participant.name || '';
      const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           participant.region?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           participant.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           participant.pronouns?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBundesland = filterBundesland === 'all' || participant.region === filterBundesland;
      
      // Check if the selected role is contained within the participant's roles
      let matchesRole = filterRole === 'all';
      if (filterRole !== 'all') {
        if (Array.isArray(participant.roles)) {
          // Filter out Jury roles from the participant's roles
          const filteredRoles = participant.roles.filter(role => 
            role !== 'Jury' && role !== 'Jury-Mitglied'
          );
          // Handle both old "Supporter" and new "Supporter*in" roles
          matchesRole = filteredRoles.includes(filterRole) || 
            (filterRole === 'Supporter*in' && filteredRoles.includes('Supporter'));
        } else if (participant.role) {
          // Handle comma-separated roles and filter out Jury roles
          const participantRoles = participant.role.includes(',') 
            ? participant.role.split(',').map(r => r.trim())
            : [participant.role];
          const filteredRoles = participantRoles.filter(role => 
            role !== 'Jury' && role !== 'Jury-Mitglied'
          );
          // Handle both old "Supporter" and new "Supporter*in" roles
          matchesRole = filteredRoles.includes(filterRole) || 
            (filterRole === 'Supporter*in' && filteredRoles.includes('Supporter'));
        }
      }
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

  const uniqueBundeslaender = [...new Set((Array.isArray(participants) ? participants : []).map(p => p.region).filter(Boolean))].sort();
  
  // Extract individual roles from participants (handle both single roles and comma-separated roles)
  const allIndividualRoles = (Array.isArray(participants) ? participants : [])
    .map(p => {
      if (Array.isArray(p.roles)) {
        return p.roles;
      } else if (p.role) {
        // Handle comma-separated roles
        return p.role.includes(',') 
          ? p.role.split(',').map(r => r.trim())
          : [p.role];
      }
      return [];
    })
    .flat()
    .filter(Boolean);
  
  const uniqueRoles = [...new Set(allIndividualRoles)]
    .filter(role => role !== 'Jury' && role !== 'Jury-Mitglied') // Remove Jury roles
    .map(role => role === 'Supporter' ? 'Supporter*in' : role) // Normalize old Supporter to Supporter*in
    .sort();

  const getRegionFlag = (region) => {
    // Return empty string instead of emojis
    return '';
  };


  return (
    <div data-testid="participants" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Teilnehmer*innen</h1>
            <p className="text-gray-600 dark:text-gray-400">Übersicht aller Poetry Slam Teilnehmer*innen und Crew-Mitglieder</p>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <input
            type="text"
            placeholder="Teilnehmer*innen suchen..."
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


        {/* Participants Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredParticipants.map((participant) => (
            <Link
              key={participant.id}
              to={`/participants/${participant.slug}`}
              className="block bg-white dark:bg-gray-700 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200 hover:-translate-y-1 cursor-pointer"
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {participant.name ? participant.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{participant.name}</h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {(() => {
                      // Handle both single role (string) and multiple roles (array)
                      let roles = [];
                      
                      if (Array.isArray(participant.roles)) {
                        roles = participant.roles.filter(role => 
                          role !== 'Jury' && role !== 'Jury-Mitglied'
                        );
                      } else if (participant.role) {
                        // Handle comma-separated roles and filter out Jury roles
                        roles = participant.role.includes(',') 
                          ? participant.role.split(',').map(r => r.trim())
                          : [participant.role];
                        roles = roles.filter(role => 
                          role !== 'Jury' && role !== 'Jury-Mitglied'
                        );
                      }
                      
                      // Normalize old "Supporter" to "Supporter*in" for display
                      roles = roles.map(role => role === 'Supporter' ? 'Supporter*in' : role);
                      
                      if (roles.length === 0) return <span>Keine Rolle</span>;
                      
                      return roles.map((role, index) => {
                        const emoji = role === 'Teilnehmer*in' ? '🎭' : 
                                     role === 'Supporter*in' || role === 'Supporter' ? '🤝' : 
                                     role === 'Crew' ? '⚙️' :
                                     role === 'SLAM-MC' ? '🎤' :
                                     role === 'Organisator*in' || role === 'Organisator' ? '🎯' :
                                     role === 'Moderator*in' || role === 'Moderator' ? '🎤' :
                                     role === 'Techniker*in' || role === 'Techniker' ? '🔧' :
                                     role === 'Fotograf*in' || role === 'Fotograf' ? '📸' :
                                     role === 'Videograf*in' || role === 'Videograf' ? '🎥' : '👤';
                        
                        return (
                          <span key={`role-${role}-${index}`} className="inline-block mr-1">
                            {emoji} {role}
                          </span>
                        );
                      });
                    })()}
                  </div>
                </div>
                <div className="text-lg" title={participant.region}>
                  {getRegionFlag(participant.region)}
                </div>
              </div>
              
              <div className="space-y-2">
                {participant.pronouns && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>👤 {participant.pronouns}</span>
                  </div>
                )}
                {participant.instagram && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>📸 @{participant.instagram}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>📍 {participant.region}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredParticipants.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Keine Teilnehmer*innen gefunden
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Versuchen Sie andere Suchkriterien oder fügen Sie einen neuen Teilnehmer*innen hinzu.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
