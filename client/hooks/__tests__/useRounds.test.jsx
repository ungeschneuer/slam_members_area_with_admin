// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRounds, useRound, useRoundBySlug, useCreateRound, useUpdateRound, useDeleteRound } from '../useRounds.js';
import { createQueryWrapper, setupClientMocks, clearAllMocks } from '../../test-utils.js';

// Setup common mocks
setupClientMocks();

describe('useRounds hooks', () => {
  beforeEach(() => {
    clearAllMocks();
  });

  describe('useRounds', () => {
    it('should fetch rounds successfully', async () => {
      const mockRounds = [
        { id: 1, title: 'Round 1', slug: 'round-1' },
        { id: 2, title: 'Round 2', slug: 'round-2' }
      ];
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockRounds })
      });

      const { result } = renderHook(() => useRounds(), {
        wrapper: createQueryWrapper()
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRounds);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/rounds'), expect.objectContaining({ credentials: 'include' }));
    });

    it('should handle empty response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      });

      const { result } = renderHook(() => useRounds(), {
        wrapper: createQueryWrapper()
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should handle direct array response', async () => {
      const mockRounds = [
        { id: 1, title: 'Round 1', slug: 'round-1' }
      ];
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRounds)
      });

      const { result } = renderHook(() => useRounds(), {
        wrapper: createQueryWrapper()
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRounds);
    });

    it('should handle error', async () => {
      const error = new Error('Database error');
      global.fetch = vi.fn().mockRejectedValue(error);

      const { result } = renderHook(() => useRounds(), {
        wrapper: createQueryWrapper()
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe('useRound', () => {
    it('should fetch single round successfully', async () => {
      const mockRound = { id: 1, title: 'Round 1', slug: 'round-1' };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockRound })
      });

      const { result } = renderHook(() => useRound(1), {
        wrapper: createQueryWrapper()
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRound);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/rounds/1'), expect.objectContaining({ credentials: 'include' }));
    });

    it('should not fetch when id is null', () => {
      const { result } = renderHook(() => useRound(null), {
        wrapper: createQueryWrapper()
      });

      expect(result.current.isLoading).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not fetch when id is undefined', () => {
      const { result } = renderHook(() => useRound(undefined), {
        wrapper: createQueryWrapper()
      });

      expect(result.current.isLoading).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('useRoundBySlug', () => {
    it('should fetch round by slug successfully', async () => {
      const mockRound = { id: 1, title: 'Round 1', slug: 'round-1' };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockRound })
      });

      const { result } = renderHook(() => useRoundBySlug('round-1'), {
        wrapper: createQueryWrapper()
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRound);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/rounds/slug/round-1'), expect.objectContaining({ credentials: 'include' }));
    });

    it('should not fetch when slug is null', () => {
      const { result } = renderHook(() => useRoundBySlug(null), {
        wrapper: createQueryWrapper()
      });

      expect(result.current.isLoading).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not fetch when slug is undefined', () => {
      const { result } = renderHook(() => useRoundBySlug(undefined), {
        wrapper: createQueryWrapper()
      });

      expect(result.current.isLoading).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not fetch when slug is empty string', () => {
      const { result } = renderHook(() => useRoundBySlug(''), {
        wrapper: createQueryWrapper()
      });

      expect(result.current.isLoading).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('useCreateRound', () => {
    it('should create round successfully', async () => {
      const newRound = { title: 'New Round', slug: 'new-round' };
      const createdRound = { id: 3, ...newRound };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: createdRound })
      });

      const { result } = renderHook(() => useCreateRound(), {
        wrapper: createQueryWrapper()
      });

      result.current.mutate(newRound);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/rounds'), expect.objectContaining({ method: 'POST' }));
      expect(result.current.data).toEqual({ data: createdRound });
    });

    it('should handle create error', async () => {
      const error = new Error('Create failed');
      global.fetch = vi.fn().mockRejectedValue(error);

      const { result } = renderHook(() => useCreateRound(), {
        wrapper: createQueryWrapper()
      });

      result.current.mutate({ title: 'Test Round' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe('useUpdateRound', () => {
    it('should update round successfully', async () => {
      const updateData = { title: 'Updated Round' };
      const updatedRound = { id: 1, ...updateData };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: updatedRound })
      });

      const { result } = renderHook(() => useUpdateRound(), {
        wrapper: createQueryWrapper()
      });

      result.current.mutate({ id: 1, ...updateData });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/rounds/1'), expect.objectContaining({ method: 'PUT' }));
      expect(result.current.data).toEqual({ data: updatedRound });
    });

    it('should handle update error', async () => {
      const error = new Error('Update failed');
      global.fetch = vi.fn().mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateRound(), {
        wrapper: createQueryWrapper()
      });

      result.current.mutate({ id: 1, title: 'Test Round' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe('useDeleteRound', () => {
    it('should delete round successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const { result } = renderHook(() => useDeleteRound(), {
        wrapper: createQueryWrapper()
      });

      result.current.mutate(1);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/rounds/1'), expect.objectContaining({ method: 'DELETE' }));
      expect(result.current.data).toEqual({ success: true });
    });

    it('should handle delete error', async () => {
      const error = new Error('Delete failed');
      global.fetch = vi.fn().mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteRound(), {
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
