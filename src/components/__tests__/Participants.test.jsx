// Participants Component Tests for SLAM25 Application
import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import Participants from '../Participants.jsx';

// Mock the services
jest.mock('../../services/databaseService.js', () => ({
  getData: jest.fn(),
  setData: jest.fn()
}));

jest.mock('../../services/websocketService.js', () => ({
  on: jest.fn(),
  off: jest.fn()
}));

describe('Participants Component', () => {
  const mockParticipants = [
    {
      id: 1,
      name: 'John Doe',
      role: 'Teilnehmer',
      region: 'Berlin',
      pronouns: 'he/him',
      instagram: '@johndoe'
    },
    {
      id: 2,
      name: 'Jane Smith',
      role: 'Teilnehmer',
      region: 'München',
      pronouns: 'she/her',
      instagram: '@janesmith'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { getData } = require('../../services/databaseService.js');
    getData.mockResolvedValue({
      participants: mockParticipants
    });
  });

  it('should render the participants title', () => {
    render(<Participants />);
    
    expect(screen.getByText('Teilnehmer')).toBeInTheDocument();
  });

  it('should render participant list', async () => {
    render(<Participants />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('should display participant details', async () => {
    render(<Participants />);
    
    await waitFor(() => {
      expect(screen.getByText('Berlin')).toBeInTheDocument();
      expect(screen.getByText('München')).toBeInTheDocument();
      expect(screen.getByText('he/him')).toBeInTheDocument();
      expect(screen.getByText('she/her')).toBeInTheDocument();
    });
  });

  it('should handle empty participants list', async () => {
    const { getData } = require('../../services/databaseService.js');
    getData.mockResolvedValue({ participants: [] });
    
    render(<Participants />);
    
    await waitFor(() => {
      expect(screen.getByText('Keine Teilnehmer gefunden')).toBeInTheDocument();
    });
  });

  it('should handle loading state', () => {
    const { getData } = require('../../services/databaseService.js');
    getData.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<Participants />);
    
    expect(screen.getByText('Lade Teilnehmer...')).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    const { getData } = require('../../services/databaseService.js');
    getData.mockRejectedValue(new Error('Database error'));
    
    render(<Participants />);
    
    await waitFor(() => {
      expect(screen.getByText('Fehler beim Laden der Teilnehmer')).toBeInTheDocument();
    });
  });
});




