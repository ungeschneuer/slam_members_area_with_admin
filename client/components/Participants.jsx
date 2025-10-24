import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useParticipants, useParticipantsSearch, useTeams, usePageTitle } from '../hooks/index.js';
import pwaService from '../services/pwaService.js';
import LoadingSpinner from './LoadingSpinner';
import { ErrorMessage, SuccessMessage } from './StatusMessages.jsx';
import PaginationControls from './PaginationControls.jsx';
import { formatInstagramUrl } from '../utils/instagramUtils.js';
import { getRegionFlag } from '../utils/detailViewUtils.js';
import { extractParticipantRoles, matchesParticipantRole, translateRole, getRoleBasedColors } from '../utils/filterUtils.js';

export default function Participants() {
  usePageTitle('Teilnehmer*innen');
  
  // State declarations
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterBundesland, setFilterBundesland] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  
  // Use server-side search when there's a search term, otherwise load all participants
  const hasSearchTerm = searchTerm.trim().length >= 2;
  
  // Server-side search
  const { 
    data: searchResponse, 
    isLoading: searchLoading, 
    error: searchError 
  } = useParticipantsSearch(searchTerm, { role: filterRole, region: filterBundesland }, {
    page: currentPage,
    limit: pageSize,
    enabled: hasSearchTerm
  });
  
  // Fallback: Load all participants when no search term
  const { data: allParticipantsResponse, isLoading: participantsLoading, error: participantsError } = useParticipants({ limit: 10000, offset: 0 }, false, { enabled: !hasSearchTerm });
  const { data: teams = [], isLoading: teamsLoading, error: teamsError } = useTeams();
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

  // Extract participants data based on search mode
  const allParticipants = useMemo(() => {
    if (hasSearchTerm && searchResponse?.data) {
      // Use search results
      return Array.isArray(searchResponse.data) ? searchResponse.data : [];
    } else if (allParticipantsResponse?.data) {
      // Use fallback data
      return Array.isArray(allParticipantsResponse.data) ? allParticipantsResponse.data : [];
    }
    return Array.isArray(allParticipantsResponse) ? allParticipantsResponse : [];
  }, [hasSearchTerm, searchResponse, allParticipantsResponse]);

  // Combine participants and teams for unified view
  const allItems = [
    ...(Array.isArray(allParticipants) ? allParticipants.map(p => ({ ...p, type: 'participant' })) : []),
    ...(Array.isArray(teams) ? teams.map(t => ({ ...t, type: 'team' })) : [])
  ];

  // Extract matching logic to reusable functions
  const matchesSearchFilter = (item, search) => {
    if (!search) return true;
    if (!item || typeof item !== 'object') return false;
    
    const fullName = item.name || '';
    return fullName.toLowerCase().includes(search.toLowerCase()) ||
           item.region?.toLowerCase().includes(search.toLowerCase()) ||
           item.role?.toLowerCase().includes(search.toLowerCase()) ||
           item.pronouns?.toLowerCase().includes(search.toLowerCase()) ||
           (item.members && item.members.some(member => 
             member.name.toLowerCase().includes(search.toLowerCase())
           ));
  };


  const matchesRoleFilter = (item, roleFilter) => {
    if (roleFilter === 'all') return true;
    if (item.type === 'team') return roleFilter === 'Team';
    return matchesParticipantRole(item, roleFilter);
  };

  const matchesRegionFilter = (item, regionFilter) => {
    return regionFilter === 'all' || item.region === regionFilter;
  };

  // Single-pass cascading filter options calculation
  const { availableRegions, availableRoles, filteredItems } = useMemo(() => {
    try {
      if (!Array.isArray(allItems) || allItems.length === 0) {
        return { availableRegions: [], availableRoles: [], filteredItems: [] };
      }
      
      const afterSearch = allItems.filter(item => {
        if (!item || typeof item !== 'object') return false;
        return matchesSearchFilter(item, searchTerm);
      });
      
      const regions = new Set();
      const rolesList = new Set();
      const filtered = [];
      
      afterSearch.forEach(item => {
        const passesRole = matchesRoleFilter(item, filterRole);
        const passesRegion = matchesRegionFilter(item, filterBundesland);
        
        if (passesRole && passesRegion) {
          filtered.push(item);
        }
        
        // For region options: item must match role (but NOT region filter)
        if (passesRole && item.region) {
          regions.add(item.region);
        }
        
        // For role options: item must match region (but NOT role filter)
        if (passesRegion) {
          if (item.type === 'participant') {
            const roles = extractParticipantRoles(item);
            roles.forEach(role => { rolesList.add(role); });
          } else if (item.type === 'team') {
            rolesList.add('Team');
          }
        }
      });
      
      const sorted = filtered.sort((a, b) => {
        const nameA = a.name || '';
        const nameB = b.name || '';
        
        switch (sortBy) {
          case 'name': return nameA.localeCompare(nameB);
          case 'bundesland': return (a.region || '').localeCompare(b.region || '');
          case 'role': return (a.role || '').localeCompare(b.role || '');
          case 'pronouns': return (a.pronouns || '').localeCompare(b.pronouns || '');
          default: return 0;
        }
      });
      
      return {
        availableRegions: Array.from(regions).sort(),
        availableRoles: Array.from(rolesList).sort(),
        filteredItems: sorted
      };
    } catch (error) {
      console.error('Error in filter calculation:', error);
      return { availableRegions: [], availableRoles: [], filteredItems: [] };
    }
  }, [allItems, searchTerm, filterRole, filterBundesland, sortBy]);

  // Handle pagination based on search mode
  const paginatedItems = useMemo(() => {
    if (hasSearchTerm) {
      // Server-side search already handles pagination
      return filteredItems;
    } else {
      // Client-side pagination for fallback mode
      if (pageSize === 'all') {
        return filteredItems;
      }
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      return filteredItems.slice(startIndex, endIndex);
    }
  }, [hasSearchTerm, filteredItems, currentPage, pageSize]);

  // Pagination info based on search mode
  const paginationInfo = useMemo(() => {
    if (hasSearchTerm && searchResponse?.meta) {
      // Use server-side pagination info
      return {
        totalItems: searchResponse.meta.totalCount,
        totalPages: searchResponse.meta.totalPages,
        currentPage: searchResponse.meta.currentPage
      };
    } else {
      // Use client-side pagination info
      const totalItems = filteredItems.length;
      const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalItems / pageSize);
      
      return {
        totalItems,
        totalPages,
        currentPage
      };
    }
  }, [hasSearchTerm, searchResponse, filteredItems.length, pageSize, currentPage]);

  // Auto-reset filters if selected value no longer exists
  const resetInProgress = useRef(false);
  useEffect(() => {
    if (resetInProgress.current) return;
    if (filterBundesland !== 'all' && !availableRegions.includes(filterBundesland)) {
      resetInProgress.current = true;
      setFilterBundesland('all');
      setTimeout(() => { resetInProgress.current = false; }, 0);
    }
  }, [availableRegions, filterBundesland]);

  useEffect(() => {
    if (resetInProgress.current) return;
    if (filterRole !== 'all' && !availableRoles.includes(filterRole)) {
      resetInProgress.current = true;
      setFilterRole('all');
      setTimeout(() => { resetInProgress.current = false; }, 0);
    }
  }, [availableRoles, filterRole]);


  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole, filterBundesland, sortBy]);

  const loading = hasSearchTerm ? searchLoading : (participantsLoading || teamsLoading);
  const error = hasSearchTerm ? searchError : (participantsError || teamsError);
  
  if (loading) return <LoadingSpinner size="xl" text="Teilnehmer*innen und Teams werden geladen..." />;
  if (error) return <div className="text-red-600">Fehler beim Laden der Daten: {error?.message || error}</div>;

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
            placeholder="Teilnehmer*innen und Teams suchen..."
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
            {availableRoles.map(role => (
              <option key={role} value={role}>{translateRole(role)}</option>
            ))}
          </select>
          <select
            value={filterBundesland}
            onChange={(e) => setFilterBundesland(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Alle Bundesländer/Regionen</option>
            {availableRegions.map(bundesland => (
              <option key={bundesland} value={bundesland}>{bundesland}</option>
            ))}
          </select>
        </div>


        {/* Participants and Teams Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedItems.map((item) => {
            const colors = getRoleBasedColors(item);
            return (
              <Link
                key={`${item.type}-${item.id}`}
                to={item.type === 'team' ? `/teams/${item.slug}` : `/participants/${item.slug}`}
                className={`block relative rounded-xl p-6 shadow-sm border hover:shadow-md transition-all duration-200 hover:-translate-y-1 cursor-pointer group ${colors.bg} ${colors.border}`}
              >
                <div className="flex items-start space-x-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold break-words ${colors.text}`}>{item.name}</h3>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                    {(() => {
                      // Handle teams
                      if (item.type === 'team') {
                        return (
                          <>
                            <span className="inline-block mr-1">
                              👥 Team
                            </span>
                            {item.members && item.members.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {item.members.map((member, index) => (
                                  <div key={index} className="flex items-center space-x-2">
                                    <span className="text-blue-500 dark:text-blue-400">•</span>
                                    <span className="text-gray-700 dark:text-gray-300 truncate">{member.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      }
                      
                      // Handle participants
                      // Handle both single role (string) and multiple roles (array)
                      let roles = [];
                      
                      if (Array.isArray(item.roles)) {
                        roles = item.roles.filter(role => 
                          role !== 'Jury' && role !== 'Jury-Mitglied'
                        );
                      } else if (item.role) {
                        // Handle comma-separated roles and filter out Jury roles
                        roles = item.role.includes(',') 
                          ? item.role.split(',').map(r => r.trim())
                          : [item.role];
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
                                     role === 'Team' ? '👥' :
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
              </div>
              
               <div className="space-y-1">
                 {item.pronouns && (
                   <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                     <span>👤 {item.pronouns}</span>
                   </div>
                 )}
                 {item.instagram && (
                   <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                     <span>📸 @{item.instagram}</span>
                   </div>
                 )}
                {item.region && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <span>📍 {item.region}</span>
                  </div>
                )}
                 </div>
                {/* Always-visible bottom-right arrow (decorative) */}
                <div className="absolute bottom-4 right-4" aria-hidden="true">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </div>
               </Link>
             );
           })}
         </div>

        {paginatedItems.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Keine Teilnehmer*innen oder Teams gefunden
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Versuchen Sie andere Suchkriterien oder fügen Sie einen neuen Teilnehmer*innen hinzu.
            </p>
          </div>
        )}

        {/* Pagination Controls */}
        {paginatedItems.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <PaginationControls
              currentPage={paginationInfo.currentPage}
              totalPages={paginationInfo.totalPages}
              pageSize={pageSize}
              totalItems={paginationInfo.totalItems}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[12, 24, 48, 96, 240]}
              showAllOption={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
