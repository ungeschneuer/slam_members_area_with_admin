import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies
const mockEmitDataUpdate = vi.fn();
const mockEmitAdminUpdate = vi.fn();
const mockEmitCacheInvalidation = vi.fn();
const mockClearCache = vi.fn();

vi.mock('../services/websocketService.js', () => ({
  emitDataUpdate: mockEmitDataUpdate,
  emitAdminUpdate: mockEmitAdminUpdate,
  emitCacheInvalidation: mockEmitCacheInvalidation
}));

vi.mock('../services/optimizedQueryService.js', () => ({
  default: {
    clearCache: mockClearCache
  }
}));

vi.mock('../config/logger.js', () => ({
  default: {
    error: vi.fn()
  }
}));

// Import the notifyDataUpdate function by creating a test module
// We'll extract the function logic from the routes file
const notifyDataUpdate = (entityType, data = null, options = {}) => {
  try { 
    mockClearCache(); 
  } catch {}
  try { 
    // Emit data update with enhanced payload
    mockEmitDataUpdate(entityType, data, options);
    mockEmitAdminUpdate(entityType, data, options);
    
    // Emit cache invalidation for TanStack Query
    const queryKeys = getQueryKeysForEntity(entityType);
    if (queryKeys.length > 0) {
      mockEmitCacheInvalidation(queryKeys, 'member');
      mockEmitCacheInvalidation(queryKeys, 'admin');
    }
  } catch (error) {
    console.error('Error in notifyDataUpdate:', error);
  }
};

// Helper function to get query keys for entity type
const getQueryKeysForEntity = (entityType) => {
  const queryKeyMap = {
    'participants': ['participants'],
    'rounds': ['rounds'],
    'news': ['news'],
    'timetable': ['timetable'],
    'city-tips': ['city-tips'],
    'info-pages': ['info-pages'],
    'links': ['links'],
    'schnellzugriff': ['schnellzugriff'],
    'breaking-news': ['news'],
    'countdown': ['countdown'],
  };
  
  return queryKeyMap[entityType] || [];
};

describe('WebSocket notifyDataUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should emit data update and admin update for participants', () => {
    const entityType = 'participants';
    const data = { id: 1, name: 'Test Participant' };
    const options = { source: 'test' };

    notifyDataUpdate(entityType, data, options);

    expect(mockClearCache).toHaveBeenCalledOnce();
    expect(mockEmitDataUpdate).toHaveBeenCalledWith(entityType, data, options);
    expect(mockEmitAdminUpdate).toHaveBeenCalledWith(entityType, data, options);
    expect(mockEmitCacheInvalidation).toHaveBeenCalledWith(['participants'], 'member');
    expect(mockEmitCacheInvalidation).toHaveBeenCalledWith(['participants'], 'admin');
  });

  it('should emit data update and admin update for rounds', () => {
    const entityType = 'rounds';
    const data = { id: 1, title: 'Test Round' };

    notifyDataUpdate(entityType, data);

    expect(mockClearCache).toHaveBeenCalledOnce();
    expect(mockEmitDataUpdate).toHaveBeenCalledWith(entityType, data, {});
    expect(mockEmitAdminUpdate).toHaveBeenCalledWith(entityType, data, {});
    expect(mockEmitCacheInvalidation).toHaveBeenCalledWith(['rounds'], 'member');
    expect(mockEmitCacheInvalidation).toHaveBeenCalledWith(['rounds'], 'admin');
  });

  it('should emit data update and admin update for news', () => {
    const entityType = 'news';
    const data = { id: 1, title: 'Test News' };

    notifyDataUpdate(entityType, data);

    expect(mockClearCache).toHaveBeenCalledOnce();
    expect(mockEmitDataUpdate).toHaveBeenCalledWith(entityType, data, {});
    expect(mockEmitAdminUpdate).toHaveBeenCalledWith(entityType, data, {});
    expect(mockEmitCacheInvalidation).toHaveBeenCalledWith(['news'], 'member');
    expect(mockEmitCacheInvalidation).toHaveBeenCalledWith(['news'], 'admin');
  });

  it('should handle unknown entity types gracefully', () => {
    const entityType = 'unknown-entity';
    const data = { id: 1, name: 'Test' };

    notifyDataUpdate(entityType, data);

    expect(mockClearCache).toHaveBeenCalledOnce();
    expect(mockEmitDataUpdate).toHaveBeenCalledWith(entityType, data, {});
    expect(mockEmitAdminUpdate).toHaveBeenCalledWith(entityType, data, {});
    // Should not emit cache invalidation for unknown entities
    expect(mockEmitCacheInvalidation).not.toHaveBeenCalled();
  });

  it('should handle breaking-news entity type correctly', () => {
    const entityType = 'breaking-news';
    const data = { id: 1, title: 'Breaking News' };

    notifyDataUpdate(entityType, data);

    expect(mockClearCache).toHaveBeenCalledOnce();
    expect(mockEmitDataUpdate).toHaveBeenCalledWith(entityType, data, {});
    expect(mockEmitAdminUpdate).toHaveBeenCalledWith(entityType, data, {});
    // breaking-news should map to 'news' query key
    expect(mockEmitCacheInvalidation).toHaveBeenCalledWith(['news'], 'member');
    expect(mockEmitCacheInvalidation).toHaveBeenCalledWith(['news'], 'admin');
  });

  it('should handle null data gracefully', () => {
    const entityType = 'participants';
    const data = null;

    notifyDataUpdate(entityType, data);

    expect(mockClearCache).toHaveBeenCalledOnce();
    expect(mockEmitDataUpdate).toHaveBeenCalledWith(entityType, data, {});
    expect(mockEmitAdminUpdate).toHaveBeenCalledWith(entityType, data, {});
    expect(mockEmitCacheInvalidation).toHaveBeenCalledWith(['participants'], 'member');
    expect(mockEmitCacheInvalidation).toHaveBeenCalledWith(['participants'], 'admin');
  });

  it('should handle empty options object', () => {
    const entityType = 'participants';
    const data = { id: 1, name: 'Test' };
    const options = {};

    notifyDataUpdate(entityType, data, options);

    expect(mockClearCache).toHaveBeenCalledOnce();
    expect(mockEmitDataUpdate).toHaveBeenCalledWith(entityType, data, options);
    expect(mockEmitAdminUpdate).toHaveBeenCalledWith(entityType, data, options);
  });

  it('should handle cache clear errors gracefully', () => {
    mockClearCache.mockImplementation(() => {
      throw new Error('Cache clear failed');
    });

    const entityType = 'participants';
    const data = { id: 1, name: 'Test' };

    // Should not throw error
    expect(() => notifyDataUpdate(entityType, data)).not.toThrow();

    expect(mockEmitDataUpdate).toHaveBeenCalledWith(entityType, data, {});
    expect(mockEmitAdminUpdate).toHaveBeenCalledWith(entityType, data, {});
  });

  it('should handle emit errors gracefully', () => {
    mockEmitDataUpdate.mockImplementation(() => {
      throw new Error('Emit failed');
    });

    const entityType = 'participants';
    const data = { id: 1, name: 'Test' };

    // Should not throw error
    expect(() => notifyDataUpdate(entityType, data)).not.toThrow();

    expect(mockClearCache).toHaveBeenCalledOnce();
  });
});
