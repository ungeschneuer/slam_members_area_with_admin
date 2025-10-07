import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import BreakingNews from '../BreakingNews';

// Mock the useBreakingNews hook
vi.mock('../../hooks/index.js', () => ({
  useBreakingNews: () => ({
    data: {
      id: 1,
      title: 'Test Breaking News',
      category: 'announcement',
      created_at: '2024-01-15T10:00:00Z',
      breakingNewsUntil: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours from now
    },
    isLoading: false,
    error: null
  })
}));

describe('BreakingNewsCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should display countdown timer for breaking news', () => {
    render(<BreakingNews />);
    
    // Should show the breaking news title
    expect(screen.getByText('Test Breaking News')).toBeInTheDocument();
    
    // Should show countdown (approximately 2 hours)
    expect(screen.getByText(/noch/)).toBeInTheDocument();
  });

  it('should not show countdown when breakingNewsUntil is null', () => {
    vi.mocked(require('../../hooks/index.js').useBreakingNews).mockReturnValue({
      data: {
        id: 1,
        title: 'Test Breaking News',
        category: 'announcement',
        created_at: '2024-01-15T10:00:00Z',
        breakingNewsUntil: null
      },
      isLoading: false,
      error: null
    });

    render(<BreakingNews />);
    
    expect(screen.getByText('Test Breaking News')).toBeInTheDocument();
    expect(screen.queryByText(/noch/)).not.toBeInTheDocument();
  });
});
