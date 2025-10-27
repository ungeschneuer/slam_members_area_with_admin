import React, { useState, useEffect, useMemo, useRef } from 'react';
import InteractiveMap from './InteractiveMap';
import { useCityTips, usePageTitle } from '../hooks/index.js';
import LoadingSpinner from './LoadingSpinner';
import { ErrorMessage } from './StatusMessages.jsx';
import { getCategoryOptionsWithAll } from '../../shared/constants/cityTipsCategories.js';
import { getAvailableContentFilterOptions, validateFilterValue } from '../utils/filterUtils.js';
import { getCategoryIcon, getCategoryLabel, getCategoryColor } from '../utils/categoryUtils.js';

export default function CityTips() {
  usePageTitle('Stadt-Tipps');
  const { data: cityTipsData = [], isLoading: loading, error } = useCityTips();
  // State variables for city tips functionality
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const [priceFilter, setPriceFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  // Extract matching logic to reusable functions
  const matchesSearchFilter = (location, search) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    
    // Early returns for performance
    if (location.name.toLowerCase().includes(searchLower)) return true;
    if (location.address.toLowerCase().includes(searchLower)) return true;
    if (location.description.toLowerCase().includes(searchLower)) return true;
    
    return false;
  };

  const matchesCategoryFilter = (location, categoryFilter) => {
    return categoryFilter === 'all' || location.category === categoryFilter;
  };

  const matchesPriceFilter = (location, priceFilter) => {
    return priceFilter === 'all' || location.priceRange === priceFilter;
  };
  
  const predefinedCategories = useMemo(() => {
    return getCategoryOptionsWithAll().map(cat => ({
      id: cat.value,
      name: cat.label,
      icon: cat.icon,
      color: cat.color
    }));
  }, []);

  const predefinedPriceRanges = [
    { id: 'all', name: 'Alle Preise', icon: '💰' },
    { id: 'Kostenlos', name: 'Kostenlos', icon: '🆓' },
    { id: '€', name: 'Günstig', icon: '€' },
    { id: '€€', name: 'Mittel', icon: '€€' },
    { id: '€€€', name: 'Teuer', icon: '€€€' },
    { id: '€€€€', name: 'Luxus', icon: '€€€€' }
  ];

  // Transform database data to match component structure using useMemo
  const locations = useMemo(() => {
    if (!cityTipsData || cityTipsData.length === 0) return [];
    
    return cityTipsData.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description,
      address: item.address,
      coordinates: { lat: parseFloat(item.latitude), lng: parseFloat(item.longitude) },
      website: item.website,
      priceRange: item.price_range,
      
      tips: item.tips || item.description,
      featured: item.is_featured || false,
      slug: item.slug,
      images: item.images || [],
      openingHours: item.opening_hours
    }));
  }, [cityTipsData]);

  // Single-pass cascading filter options and results
  const { categories, priceRanges, filteredAndSortedLocations } = useMemo(() => {
    try {
      // Handle empty or invalid datasets
      if (!Array.isArray(locations) || locations.length === 0) {
        return {
          categories: predefinedCategories,
          priceRanges: predefinedPriceRanges,
          filteredAndSortedLocations: []
        };
      }
    
    const afterSearch = locations.filter(location => {
      if (!location || typeof location !== 'object') return false;
      return matchesSearchFilter(location, searchTerm);
    });
    
    const cats = new Set();
    const prices = new Set();
    const filtered = [];
    
    afterSearch.forEach(location => {
      const passesCategory = matchesCategoryFilter(location, categoryFilter);
      const passesPrice = matchesPriceFilter(location, priceFilter);
      
      if (passesCategory && passesPrice) {
        filtered.push(location);
      }
      
      // For category options: match price (but NOT category filter)
      if (passesPrice && location.category) {
        cats.add(location.category);
      }
      
      // For price options: match category (but NOT price filter)
      if (passesCategory && location.priceRange) {
        prices.add(location.priceRange);
      }
    });
    
    const categoryOpts = [
      predefinedCategories[0], // "Alle Kategorien"
      ...Array.from(cats).map(cat => 
        predefinedCategories.find(opt => opt.id === cat) || { id: cat, name: cat }
      )
    ].filter(Boolean);
    
    const priceOpts = [
      predefinedPriceRanges[0], // "Alle Preise"
      ...Array.from(prices).map(price => 
        predefinedPriceRanges.find(opt => opt.id === price) || { id: price, name: price }
      )
    ].filter(Boolean);
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'category': return a.category.localeCompare(b.category);
        default: return 0;
      }
    });
    
      return {
        categories: categoryOpts,
        priceRanges: priceOpts,
        filteredAndSortedLocations: filtered
      };
    } catch (error) {
      console.error('Error in filter calculation:', error);
      // Return safe defaults on error
      return {
        categories: predefinedCategories,
        priceRanges: predefinedPriceRanges,
        filteredAndSortedLocations: []
      };
    }
  }, [locations, searchTerm, categoryFilter, priceFilter, sortBy]);

  // Available category chips (limited to first 8)
  const availableCategoryChips = useMemo(() => {
    return categories.slice(0, 8);
  }, [categories]);

  // Auto-reset logic (with loop prevention)
  const resetInProgress = useRef(false);
  
  useEffect(() => {
    if (resetInProgress.current) return;
    if (!categories.some(opt => opt.id === categoryFilter)) {
      resetInProgress.current = true;
      setCategoryFilter('all');
      setTimeout(() => { resetInProgress.current = false; }, 0);
    }
  }, [categories, categoryFilter]);

  useEffect(() => {
    if (resetInProgress.current) return;
    if (!priceRanges.some(opt => opt.id === priceFilter)) {
      resetInProgress.current = true;
      setPriceFilter('all');
      setTimeout(() => { resetInProgress.current = false; }, 0);
    }
  }, [priceRanges, priceFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedLocations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLocations = filteredAndSortedLocations.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, searchTerm, priceFilter, sortBy]);

  // Use centralized category utilities directly

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
        <div className="w-24 h-24 bg-[#A2D2B9]/20 dark:bg-[#185757]/30 rounded-full flex items-center justify-center mx-auto mb-4">
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
        <p className="text-gray-600 dark:text-gray-400">{error?.message || error}</p>
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
      <div className="page-header-card">
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
              <option value="all">{getCategoryLabel('all', 'cityTip')}</option>
              {categories.slice(1).map(category => (
                <option key={category.id} value={category.id}>
                  {getCategoryIcon(category.id, 'cityTip')} {getCategoryLabel(category.id, 'cityTip')}
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

          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {availableCategoryChips.map((category) => (
              <button
                key={category.id}
                onClick={() => setCategoryFilter(category.id)}
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  categoryFilter === category.id
                    ? 'bg-[#A2D2B9]/20 dark:bg-[#185757]/30 text-[#185757] dark:text-[#A2D2B9]'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span className="mr-2">{getCategoryIcon(category.id, 'cityTip')}</span>
                {getCategoryLabel(category.id, 'cityTip')}
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
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-[#A2D2B9]/20 dark:bg-[#185757]/30 text-[#185757] dark:text-[#A2D2B9]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-[#A2D2B9]/20 dark:bg-[#185757]/30 text-[#185757] dark:text-[#A2D2B9]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="page-header-card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Karte</h2>
        <div className="h-[55vh] sm:h-[50vh] lg:h-[55vh] min-h-[400px] max-h-[560px] relative overflow-hidden">
          <InteractiveMap 
            locations={filteredAndSortedLocations}
            onLocationClick={handleLocationClick}
            selectedLocation={selectedLocation}
            availableCategories={categories}
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="page-header-card">
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
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md ${getCategoryColor(location.category, 'cityTip')}`}>
                          {getCategoryIcon(location.category, 'cityTip')}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-[#185757] dark:group-hover:text-[#A2D2B9] transition-colors text-sm leading-tight" title={location.name}>
                          {location.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 overflow-hidden" style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: '1.3',
                          maxHeight: '3.9em'
                        }}>
                          {location.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 leading-tight" title={location.address}>
                          📍 {location.address}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1"></div>
                  </div>
                  
                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(location.category, 'cityTip')} text-white`}>
                      {getCategoryIcon(location.category, 'cityTip')} {getCategoryLabel(location.category, 'cityTip')}
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
                      className="text-[#185757] dark:text-[#A2D2B9] hover:text-[#0f3a3b] dark:hover:text-[#8BC4A3] text-sm font-medium"
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
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md ${getCategoryColor(location.category, 'cityTip')}`}>
                      {getCategoryIcon(location.category, 'cityTip')}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#185757] dark:group-hover:text-[#A2D2B9] transition-colors text-sm leading-tight" title={location.name}>
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
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: '1.3',
                      maxHeight: '3.9em'
                    }}>
                      {location.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 leading-tight" title={location.address}>
                      📍 {location.address}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDetailsClick(location)}
                      className="px-4 py-2 bg-[#185757] text-white rounded-lg hover:bg-[#0f3a3b] transition-colors text-sm"
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
              Stadt-Tipps kommt bald :)
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Bald gibt es hier tolle Empfehlungen für Berlin!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}