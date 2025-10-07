import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Suppress Leaflet deprecation warnings
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args[0];
  if (typeof message === 'string' && 
      (message.includes('mozPressure') || message.includes('mozInputSource'))) {
    // Suppress these specific Leaflet deprecation warnings
    return;
  }
  originalWarn.apply(console, args);
};

// Fix for default markers in Leaflet (guarded for non-browser/test env)
try {
  if (L && L.Icon && L.Icon.Default) {
    // some environments may not define prototype pieces
    // eslint-disable-next-line no-unused-expressions
    L.Icon.Default.prototype && delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions?.({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }
} catch {}

// Standardized map configuration
export const createMapConfig = (options = {}) => ({
  preferCanvas: true, // Use canvas renderer for better performance
  zoomControl: true,
  attributionControl: true,
  ...options
});

// Standardized tile layer configuration
export const createTileLayer = (url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', options = {}) => {
  return L.tileLayer(url, {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    ...options
  });
};

// Standardized marker icon
export const createDefaultIcon = (options = {}) => {
  return L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    ...options
  });
};

// Custom marker icons for different categories
export const createCustomIcon = (category) => {
  const colors = {
    restaurant: '#ef4444',
    cafe: '#f59e0b',
    bar: '#8b5cf6',
    shopping: '#10b981',
    culture: '#3b82f6',
    nightlife: '#ec4899',
    default: '#6b7280'
  };

  const color = colors[category] || colors.default;
  const emojiMap = {
    restaurant: '🍽️',
    cafe: '☕',
    bar: '🍺',
    landmark: '🏛️',
    shopping: '🛍️',
    culture: '🎭',
    entertainment: '🎭',
    transport: '🚇',
    accommodation: '🏨',
    hotel: '🏨',
    nature: '🌳',
    leisure: '🏊',
    sports: '⚽',
    other: '📍'
  };
  const emoji = emojiMap[category] || '📍';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
      ">
        ${emoji}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

// Safe map initialization with error handling
export const createMap = (container, options = {}) => {
  try {
    if (!container) {
      throw new Error('Map container is required');
    }
    
    const config = createMapConfig(options);
    const map = L.map(container, config);
    
    // Add default tile layer
    const tileLayer = createTileLayer();
    tileLayer.addTo(map);
    
    return { map, tileLayer };
  } catch (error) {
    console.error('Error creating map:', error);
    throw error;
  }
};

// Safe map cleanup
export const destroyMap = (map) => {
  try {
    if (!map) return;
    // Mark as destroyed to prevent pending resize from running
    try {
      map.__isDestroyed = true; // internal flag for our utils
    } catch {}
    // Cancel any pending resize timeout
    try {
      const timeoutId = mapResizeTimeouts.get(map);
      if (timeoutId) {
        clearTimeout(timeoutId);
        mapResizeTimeouts.delete(map);
      }
    } catch {}
    if (typeof map.remove === 'function') {
      map.remove();
    }
  } catch (error) {
    console.error('Error destroying map:', error);
  }
};

// Safe marker removal
export const removeMarker = (map, marker) => {
  try {
    if (map && marker && map.hasLayer(marker)) {
      map.removeLayer(marker);
    }
  } catch (error) {
    console.error('Error removing marker:', error);
  }
};

// Safe map resize
// Track pending resize timeouts per map to avoid calling after destroy
const mapResizeTimeouts = new WeakMap();

export const resizeMap = (map) => {
  try {
    if (!map || typeof map.invalidateSize !== 'function') return;

    // Clear any existing scheduled resize
    const existing = mapResizeTimeouts.get(map);
    if (existing) {
      clearTimeout(existing);
    }

    const timeoutId = setTimeout(() => {
      try {
        // Bail out if map was destroyed or container is missing from DOM
        if (
          !map ||
          map.__isDestroyed ||
          !map._container ||
          !document.body.contains(map._container) ||
          !map._mapPane ||
          !map._loaded
        ) {
          return;
        }
        map.invalidateSize();
      } catch (innerError) {
        // Swallow errors from Leaflet internals when container disappeared
      } finally {
        mapResizeTimeouts.delete(map);
      }
    }, 120);

    mapResizeTimeouts.set(map, timeoutId);
  } catch (error) {
    console.error('Error resizing map:', error);
  }
};

// Validate coordinates
export const isValidCoordinates = (lat, lng) => {
  return (
    typeof lat === 'number' && 
    typeof lng === 'number' && 
    !isNaN(lat) && 
    !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
};

// Create marker with popup
export const createMarkerWithPopup = (map, lat, lng, popupContent, options = {}) => {
  try {
    if (!isValidCoordinates(lat, lng)) {
      throw new Error('Invalid coordinates');
    }

    const icon = options.icon || createDefaultIcon();
    const marker = L.marker([lat, lng], { icon }).addTo(map);
    
    if (popupContent) {
      marker.bindPopup(popupContent);
    }
    
    return marker;
  } catch (error) {
    console.error('Error creating marker:', error);
    return null;
  }
};

export default L;
