import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import logger from '../services/logger.js';


// Fix for default markers in Leaflet (guarded for non-browser/test env)
try {
  if (L && L.Icon && L.Icon.Default) {
    // some environments may not define prototype pieces
    // eslint-disable-next-line no-unused-expressions
    // Using logical AND for conditional execution - safe pattern for optional chaining
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
  const tileLayer = L.tileLayer(url, {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    errorTileUrl: '', // Show blank tiles on error instead of broken image
    ...options
  });

  // Log tile errors for debugging
  tileLayer.on('tileerror', (error) => {
    logger.warn('Map tile failed to load', { src: error.tile?.src || 'unknown' });
  });

  return tileLayer;
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

// Import shared constants for consistency
import { getCategoryByValue, getCategoryHexColor } from '../../shared/constants/categories.js';

// Custom marker icons for different categories
export const createCustomIcon = (category) => {
  const categoryData = getCategoryByValue(category);
  const color = getCategoryHexColor(category);
  const emoji = categoryData?.icon || '📍';

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
    popupAnchor: [0, -40]
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
    
    return { map, tileLayer }; // Return both map and tileLayer
  } catch (error) {
    logger.error('Error creating leaflet map', { error: error.message });
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
    logger.error('Error destroying leaflet map', { error: error.message });
  }
};

// Safe marker removal
export const removeMarker = (map, marker) => {
  try {
    if (map && marker && map.hasLayer(marker)) {
      map.removeLayer(marker);
    }
  } catch (error) {
    logger.error('Error removing map marker', { error: error.message });
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
    logger.error('Error resizing leaflet map', { error: error.message });
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
    logger.error('Error creating map marker', { error: error.message });
    return null;
  }
};

export default L;
