// MemberDashboard Component Tests for SLAM25 Application
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MemberDashboard from '../MemberDashboard.jsx';

// Mock the services
vi.mock('../../services/sessionService.js', () => ({
  default: {
    getSession: vi.fn(),
    setSession: vi.fn()
  }
}));

vi.mock('../../services/databaseService.js', () => ({
  default: {
    getData: vi.fn(),
    setData: vi.fn()
  }
}));

vi.mock('../../services/websocketService.js', () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}));

vi.mock('../../services/errorHandler.js', () => ({
  default: {
    handleError: vi.fn()
  }
}));

describe('MemberDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful service responses
    const sessionService = await import('../../services/sessionService.js');
    const databaseService = await import('../../services/databaseService.js');
    
    sessionService.default.getSession.mockResolvedValue({
      isAuthenticated: true,
      user: { id: 1, username: 'testuser' }
    });
    
    databaseService.default.getData.mockResolvedValue({
      participants: [],
      rounds: [],
      news: []
    });
  });

  it('should render the dashboard title', () => {
    render(<MemberDashboard />);
    
    expect(screen.getByText('SLAM25 Dashboard')).toBeInTheDocument();
  });

  it('should render dashboard sections', () => {
    render(<MemberDashboard />);
    
    // Check for main dashboard sections
    expect(screen.getByText('Teilnehmer')).toBeInTheDocument();
    expect(screen.getByText('Runden')).toBeInTheDocument();
    expect(screen.getByText('Neuigkeiten')).toBeInTheDocument();
  });

  it('should handle loading state', async () => {
    const { getData } = require('../../services/databaseService.js');
    getData.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<MemberDashboard />);
    
    // Should show loading state initially
    expect(screen.getByText('Lade...')).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    const { getData } = require('../../services/databaseService.js');
    getData.mockRejectedValue(new Error('Database error'));
    
    render(<MemberDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Fehler beim Laden der Daten')).toBeInTheDocument();
    });
  });
});
