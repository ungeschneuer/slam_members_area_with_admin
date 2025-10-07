import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  createMap, 
  destroyMap, 
  removeMarker, 
  resizeMap, 
  createCustomIcon, 
  createMarkerWithPopup,
  isValidCoordinates 
} from '../utils/leafletUtils.js';

export default function InteractiveMap({ locations, onLocationClick, selectedLocation }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize map
  const initializeMap = useCallback(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      const { map } = createMap(mapRef.current);
      map.setView([50.8275, 12.9247], 14);
      mapInstanceRef.current = map;
      setIsMapReady(true);
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, []);

  // Cleanup map
  const cleanupMap = useCallback(() => {
    if (mapInstanceRef.current) {
      try {
        // Clear all markers first
        markersRef.current.forEach(marker => {
          removeMarker(mapInstanceRef.current, marker);
        });
        markersRef.current = [];

        // Remove map instance
        destroyMap(mapInstanceRef.current);
        mapInstanceRef.current = null;
        setIsMapReady(false);
      } catch (error) {
        console.error('Error cleaning up map:', error);
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

        // Add popup with location info
        const popupContent = `
          <div style="min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1f2937;">${location.name || 'Unbekannter Ort'}</h3>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">${location.address || ''}</p>
            <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">${location.description || ''}</p>
            <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 8px;">
              <span style="color: #6b7280; font-size: 12px;">${location.priceRange || ''}</span>
            </div>
            <button 
              onclick="window.location.href='/city-tips/${location.slug || location.id}'"
              style="
                margin-top: 8px;
                padding: 6px 12px;
                background-color: #3b82f6;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: background-color 0.2s;
              "
              onmouseover="this.style.backgroundColor='#2563eb'"
              onmouseout="this.style.backgroundColor='#3b82f6'"
            >
              Details anzeigen
            </button>
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
              
              // Calculate if popup extends beyond map bounds
              const popupRight = popupRect.right;
              const popupBottom = popupRect.bottom;
              const mapRight = mapRect.right;
              const mapBottom = mapRect.bottom;
              
              // If popup extends beyond map, adjust the view
              if (popupRight > mapRight || popupBottom > mapBottom) {
                // Calculate offset to center the popup
                const offsetX = Math.max(0, popupRight - mapRight);
                const offsetY = Math.max(0, popupBottom - mapBottom);
                
                // Convert pixel offset to lat/lng offset
                const point = map.latLngToContainerPoint(markerLatLng);
                const newPoint = L.point(point.x - offsetX/2, point.y - offsetY/2);
                const newLatLng = map.containerPointToLatLng(newPoint);
                
                // Set view with adjusted position
                map.setView(newLatLng, 16);
              } else {
                // Popup is fully visible, just center on marker
                map.setView(markerLatLng, 16);
              }
            } else {
              // Fallback: just center on marker
              map.setView(markerLatLng, 16);
            }
          }, 100); // Small delay to ensure popup is rendered
        }
      }
    } catch (error) {
      console.error('Error updating markers:', error);
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
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-600"
        style={{ 
          zIndex: 1,
          position: 'relative',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
        role="img"
        aria-label="Interaktive Karte von Chemnitz mit Standorten"
      />
      
      {/* Map Legend - Collapsible */}
      <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 border border-gray-200 dark:border-gray-600 max-w-xs">
        <div className="p-3">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center justify-between">
            <span>Legende</span>
            <button 
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Legende ein-/ausblenden"
            >
              📋
            </button>
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {[
              { id: 'restaurant', name: 'Restaurants', color: '#ef4444', icon: '🍽️' },
              { id: 'cafe', name: 'Cafés', color: '#eab308', icon: '☕' },
              { id: 'bar', name: 'Bars', color: '#3b82f6', icon: '🍺' },
              { id: 'culture', name: 'Kultur', color: '#8b5cf6', icon: '🎭' },
              { id: 'shopping', name: 'Shopping', color: '#10b981', icon: '🛍️' },
              { id: 'hotel', name: 'Hotels', color: '#6366f1', icon: '🏨' },
              { id: 'transport', name: 'Transport', color: '#f97316', icon: '🚇' },
              { id: 'landmark', name: 'Sehenswürdigkeiten', color: '#dc2626', icon: '🏛️' },
              { id: 'neighborhood', name: 'Viertel', color: '#7c3aed', icon: '🏘️' },
              { id: 'nature', name: 'Natur', color: '#059669', icon: '🌳' },
              { id: 'leisure', name: 'Freizeit', color: '#0891b2', icon: '🏊' },
              { id: 'sports', name: 'Sport', color: '#ea580c', icon: '⚽' }
            ].map(category => (
              <div key={category.id} className="flex items-center gap-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
                <span className="text-sm">{category.icon}</span>
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                ></div>
                <span className="text-gray-700 dark:text-gray-300 truncate">{category.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button 
          className="bg-white dark:bg-gray-800 rounded-lg p-2 shadow-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label="Karte zurücksetzen"
          title="Karte zurücksetzen"
          onClick={() => {
            if (mapInstanceRef.current) {
              const map = mapInstanceRef.current;
              // Reset to default view showing all locations
              if (locations && locations.length > 0) {
                const bounds = L.latLngBounds(locations.map(loc => [loc.latitude, loc.longitude]));
                map.fitBounds(bounds, { padding: [20, 20] });
              } else {
                // Fallback to Chemnitz center
                map.setView([50.8278, 12.9214], 13);
              }
            }
          }}
        >
          🎯
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
