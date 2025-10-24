import { describe, it, expect, beforeEach } from 'vitest';
import {
  createParticipantLookupMap,
  createAssignmentLookupMap,
  lookupParticipantData,
  getParticipantFallbackName
} from '../participantLookupUtils.js';

describe('participantLookupUtils', () => {
  let participants, assignments, participantLookup, assignmentLookup;

  beforeEach(() => {
    participants = [
      { id: 1, name: 'John Doe', region: 'Berlin', slug: 'john-doe' },
      { id: 2, name: 'Jane Smith', region: 'Hamburg', slug: 'jane-smith' }
    ];

    assignments = [
      { participant_id: 1, team_id: null, participant_name: 'John Doe' },
      { participant_id: 2, team_id: null, participant_name: 'Jane Smith' },
      { participant_id: null, team_id: 3, team_name: 'Test Team', team_region: 'Munich' }
    ];

    participantLookup = createParticipantLookupMap(participants);
    assignmentLookup = createAssignmentLookupMap(assignments);
  });

  describe('createParticipantLookupMap', () => {
    it('should create a map with participant IDs as keys', () => {
      expect(participantLookup.get(1)).toEqual(participants[0]);
      expect(participantLookup.get(2)).toEqual(participants[1]);
    });

    it('should handle empty participants array', () => {
      const emptyLookup = createParticipantLookupMap([]);
      expect(emptyLookup.size).toBe(0);
    });
  });

  describe('createAssignmentLookupMap', () => {
    it('should create participant and team maps', () => {
      expect(assignmentLookup.participantMap.get(1)).toEqual(assignments[0]);
      expect(assignmentLookup.participantMap.get(2)).toEqual(assignments[1]);
      expect(assignmentLookup.teamMap.get(3)).toEqual(assignments[2]);
    });
  });

  describe('lookupParticipantData', () => {
    it('should find participant by direct ID', () => {
      const participant = { participantId: 1 };
      const result = lookupParticipantData(participant, participantLookup, assignmentLookup, assignments);
      
      expect(result).toEqual({
        id: 1,
        name: 'John Doe',
        region: 'Berlin',
        slug: 'john-doe',
        isTeam: false
      });
    });

    it('should find team by teamId', () => {
      const participant = { teamId: 3 };
      const result = lookupParticipantData(participant, participantLookup, assignmentLookup, assignments);
      
      expect(result).toEqual({
        name: 'Test Team',
        region: 'Munich',
        slug: 'team-3',
        role: 'team',
        isTeam: true,
        teamMembers: []
      });
    });

    it('should handle assignment index lookup', () => {
      const participant = { participantId: 0 }; // Index 0 in assignments
      const result = lookupParticipantData(participant, participantLookup, assignmentLookup, assignments);
      
      expect(result).toEqual({
        id: 1,
        name: 'John Doe',
        region: 'Berlin',
        slug: 'john-doe',
        isTeam: false
      });
    });

    it('should return null for unknown participant', () => {
      const participant = { participantId: 999 };
      const result = lookupParticipantData(participant, participantLookup, assignmentLookup, assignments);
      
      expect(result).toBeNull();
    });

    it('should handle direct name fallback', () => {
      const participant = { name: 'Direct Name', region: 'Test Region' };
      const result = lookupParticipantData(participant, participantLookup, assignmentLookup, assignments);
      
      expect(result).toEqual({
        name: 'Direct Name',
        region: 'Test Region',
        slug: 'participant-unknown',
        role: 'participant',
        isTeam: false
      });
    });
  });

  describe('getParticipantFallbackName', () => {
    it('should return participant name if available', () => {
      const participant = { name: 'Test Name' };
      const result = getParticipantFallbackName(participant, 0);
      expect(result).toBe('Test Name');
    });

    it('should return team fallback for teamId', () => {
      const participant = { teamId: 3 };
      const result = getParticipantFallbackName(participant, 0);
      expect(result).toBe('Unbekanntes Team (ID: 3)');
    });

    it('should return participant fallback for participantId', () => {
      const participant = { participantId: 5 };
      const result = getParticipantFallbackName(participant, 0);
      expect(result).toBe('Unbekannte*r Teilnehmer*in (ID: 5)');
    });

    it('should return generic fallback', () => {
      const participant = {};
      const result = getParticipantFallbackName(participant, 2);
      expect(result).toBe('Unbekannte*r Teilnehmer*in 3');
    });
  });
});
