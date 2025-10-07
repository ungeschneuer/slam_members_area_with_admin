import { describe, it, expect } from 'vitest';
import { act } from '@testing-library/react';
import { useAppStore } from './useAppStore.js';

// Helper to access store state outside React
const getState = () => useAppStore.getState();

describe('useAppStore', () => {
  it('has correct default values', () => {
    const state = getState();
    expect(state.theme).toBe('light');
    expect(Array.isArray(state.areas)).toBe(true);
    expect(state.mobileMenuOpen).toBe(false);
    expect(state.configLoaded).toBe(false);
    expect(state.isAdmin).toBe(false);
  });

  it('updates theme via toggleTheme', () => {
    const initial = getState().theme;
    act(() => {
      getState().toggleTheme();
    });
    const next = getState().theme;
    expect(next).not.toBe(initial);
  });

  it('sets configLoaded and isAdmin flags', () => {
    act(() => {
      getState().setConfigLoaded(true);
      getState().setIsAdmin(true);
    });
    const state = getState();
    expect(state.configLoaded).toBe(true);
    expect(state.isAdmin).toBe(true);
  });

  it('resets state to defaults', () => {
    act(() => {
      getState().resetState();
    });
    const state = getState();
    expect(state.theme).toBe('light');
    expect(state.mobileMenuOpen).toBe(false);
    expect(state.configLoaded).toBe(false);
    expect(state.isAdmin).toBe(false);
  });
});
