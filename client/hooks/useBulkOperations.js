import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';

/**
 * Hook for bulk operations on entities
 * Provides batch create, update, and delete operations
 */
export function useBulkOperations() {
  const queryClient = useQueryClient();

  /**
   * Bulk create entities
   */
  const useBulkCreate = (entityType, entityKeys) => {
    return useMutation({
      mutationFn: async (entities) => {
        const response = await authService.authenticatedRequest(
          `${API_URL}/bulk/${entityType}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operation: 'create', items: entities })
          }
        );
        const result = await response.json();
        return result?.data || result;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: entityKeys.all });
      },
    });
  };

  /**
   * Bulk update entities
   */
  const useBulkUpdate = (entityType, entityKeys) => {
    return useMutation({
      mutationFn: async (updates) => {
        const response = await authService.authenticatedRequest(
          `${API_URL}/bulk/${entityType}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operation: 'update', items: updates })
          }
        );
        const result = await response.json();
        return result?.data || result;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: entityKeys.all });
      },
    });
  };

  /**
   * Bulk delete entities
   */
  const useBulkDelete = (entityType, entityKeys) => {
    return useMutation({
      mutationFn: async (ids) => {
        const items = ids.map(id => ({ id }));
        const response = await authService.authenticatedRequest(
          `${API_URL}/bulk/${entityType}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operation: 'delete', items })
          }
        );
        const result = await response.json();
        return result?.data || result;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: entityKeys.all });
      },
    });
  };

  /**
   * Bulk toggle active status
   */
  const useBulkToggleActive = (entityType, entityKeys) => {
    return useMutation({
      mutationFn: async ({ ids, isActive }) => {
        const items = ids.map(id => ({ id, isActive }));
        const response = await authService.authenticatedRequest(
          `${API_URL}/bulk/${entityType}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operation: 'update', items })
          }
        );
        const result = await response.json();
        return result?.data || result;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: entityKeys.all });
      },
    });
  };

  /**
   * Bulk reorder entities
   */
  const useBulkReorder = (entityType, entityKeys) => {
    return useMutation({
      mutationFn: async (reorderedEntities) => {
        const response = await authService.authenticatedRequest(
          `${API_URL}/bulk/${entityType}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operation: 'update', items: reorderedEntities })
          }
        );
        const result = await response.json();
        return result?.data || result;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: entityKeys.all });
      },
    });
  };

  return {
    useBulkCreate,
    useBulkUpdate,
    useBulkDelete,
    useBulkToggleActive,
    useBulkReorder,
  };
}

/**
 * Specialized bulk operations for specific entity types
 */
export function useBulkParticipants() {
  const { useBulkCreate, useBulkUpdate, useBulkDelete, useBulkToggleActive } = useBulkOperations();
  
  return {
    useBulkCreateParticipants: () => useBulkCreate('participants', { all: ['participants'] }),
    useBulkUpdateParticipants: () => useBulkUpdate('participants', { all: ['participants'] }),
    useBulkDeleteParticipants: () => useBulkDelete('participants', { all: ['participants'] }),
    useBulkToggleParticipantsActive: () => useBulkToggleActive('participants', { all: ['participants'] }),
  };
}

export function useBulkRounds() {
  const { useBulkCreate, useBulkUpdate, useBulkDelete, useBulkToggleActive } = useBulkOperations();
  
  return {
    useBulkCreateRounds: () => useBulkCreate('rounds', { all: ['rounds'] }),
    useBulkUpdateRounds: () => useBulkUpdate('rounds', { all: ['rounds'] }),
    useBulkDeleteRounds: () => useBulkDelete('rounds', { all: ['rounds'] }),
    useBulkToggleRoundsActive: () => useBulkToggleActive('rounds', { all: ['rounds'] }),
  };
}

export function useBulkNews() {
  const { useBulkCreate, useBulkUpdate, useBulkDelete, useBulkToggleActive } = useBulkOperations();
  
  return {
    useBulkCreateNews: () => useBulkCreate('news', { all: ['news'] }),
    useBulkUpdateNews: () => useBulkUpdate('news', { all: ['news'] }),
    useBulkDeleteNews: () => useBulkDelete('news', { all: ['news'] }),
    useBulkToggleNewsActive: () => useBulkToggleActive('news', { all: ['news'] }),
  };
}

export function useBulkLinks() {
  const { useBulkCreate, useBulkUpdate, useBulkDelete, useBulkToggleActive, useBulkReorder } = useBulkOperations();
  
  return {
    useBulkCreateLinks: () => useBulkCreate('links', { all: ['links'] }),
    useBulkUpdateLinks: () => useBulkUpdate('links', { all: ['links'] }),
    useBulkDeleteLinks: () => useBulkDelete('links', { all: ['links'] }),
    useBulkToggleLinksActive: () => useBulkToggleActive('links', { all: ['links'] }),
    useBulkReorderLinks: () => useBulkReorder('links', { all: ['links'] }),
  };
}
