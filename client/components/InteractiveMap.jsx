import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  createMap,
  destroyMap,
  removeMarker,
  resizeMap,
  createCustomIcon,
  createMarkerWithPopup,
  isValidCoordinates
} from '../utils/leafletUtils.js';
import { getCategoryByValue, getCategoryHexColor } from '../../shared/constants/categories.js';
import logger from '../services/logger.js';

export default function InteractiveMap({ locations, onLocationClick, selectedLocation, availableCategories = [] }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [showTileError, setShowTileError] = useState(false);
  const [mapError, setMapError] = useState(null);
  const tileLayerRef = useRef(null);
  const errorTimeoutRef = useRef(null);
  const errorCountRef = useRef(0);

  // Initialize map
  const initializeMap = useCallback(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      const { map, tileLayer } = createMap(mapRef.current);
      map.setView([50.8275, 12.9247], 14);
      
      // Store tileLayer reference for cleanup
      tileLayerRef.current = tileLayer;
      
      // Track tile errors with debouncing
      const handleTileError = () => {
        errorCountRef.current++;

        // Clear existing timeout
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
        }

        // Show error after 5 failed tiles
        if (errorCountRef.current >= 5) {
          setShowTileError(true);
        }

        // Reset error count after 5 seconds of no errors
        errorTimeoutRef.current = setTimeout(() => {
          errorCountRef.current = 0;
          setShowTileError(false);
        }, 5000);
      };
      
      tileLayer.on('tileerror', handleTileError);
      
      mapInstanceRef.current = map;
      setIsMapReady(true);
      setMapError(null);
    } catch (error) {
      logger.error('Error initializing map', { error: error.message });
      setMapError('Karte konnte nicht geladen werden');
    }
  }, []);

  // Cleanup map
  const cleanupMap = useCallback(() => {
    // Clear error timeout to prevent memory leak
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    errorCountRef.current = 0;

    if (mapInstanceRef.current) {
      try {
        // Clear all markers first
        markersRef.current.forEach(marker => {
          removeMarker(mapInstanceRef.current, marker);
        });
        markersRef.current = [];

        // Remove tile layer listeners
        if (tileLayerRef.current) {
          tileLayerRef.current.off('tileerror');
          tileLayerRef.current = null;
        }

        // Remove map instance
        destroyMap(mapInstanceRef.current);
        mapInstanceRef.current = null;
        setIsMapReady(false);
        setShowTileError(false);
      } catch (error) {
        logger.error('Error cleaning up map', { error: error.message });
      }
    }
  }, []);

  useEffect(() => {
    // Initialize map when component mounts
    const timer = setTimeout(() => {
      initializeMap();
    }, 100); // Small delay to ensure DOM is ready

    return () => {
      clearTimeout(timer);
      cleanupMap();
    };
  }, [initializeMap, cleanupMap]);

  // Update markers when locations change
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !locations) return;

    const map = mapInstanceRef.current;

    try {
      // Clear existing markers safely
      markersRef.current.forEach(marker => {
        removeMarker(map, marker);
      });
      markersRef.current = [];

      // Add markers for each location
      locations.forEach(location => {
        if (!isValidCoordinates(location.coordinates?.lat, location.coordinates?.lng)) {
          console.warn('Invalid location coordinates:', location);
          return;
        }

        const marker = createMarkerWithPopup(
          map, 
          location.coordinates.lat, 
          location.coordinates.lng, 
          null, // popup will be set below
          { icon: createCustomIcon(location.category) }
        );

        // Add popup with location info (escape HTML to prevent XSS)
        const escapeHtml = (str) => {
          if (!str) return '';
          return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        };
        const safeName = escapeHtml(location.name) || 'Unbekannter Ort';
        const safeAddress = escapeHtml(location.address) || '';
        const safeSlug = encodeURIComponent(location.slug || location.id);
        const popupContent = `
          <div style="min-width: 160px; max-width: 220px;">
            <h3 style="margin: 0 0 6px 0; font-weight: bold; color: #1f2937; font-size: 16px;">${safeName}</h3>
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">${safeAddress}</p>
            <div style="display: flex; justify-content: flex-end; align-items: center;">
              <button
                onclick="window.location.href='/city-tips/${safeSlug}'"
                style="
                  padding: 4px 8px;
                  background-color: #3b82f6;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 11px;
                  font-weight: 500;
                  transition: background-color 0.2s;
                "
                onmouseover="this.style.backgroundColor='#2563eb'"
                onmouseout="this.style.backgroundColor='#3b82f6'"
              >
                Details
              </button>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        // Add click handler
        marker.on('click', () => {
          if (onLocationClick) {
            onLocationClick(location);
          }
        });

        markersRef.current.push(marker);
      });

      // Fit map to show all markers
      if (markersRef.current.length > 0) {
        const group = new L.featureGroup(markersRef.current);
        map.fitBounds(group.getBounds().pad(0.1));
      }

      // Highlight selected location
      if (selectedLocation) {
        const selectedMarker = markersRef.current.find(marker => {
          const latlng = marker.getLatLng();
          // Handle both coordinate structures: coordinates.lat/lng or direct latitude/longitude
          const selectedLat = selectedLocation.coordinates?.lat || selectedLocation.latitude;
          const selectedLng = selectedLocation.coordinates?.lng || selectedLocation.longitude;
          return latlng.lat === selectedLat && latlng.lng === selectedLng;
        });
        
        if (selectedMarker) {
          // Get marker position
          const markerLatLng = selectedMarker.getLatLng();
          
          // Open popup first to get its size
          selectedMarker.openPopup();
          
          // Wait for popup to render, then adjust view
          setTimeout(() => {
            // Get popup element to calculate its size
            const popup = selectedMarker.getPopup();
            if (popup && popup.getElement()) {
              const popupElement = popup.getElement();
              const popupRect = popupElement.getBoundingClientRect();
              const mapContainer = map.getContainer();
              const mapRect = mapContainer.getBoundingClientRect();
              
              // Calculate popup center and map center
              const popupCenterX = popupRect.left + popupRect.width / 2;
              const popupCenterY = popupRect.top + popupRect.height / 2;
              const mapCenterX = mapRect.left + mapRect.width / 2;
              const mapCenterY = mapRect.top + mapRect.height / 2;
              
              // Calculate if popup extends beyond map bounds
              const popupLeft = popupRect.left;
              const popupRight = popupRect.right;
              const popupTop = popupRect.top;
              const popupBottom = popupRect.bottom;
              
              // Check if popup is outside map bounds
              const isOutsideLeft = popupLeft < mapRect.left;
              const isOutsideRight = popupRight > mapRect.right;
              const isOutsideTop = popupTop < mapRect.top;
              const isOutsideBottom = popupBottom > mapRect.bottom;
              
              if (isOutsideLeft || isOutsideRight || isOutsideTop || isOutsideBottom) {
                // Calculate offset to center the popup in the map view
                const offsetX = isOutsideLeft ? (mapRect.left - popupLeft) : 
                               isOutsideRight ? (mapRect.right - popupRight) : 0;
                const offsetY = isOutsideTop ? (mapRect.top - popupTop) : 
                               isOutsideBottom ? (mapRect.bottom - popupBottom) : 0;
                
                // Convert pixel offset to lat/lng offset
                const point = map.latLngToContainerPoint(markerLatLng);
                const newPoint = L.point(point.x - offsetX, point.y - offsetY);
                const newLatLng = map.containerPointToLatLng(newPoint);
                
                // Set view with adjusted position
                map.setView(newLatLng, map.getZoom());
              } else {
                // Popup is fully visible, just center on marker
                map.setView(markerLatLng, map.getZoom());
              }
            } else {
              // Fallback: just center on marker
              map.setView(markerLatLng, map.getZoom());
            }
          }, 150); // Slightly longer delay to ensure popup is fully rendered
        }
      }
    } catch (error) {
      logger.error('Error updating markers', { error: error.message });
    }
  }, [isMapReady, locations, selectedLocation, onLocationClick]);

  // Handle container size changes
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !mapRef.current) return;

    // Use ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        resizeMap(mapInstanceRef.current);
      }
    });

    resizeObserver.observe(mapRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isMapReady]);

  return (
    <div className="relative w-full h-full">
      {mapError && (
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 rounded-lg px-6 py-4 shadow-lg z-[1000] max-w-md"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
            <span>⚠️</span>
            <span>{mapError}</span>
          </p>
        </div>
      )}

      {showTileError && !mapError && (
        <div
          className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-50 border border-yellow-400 rounded-lg px-4 py-2 shadow-lg z-[1000] max-w-md"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm text-yellow-800 flex items-center gap-2">
            <span>ℹ️</span>
            <span>Kartenkacheln vorübergehend nicht verfügbar. Standorte sind weiterhin sichtbar.</span>
          </p>
        </div>
      )}

      <div
        ref={mapRef}
        className="w-full h-full rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-600"
        style={{
          zIndex: 1,
          position: 'relative',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
        role="application"
        aria-label="Interaktive Karte von Chemnitz mit Standorten"
        aria-roledescription="Interaktive Karte"
      />
      
      {/* Map Legend - Collapsible - Hidden on mobile */}
      <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 border border-gray-200 dark:border-gray-600 max-w-xs hidden sm:block">
        <div className="p-3">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center justify-between">
            <span>Legende</span>
            <button
              type="button"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Legende ein-/ausblenden"
            >
              <span aria-hidden="true">📋</span>
            </button>
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {useMemo(() => {
              return availableCategories
                .filter(cat => cat.id !== 'all') // Exclude "all" option
                .map(category => {
                  const categoryData = getCategoryByValue(category.id);
                  const hexColor = getCategoryHexColor(category.id);
                  
                  return (
                    <div key={category.id} className="flex items-center gap-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
                      <span className="text-sm">{categoryData?.icon || '📍'}</span>
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: hexColor }}
                      ></div>
                      <span className="text-gray-700 dark:text-gray-300 truncate">
                        {categoryData?.label || category.name}
                      </span>
                    </div>
                  );
                });
            }, [availableCategories])}
          </div>
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button
          type="button"
          className="bg-white dark:bg-gray-800 rounded-lg p-2 shadow-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label="Karte zurücksetzen"
          title="Karte zurücksetzen"
          onClick={() => {
            if (mapInstanceRef.current) {
              const map = mapInstanceRef.current;
              // Reset to default view showing all locations
              if (locations && locations.length > 0) {
                const bounds = L.latLngBounds(locations.map(loc => [loc.coordinates.lat, loc.coordinates.lng]));
                map.fitBounds(bounds, { padding: [20, 20] });
              } else {
                // Fallback to Chemnitz center
                map.setView([50.8278, 12.9214], 13);
              }
            }
          }}
        >
          <span aria-hidden="true">🎯</span>
        </button>
      </div>

      {/* Map Title */}
      <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 shadow-lg z-10 border border-gray-200 dark:border-gray-600">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">🗺️ Chemnitz Stadtplan</p>
      </div>

      {/* Loading Indicator */}
      <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 bg-opacity-75 flex items-center justify-center z-20" style={{ display: 'none' }}>
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Karte wird geladen...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
