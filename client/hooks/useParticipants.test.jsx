// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useParticipants, useParticipant, useCreateParticipant, useUpdateParticipant, useDeleteParticipant } from './useParticipants.js';
import { createQueryWrapper, setupClientMocks, clearAllMocks } from '../test-utils.jsx';

// Setup common mocks
setupClientMocks();

describe('useParticipants hooks', () => {
  beforeEach(() => {
    clearAllMocks();
  });

  describe('useParticipants', () => {
    it('should fetch participants successfully', async () => {
      const mockParticipants = [
        { id: 1, name: 'Alice', region: 'Berlin' },
        { id: 2, name: 'Bob', region: 'Hamburg' }
      ];
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockParticipants })
      });

      const { result } = renderHook(() => useParticipants(), {
        wrapper: createQueryWrapper()
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockParticipants);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/participants'), expect.objectContaining({ credentials: 'include' }));
    });

    it('should handle empty response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      });

      const { result } = renderHook(() => useParticipants(), {
        wrapper: createQueryWrapper()
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should handle direct array response', async () => {
      const mockParticipants = [
        { id: 1, name: 'Alice', region: 'Berlin' }
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockParticipants)
      });

      const { result } = renderHook(() => useParticipants(), {
        wrapper: createQueryWrapper()
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockParticipants);
    });

    it('should handle error', async () => {
      const error = new Error('Database error');
      global.fetch = vi.fn().mockRejectedValue(error);

      const { result } = renderHook(() => useParticipants(), {
        wrapper: createQueryWrapper()
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe('useParticipant', () => {
    it('should fetch single participant successfully', async () => {
      const mockParticipant = { id: 1, name: 'Alice', region: 'Berlin' };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockParticipant })
      });

      const { result } = renderHook(() => useParticipant(1), {
        wrapper: createQueryWrapper()
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockParticipant);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/participants/1'), expect.objectContaining({ credentials: 'include' }));
    });

    it('should not fetch when id is null', () => {
      const { result } = renderHook(() => useParticipant(null), {
        wrapper: createQueryWrapper()
      });

      expect(result.current.isLoading).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not fetch when id is undefined', () => {
      const { result } = renderHook(() => useParticipant(undefined), {
        wrapper: createQueryWrapper()
      });

      expect(result.current.isLoading).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('useCreateParticipant', () => {
    it('should create participant successfully', async () => {
      const newParticipant = { name: 'Charlie', region: 'Munich' };
      const createdParticipant = { id: 3, ...newParticipant };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: createdParticipant })
      });

      const { result } = renderHook(() => useCreateParticipant(), {
        wrapper: createQueryWrapper()
      });

      result.current.mutate(newParticipant);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/participants'), expect.objectContaining({ method: 'POST' }));
      expect(result.current.data).toEqual({ data: createdParticipant });
    });

    it('should handle create error', async () => {
      const error = new Error('Create failed');
      global.fetch = vi.fn().mockRejectedValue(error);

      const { result } = renderHook(() => useCreateParticipant(), {
        wrapper: createQueryWrapper()
      });

      result.current.mutate({ name: 'Test' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe('useUpdateParticipant', () => {
    it('should update participant successfully', async () => {
      const updateData = { name: 'Alice Updated' };
      const updatedParticipant = { id: 1, ...updateData };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: updatedParticipant })
      });

      const { result } = renderHook(() => useUpdateParticipant(), {
        wrapper: createQueryWrapper()
      });

      result.current.mutate({ id: 1, ...updateData });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/participants/1'), expect.objectContaining({ method: 'PUT' }));
      expect(result.current.data).toEqual({ data: updatedParticipant });
    });

    it('should handle update error', async () => {
      const error = new Error('Update failed');
      global.fetch = vi.fn().mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateParticipant(), {
        wrapper: createQueryWrapper()
      });

      result.current.mutate({ id: 1, name: 'Test' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe('useDeleteParticipant', () => {
    it('should delete participant successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const { result } = renderHook(() => useDeleteParticipant(), {
        wrapper: createQueryWrapper()
      });

      result.current.mutate(1);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/participants/1'), expect.objectContaining({ method: 'DELETE' }));
      expect(result.current.data).toEqual({ success: true });
    });

    it('should handle delete error', async () => {
      const error = new Error('Delete failed');
      global.fetch = vi.fn().mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteParticipant(), {
        wrapper: createQueryWrapper()
      });

      result.current.mutate(1);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });
});
