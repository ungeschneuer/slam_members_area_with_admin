import React, { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCityTipBySlug, usePageTitle } from '../hooks/index.js';
import LoadingSpinner from './LoadingSpinner.jsx';
import { createMap, destroyMap, createDefaultIcon, createMarkerWithPopup, isValidCoordinates } from '../utils/leafletUtils.js';
import { geocodingService } from '../services/geocodingService.js';
import { getContentTypeGradient } from '../utils/detailViewUtils.js';
import { handleLinkClick } from '../utils/linkUtils.js';
import { getCategoryIcon, getCategoryLabel } from '../utils/categoryUtils.js';
import BackButton from './shared/BackButton.jsx';

const CityTipDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: cityTip, isLoading: loading, error } = useCityTipBySlug(slug);
  
  // Set dynamic page title
  usePageTitle(cityTip?.name || cityTip?.title || 'Laden...');
  
  const [showFullDescription, setShowFullDescription] = useState(false);
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);

  // City tip data is now provided directly by useCityTipBySlug hook

  // Initialize Leaflet map when cityTip is loaded
  useEffect(() => {
    if (!cityTip) return;

    const initMap = async (lat, lng) => {
      if (!mapContainerRef.current) return;
      
      // Clean up existing map
      if (leafletMapRef.current) {
        destroyMap(leafletMapRef.current);
        leafletMapRef.current = null;
      }

      try {
        // Initialize map with standardized utilities
        const { map } = createMap(mapContainerRef.current);
        map.setView([lat, lng], 16);
        leafletMapRef.current = map;

        // Add marker with popup
        const popupContent = cityTip.name || 'Ort';
        createMarkerWithPopup(
          map, 
          lat, 
          lng, 
          popupContent, 
          { icon: createDefaultIcon() }
        );
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    // Leaflet CSS is now statically imported above

    // Prefer coordinates from either structured object or raw fields
    if (cityTip.coordinates && isValidCoordinates(cityTip.coordinates.lat, cityTip.coordinates.lng)) {
      initMap(cityTip.coordinates.lat, cityTip.coordinates.lng);
      return;
    }
    if (typeof cityTip.latitude !== 'undefined' && typeof cityTip.longitude !== 'undefined') {
      const latNum = parseFloat(cityTip.latitude);
      const lngNum = parseFloat(cityTip.longitude);
      if (isValidCoordinates(latNum, lngNum)) {
        initMap(latNum, lngNum);
        return;
      }
    }

    const address = cityTip?.address;
    if (address) {
      geocodingService.geocodeAddress(address)
        .then(result => {
          initMap(result.lat, result.lng);
        })
        .catch(error => {
          const processedError = geocodingService.handleError(error);
          console.warn('Geocoding failed:', processedError.message);
          // Could show user notification here if needed
        });
    }
  }, [cityTip]);

  // Cleanup map on component unmount
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        destroyMap(leafletMapRef.current);
        leafletMapRef.current = null;
      }
    };
  }, []);

  

  

  

  const getPriceRangeLabel = (priceRange) => {
    const labels = {
      'Free': 'Kostenlos',
      '€': 'Günstig',
      '€€': 'Mittel',
      '€€€': 'Teuer',
      '€€€€': 'Sehr teuer'
    };
    return labels[priceRange] || priceRange;
  };

  


  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mr-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Fehler</h3>
                <p className="text-red-600 dark:text-red-400">{error?.message || error}</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/city-tips')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Zurück zur Übersicht
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!cityTip) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🏙️</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Stadt-Tipp nicht gefunden</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Der angeforderte Stadt-Tipp konnte nicht gefunden werden.
            </p>
            <button 
              onClick={() => navigate('/city-tips')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Zurück zur Übersicht
            </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <li>
              <Link to="/city-tips" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Stadt-Tipps
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 dark:text-white font-medium">{cityTip.name}</li>
          </ol>
        </nav>

        {/* Top Back Button */}
        <div className="mb-6">
          <BackButton to="/city-tips">
            Zurück zur Übersicht
          </BackButton>
        </div>

        {/* Hero Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          {/* Header with actions */}
          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start space-x-4">
              <div className={`w-16 h-16 bg-${getContentTypeGradient('cityTip')} rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
                {getCategoryIcon(cityTip.category, 'cityTip')}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {cityTip.name}
                </h1>
              </div>
            </div>
          </div>

          {/* Quick info grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <span className="text-gray-500 dark:text-gray-400 mt-1 text-xl">📍</span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Adresse</h3>
                  <p className="text-gray-700 dark:text-gray-300">{cityTip.address}</p>
                  {cityTip.coordinates && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Koordinaten: {cityTip.coordinates.lat}, {cityTip.coordinates.lng}
                    </p>
                  )}
                </div>
              </div>
              
              
              {cityTip.website && (
                <div className="flex items-start space-x-3">
                  <span className="text-gray-500 dark:text-gray-400 mt-1 text-xl">🌐</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Website</h3>
                    <a 
                      href={cityTip.website}
                      onClick={(e) => {
                        const websiteLink = {
                          url: cityTip.website,
                          title: 'Website besuchen',
                          is_external: true
                        };
                        handleLinkClick(websiteLink, e);
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Website besuchen
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {cityTip.description && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="mr-2">📝</span>
                  Beschreibung
                </h2>
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {showFullDescription ? cityTip.description : cityTip.description.substring(0, 300)}
                    {cityTip.description.length > 300 && !showFullDescription && '...'}
                  </div>
                  {cityTip.description.length > 300 && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="mt-3 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                    >
                      {showFullDescription ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                    </button>
                  )}
                </div>
              </div>
            )}
            {/* Leaflet Map in main column */}
            {(cityTip.address || cityTip.coordinates) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="mr-2">🗺️</span>
                  Karte
                </h2>
                <div ref={mapContainerRef} className="w-full h-72 rounded-lg" />
                
              </div>
            )}

            {/* Tips */}
            {cityTip.tips && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="mr-2">💡</span>
                  Insider-Tipps
                </h2>
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {cityTip.tips}
                  </div>
                </div>
              </div>
            )}

            {/* Images Gallery */}
            {cityTip.images && cityTip.images.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="mr-2">📸</span>
                  Bilder ({cityTip.images.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {cityTip.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image.url || image}
                        alt={`${cityTip.name} - Bild ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg shadow-md group-hover:shadow-lg transition-shadow"
                        loading="lazy"
                      />
                      {image.caption && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{image.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Opening Hours */}
            {cityTip.opening_hours && cityTip.opening_hours !== '{}' && cityTip.opening_hours.trim() !== '' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="mr-2">🕒</span>
                  Öffnungszeiten
                </h2>
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {cityTip.opening_hours}
                </div>
              </div>
            )}


            {/* Additional Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Weitere Informationen</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">Kategorie</h3>
                  <p className="text-gray-600 dark:text-gray-400">{getCategoryLabel(cityTip.category, 'cityTip')}</p>
                </div>
                {cityTip.price_range && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">Preisklasse</h3>
                    <p className="text-gray-600 dark:text-gray-400">{getPriceRangeLabel(cityTip.price_range)}</p>
                  </div>
                )}
                
              </div>
            </div>

            {/* Map Navigation */}
            {cityTip.address && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="mr-2">🗺️</span>
                  Navigation
                </h2>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Öffne diesen Ort in deiner bevorzugten Karten-App:
                  </p>
                  
                  {/* Google Maps Button */}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cityTip.address)}`}
                    onClick={(e) => {
                      const googleMapsLink = {
                        url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cityTip.address)}`,
                        title: 'In Google Maps öffnen',
                        is_external: true
                      };
                      handleLinkClick(googleMapsLink, e);
                    }}
                    className="flex items-center justify-center w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    In Google Maps öffnen
                  </a>
                  
                  {/* Apple Maps Button */}
                  <a
                    href={`https://maps.apple.com/?q=${encodeURIComponent(cityTip.address)}`}
                    onClick={(e) => {
                      const appleMapsLink = {
                        url: `https://maps.apple.com/?q=${encodeURIComponent(cityTip.address)}`,
                        title: 'In Apple Maps öffnen',
                        is_external: true
                      };
                      handleLinkClick(appleMapsLink, e);
                    }}
                    className="flex items-center justify-center w-full px-4 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    In Apple Maps öffnen
                  </a>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    📍 {cityTip.address}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Back Button */}
        <div className="mt-8">
          <BackButton onClick={() => navigate('/city-tips')}>
            Zurück zur Übersicht
          </BackButton>
        </div>
      </div>
    </div>
  );
};

export default CityTipDetail;