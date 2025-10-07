import React, { useState, useEffect, useMemo } from 'react';
import InteractiveMap from './InteractiveMap';
import { useCityTips } from '../hooks/index.js';
import LoadingSpinner from './LoadingSpinner';
import { ErrorMessage } from './StatusMessages.jsx';

export default function CityTips() {
  const { data: cityTipsData, isLoading: loading, error } = useCityTips();
  // State variables for city tips functionality
  const [locations, setLocations] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const [priceFilter, setPriceFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  
  const categories = [
    { id: 'all', name: 'Alle Kategorien', icon: '🗺️', color: 'bg-gray-500' },
    { id: 'restaurant', name: 'Restaurants', icon: '🍽️', color: 'bg-red-500' },
    { id: 'cafe', name: 'Cafés', icon: '☕', color: 'bg-yellow-500' },
    { id: 'bar', name: 'Bars', icon: '🍺', color: 'bg-blue-500' },
    { id: 'culture', name: 'Kultur', icon: '🎭', color: 'bg-purple-500' },
    { id: 'shopping', name: 'Shopping', icon: '🛍️', color: 'bg-green-500' },
    { id: 'hotel', name: 'Hotels', icon: '🏨', color: 'bg-indigo-500' },
    { id: 'transport', name: 'Transport', icon: '🚇', color: 'bg-orange-500' },
    { id: 'landmark', name: 'Sehenswürdigkeiten', icon: '🏛️', color: 'bg-red-600' },
    { id: 'nature', name: 'Natur', icon: '🌳', color: 'bg-green-600' },
    { id: 'leisure', name: 'Freizeit', icon: '🏊', color: 'bg-cyan-500' },
    { id: 'sports', name: 'Sport', icon: '⚽', color: 'bg-orange-600' }
  ];

  const priceRanges = [
    { id: 'all', name: 'Alle Preise', icon: '💰' },
    { id: '€', name: 'Günstig', icon: '€' },
    { id: '€€', name: 'Mittel', icon: '€€' },
    { id: '€€€', name: 'Teuer', icon: '€€€' },
    { id: '€€€€', name: 'Luxus', icon: '€€€€' }
  ];

  // Load city tips data
  // Update local state when useLiveData changes
  useEffect(() => {
    if (cityTipsData && cityTipsData.length > 0) {
      // Transform database data to match component structure
      const transformedData = cityTipsData.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        description: item.description,
        address: item.address,
        coordinates: { lat: parseFloat(item.latitude), lng: parseFloat(item.longitude) },
        phone: item.contact_info?.phone || null,
        website: item.website,
        priceRange: item.price_range,
        
        tips: item.tips || item.description,
        featured: item.is_featured || false,
        slug: item.slug,
        images: item.images || [],
        openingHours: item.opening_hours,
        contactInfo: item.contact_info
      }));
      setLocations(transformedData);
    } else {
      setLocations([]);
    }
  }, [cityTipsData]);

  // Memoized filtered and sorted locations
  const filteredAndSortedLocations = useMemo(() => {
    let filtered = locations.filter(location => {
      const matchesCategory = categoryFilter === 'all' || location.category === categoryFilter;
      const matchesSearch = location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           location.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           location.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPrice = priceFilter === 'all' || location.priceRange === priceFilter;
      return matchesCategory && matchesSearch && matchesPrice;
    });

    // Sort locations
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'featured':
          return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [locations, categoryFilter, searchTerm, priceFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedLocations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLocations = filteredAndSortedLocations.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, searchTerm, priceFilter, sortBy]);

  const getCategoryColor = (category) => {
    const categoryObj = categories.find(cat => cat.id === category);
    return categoryObj?.color || 'bg-gray-500';
  };

  const getCategoryIcon = (category) => {
    const categoryObj = categories.find(cat => cat.id === category);
    return categoryObj?.icon || '📍';
  };

  const getCategoryLabel = (category) => {
    const labels = {
      restaurant: 'Restaurant',
      cafe: 'Café',
      bar: 'Bar',
      culture: 'Kultur',
      shopping: 'Shopping',
      hotel: 'Hotel',
      transport: 'Transport',
      landmark: 'Sehenswürdigkeit',
      nature: 'Natur',
      leisure: 'Freizeit',
      sports: 'Sport'
    };
    return labels[category] || 'Stadt-Tipp';
  };

  const handleLocationClick = (location) => {
    setSelectedLocation(location);
    // This will show the popup on the map, but won't navigate to detail view
    // The popup "Details anzeigen" button will handle navigation
  };

  const handleDetailsClick = (location) => {
    // Navigate directly to detail page
    const slug = location.slug || location.id;
    window.location.href = `/city-tips/${slug}`;
  };

  const getPriceRangeText = (priceRange) => {
    const ranges = {
      '€': 'Günstig',
      '€€': 'Mittel',
      '€€€': 'Teuer',
      '€€€€': 'Luxus'
    };
    return ranges[priceRange] || 'Unbekannt';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🗺️</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Stadt-Tipps werden geladen...</h3>
        <p className="text-gray-600 dark:text-gray-400">Bitte warten Sie einen Moment</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Fehler beim Laden der Stadt-Tipps</h3>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div data-testid="city-tips-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Error and Success Messages */}
      {error && (
        <ErrorMessage 
          error={error} 
          onRetry={() => window.location.reload()} 
          className="max-w-4xl mx-auto"
        />
      )}
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Chemnitz Tipps & Empfehlungen</h1>
          <p className="text-gray-600 dark:text-gray-400">Entdecke die besten Orte und Aktivitäten in Chemnitz</p>
        </div>

        {/* Enhanced Search and Filter Controls */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Orte durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-gray-400 text-lg">🔍</span>
            </div>
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Alle Kategorien</option>
              {categories.slice(1).map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>

            

            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">💰 Alle Preise</option>
              {priceRanges.slice(1).map(price => (
                <option key={price.id} value={price.id}>
                  {price.icon} {price.name}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="name">Sortieren nach Name</option>
              
              
              <option value="featured">Empfohlene zuerst</option>
            </select>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {categories.slice(0, 8).map((category) => (
              <button
                key={category.id}
                onClick={() => setCategoryFilter(category.id)}
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  categoryFilter === category.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {filteredAndSortedLocations.length} Orte gefunden
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Karte</h2>
        <div className="h-[45vh] sm:h-[50vh] lg:h-[55vh] min-h-[320px] max-h-[560px] relative overflow-hidden">
          <InteractiveMap 
            locations={filteredAndSortedLocations}
            onLocationClick={handleLocationClick}
            selectedLocation={selectedLocation}
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Empfohlene Orte
        </h2>
        
        {/* Results Grid/List */}
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        }`}>
          {paginatedLocations.map((location) => (
            <div
              key={location.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all duration-200 group overflow-hidden cursor-pointer ${
                viewMode === 'list' ? 'p-5 flex items-center space-x-5' : 'p-5'
              }`}
              onClick={() => handleLocationClick(location)}
            >
              {viewMode === 'grid' ? (
                // Grid View
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md ${getCategoryColor(location.category)}`}>
                          {getCategoryIcon(location.category)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate" title={location.name}>
                          {location.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 overflow-hidden" style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: '1.4',
                          maxHeight: '2.8em'
                        }}>
                          {location.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 truncate" title={location.address}>
                          📍 {location.address}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1"></div>
                  </div>
                  
                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(location.category)} text-white`}>
                      {getCategoryIcon(location.category)} {getCategoryLabel(location.category)}
                    </span>
                    
                    {location.priceRange && (
                      <span className="flex items-center space-x-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                        <span>💰</span>
                        <span>{location.priceRange}</span>
                      </span>
                    )}
                    {location.featured && (
                      <span className="flex items-center space-x-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full">
                        <span>⭐</span>
                        <span>Empfohlen</span>
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDetailsClick(location);
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm font-medium"
                    >
                      Details anzeigen →
                    </button>
                    <div className="flex items-center space-x-2">
                    </div>
                  </div>
                </div>
              ) : (
                // List View
                <div className="flex items-center space-x-4 w-full">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md ${getCategoryColor(location.category)}`}>
                      {getCategoryIcon(location.category)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate" title={location.name}>
                        {location.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {location.priceRange && (
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {location.priceRange}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 overflow-hidden" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: '1.4',
                      maxHeight: '2.8em'
                    }}>
                      {location.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 truncate" title={location.address}>
                      📍 {location.address}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDetailsClick(location)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Details
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-6">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Zurück
            </button>
            <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
              Seite {currentPage} von {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Weiter
            </button>
          </div>
        )}

        {filteredAndSortedLocations.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🏙️</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Keine Orte gefunden
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Versuchen Sie andere Suchkriterien oder schauen Sie später wieder vorbei.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}