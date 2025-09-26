import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons for different categories
const createCustomIcon = (category) => {
  const colors = {
    restaurant: '#ef4444',
    cafe: '#eab308',
    bar: '#3b82f6',
    culture: '#8b5cf6',
    shopping: '#10b981',
    hotel: '#6366f1',
    transport: '#f97316',
    landmark: '#dc2626',
    neighborhood: '#7c3aed',
    nature: '#059669',
    leisure: '#0891b2',
    sports: '#ea580c'
  };

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

  return L.divIcon({
    html: `<div style="
      background-color: ${colors[category] || '#6b7280'};
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      cursor: pointer;
    ">${icons[category] || '📍'}</div>`,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

export default function InteractiveMap({ locations, onLocationClick, selectedLocation }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map centered on Chemnitz
    const map = L.map(mapRef.current).setView([50.8275, 12.9247], 14);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !locations) return;

    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      map.removeLayer(marker);
    });
    markersRef.current = [];

    // Add markers for each location
    locations.forEach(location => {
      const marker = L.marker([location.coordinates.lat, location.coordinates.lng], {
        icon: createCustomIcon(location.category)
      }).addTo(map);

      // Add popup with location info
      const popupContent = `
        <div style="min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1f2937;">${location.name}</h3>
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">${location.address}</p>
          <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">${location.description}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
            <span style="color: #6b7280; font-size: 12px;">${location.priceRange}</span>
          </div>
          <button 
            onclick="window.locationClick && window.locationClick('${location.id}')"
            style="
              margin-top: 8px;
              padding: 4px 8px;
              background-color: #3b82f6;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            "
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
    if (locations.length > 0) {
      const group = new L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.1));
    }

    // Highlight selected location
    if (selectedLocation) {
      const selectedMarker = markersRef.current.find(marker => {
        const latlng = marker.getLatLng();
        return latlng.lat === selectedLocation.coordinates.lat && 
               latlng.lng === selectedLocation.coordinates.lng;
      });
      
      if (selectedMarker) {
        map.setView(selectedMarker.getLatLng(), 16);
        selectedMarker.openPopup();
      }
    }

    // Make locationClick available globally for popup buttons
    window.locationClick = (locationId) => {
      const location = locations.find(loc => loc.id.toString() === locationId);
      if (location && onLocationClick) {
        onLocationClick(location);
      }
    };

  }, [locations, selectedLocation, onLocationClick]);

  return (
    <div className="relative">
      <div 
        ref={mapRef} 
        className="w-full h-96 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-600"
        style={{ zIndex: 1 }}
      />
      
      {/* Map Legend */}
      <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-lg z-10 border border-gray-200 dark:border-gray-600">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Legende</h3>
        <div className="space-y-1">
          {[
            { id: 'restaurant', name: 'Restaurants', color: '#ef4444' },
            { id: 'cafe', name: 'Cafés', color: '#eab308' },
            { id: 'bar', name: 'Bars', color: '#3b82f6' },
            { id: 'culture', name: 'Kultur', color: '#8b5cf6' },
            { id: 'shopping', name: 'Shopping', color: '#10b981' },
            { id: 'hotel', name: 'Hotels', color: '#6366f1' },
            { id: 'transport', name: 'Transport', color: '#f97316' },
            { id: 'landmark', name: 'Sehenswürdigkeiten', color: '#dc2626' },
            { id: 'neighborhood', name: 'Viertel', color: '#7c3aed' },
            { id: 'nature', name: 'Natur', color: '#059669' },
            { id: 'leisure', name: 'Freizeit', color: '#0891b2' },
            { id: 'sports', name: 'Sport', color: '#ea580c' }
          ].map(category => (
            <div key={category.id} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: category.color }}
              ></div>
              <span className="text-gray-700 dark:text-gray-300">{category.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map Title */}
      <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 shadow-lg z-10 border border-gray-200 dark:border-gray-600">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">🗺️ Chemnitz Stadtplan</p>
      </div>
    </div>
  );
}
