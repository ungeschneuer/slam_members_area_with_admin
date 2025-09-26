// App Component Tests for SLAM25 Application
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

// Mock the services
vi.mock('./services/sessionService.js', () => ({
  default: {
    init: vi.fn(),
    getSession: vi.fn(),
    setSession: vi.fn(),
    clearSession: vi.fn()
  }
}));

vi.mock('./services/databaseService.js', () => ({
  default: {
    init: vi.fn(),
    getData: vi.fn(),
    setData: vi.fn()
  }
}));

vi.mock('./services/hybridDataService.js', () => ({
  default: {
    init: vi.fn(),
    getData: vi.fn(),
    setData: vi.fn()
  }
}));

vi.mock('./services/websocketService.js', () => ({
  default: {
    init: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn()
  }
}));

vi.mock('./services/errorHandler.js', () => ({
  default: {
    init: vi.fn(),
    handleError: vi.fn()
  }
}));

vi.mock('./services/healthMonitor.js', () => ({
  default: {
    init: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  }
}));

vi.mock('./services/resilientService.js', () => ({
  withResilience: vi.fn((fn) => fn)
}));

// Mock child components
vi.mock('./components/MemberDashboard.jsx', () => ({
  default: function MockMemberDashboard() {
    return <div data-testid="member-dashboard">Member Dashboard</div>;
  }
}));

vi.mock('./components/Participants.jsx', () => ({
  default: function MockParticipants() {
    return <div data-testid="participants">Participants</div>;
  }
}));

vi.mock('./components/Rounds.jsx', () => ({
  default: function MockRounds() {
    return <div data-testid="rounds">Rounds</div>;
  }
}));

vi.mock('./components/News.jsx', () => ({
  default: function MockNews() {
    return <div data-testid="news">News</div>;
  }
}));

vi.mock('./components/Timetable.jsx', () => ({
  default: function MockTimetable() {
    return <div data-testid="timetable">Timetable</div>;
  }
}));

vi.mock('./components/CityTips.jsx', () => ({
  default: function MockCityTips() {
    return <div data-testid="city-tips">City Tips</div>;
  }
}));

vi.mock('./components/Info.jsx', () => ({
  default: function MockInfo() {
    return <div data-testid="info">Info</div>;
  }
}));

vi.mock('./Admin.jsx', () => ({
  default: function MockAdmin() {
    return <div data-testid="admin">Admin Panel</div>;
  }
}));

describe('App Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('should render the main navigation', () => {
    render(<App />);

    // Check for main navigation elements
    expect(screen.getByText('SLAM25')).toBeInTheDocument();
    expect(screen.getByText('Poetry Slam Wettbewerb')).toBeInTheDocument();
  });

  it('should render navigation links', () => {
    render(<App />);

    // Check for navigation links
    expect(screen.getByText('Teilnehmer')).toBeInTheDocument();
    expect(screen.getByText('Runden')).toBeInTheDocument();
    expect(screen.getByText('Neuigkeiten')).toBeInTheDocument();
    expect(screen.getByText('Zeitplan')).toBeInTheDocument();
    expect(screen.getByText('Stadt-Tipps')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('should render the member dashboard by default', () => {
    render(<App />);

    expect(screen.getByTestId('member-dashboard')).toBeInTheDocument();
  });
});
