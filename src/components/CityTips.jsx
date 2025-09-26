import React, { useState, useEffect } from 'react';
import InteractiveMap from './InteractiveMap';
import hybridDataService from '../services/hybridDataService.js';
import LoadingSpinner from './LoadingSpinner';
import { ErrorMessage, SuccessMessage } from './ErrorBoundary.jsx';

export default function CityTips() {
  // State variables for city tips functionality - Updated
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);


  const categories = [
    { id: 'all', name: 'Alle Kategorien', icon: '🗺️' },
    { id: 'restaurant', name: 'Restaurants', icon: '🍽️' },
    { id: 'cafe', name: 'Cafés', icon: '☕' },
    { id: 'bar', name: 'Bars', icon: '🍺' },
    { id: 'culture', name: 'Kultur', icon: '🎭' },
    { id: 'shopping', name: 'Shopping', icon: '🛍️' },
    { id: 'hotel', name: 'Hotels', icon: '🏨' },
    { id: 'transport', name: 'Transport', icon: '🚇' },
    { id: 'landmark', name: 'Sehenswürdigkeiten', icon: '🏛️' },
    { id: 'neighborhood', name: 'Viertel', icon: '🏘️' },
    { id: 'nature', name: 'Natur', icon: '🌳' },
    { id: 'leisure', name: 'Freizeit', icon: '🏊' },
    { id: 'sports', name: 'Sport', icon: '⚽' }
  ];



  // Load city tips data
  useEffect(() => {
    const loadCityTips = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await hybridDataService.getData('city-tips');
        if (data && data.length > 0) {
          // Transform database data to match component structure
          const transformedData = data.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            description: item.description,
            address: item.address,
            coordinates: { lat: parseFloat(item.latitude), lng: parseFloat(item.longitude) },
            phone: item.contact_info?.phone || null,
            website: item.website,
            priceRange: item.price_range,
            rating: item.rating,
            tips: item.description, // Use description as tips since tips field doesn't exist in new schema
            featured: false // featured field doesn't exist in new schema
          }));
          setLocations(transformedData);
        }
      } catch (err) {
        setError(err.message);
        console.error('Error loading city tips:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCityTips();

    // Subscribe to data changes
    const unsubscribe = hybridDataService.subscribe((dataType) => {
      if (dataType === 'cityTips') {
        console.log('CityTips: Data changed, refreshing...');
        loadCityTips();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const filteredLocations = locations.filter(location => {
    const matchesCategory = categoryFilter === 'all' || location.category === categoryFilter;
    const matchesSearch = location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRating = ratingFilter === 'all' || (location.rating && parseFloat(location.rating) >= parseFloat(ratingFilter));
    return matchesCategory && matchesSearch && matchesRating;
  });



  const getCategoryColor = (category) => {
    const colors = {
      restaurant: 'bg-red-500',
      cafe: 'bg-yellow-500',
      bar: 'bg-blue-500',
      culture: 'bg-purple-500',
      shopping: 'bg-green-500',
      hotel: 'bg-indigo-500',
      transport: 'bg-orange-500',
      landmark: 'bg-red-600',
      neighborhood: 'bg-purple-600',
      nature: 'bg-green-600',
      leisure: 'bg-cyan-500',
      sports: 'bg-orange-600'
    };
    return colors[category] || 'bg-gray-500';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      restaurant: '🍽️',
      cafe: '☕',
      bar: '🍺',
      culture: '🎭',
      shopping: '🛍️',
      hotel: '🏨',
      transport: '🚇',
      landmark: '🏛️',
      neighborhood: '🏘️',
      nature: '🌳',
      leisure: '🏊',
      sports: '⚽'
    };
    return icons[category] || '📍';
  };

  const handleLocationClick = (location) => {
    setSelectedLocation(location);
    // Here you could add logic to center the map on the selected location
    console.log('Selected location:', location);
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Chemnitz Tipps & Empfehlungen</h1>
          <p className="text-gray-600 dark:text-gray-400">Entdecke die besten Orte und Aktivitäten in Chemnitz</p>
        </div>

        {/* Search and Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <input
            type="text"
            placeholder="Orte durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Alle Kategorien</option>
            <option value="restaurant">Restaurants</option>
            <option value="cafe">Cafés</option>
            <option value="bar">Bars</option>
            <option value="culture">Kultur</option>
            <option value="shopping">Shopping</option>
            <option value="hotel">Hotels</option>
            <option value="transport">Transport</option>
            <option value="landmark">Sehenswürdigkeiten</option>
            <option value="neighborhood">Viertel</option>
            <option value="nature">Natur</option>
            <option value="leisure">Freizeit</option>
            <option value="sports">Sport</option>
          </select>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Alle Bewertungen</option>
            <option value="4.5">4.5+ Sterne</option>
            <option value="4.0">4.0+ Sterne</option>
            <option value="3.5">3.5+ Sterne</option>
          </select>
        </div>

        {/* Map and List Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map Section */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 sm:p-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2 sm:mb-4">Karte</h2>
            <InteractiveMap 
              locations={filteredLocations}
              onLocationClick={handleLocationClick}
              selectedLocation={selectedLocation}
            />
          </div>

          {/* List Section */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 sm:p-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2 sm:mb-4">Empfohlene Orte</h2>
            <div className="space-y-3 sm:space-y-4 max-h-80 sm:max-h-96 overflow-y-auto">
              {filteredLocations.map((location) => (
                <div
                  key={location.id}
                  onClick={() => handleLocationClick(location)}
                  className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 cursor-pointer hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                        {location.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm sm:text-base">{location.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{location.description}</p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center space-x-1">
                          <span>📍</span>
                          <span className="truncate">{location.category}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span>⭐</span>
                          <span>{location.rating}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span>💰</span>
                          <span>{location.priceRange}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {filteredLocations.length === 0 && (
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
