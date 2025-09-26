// Participants API Tests for SLAM25 Application
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { executeQuery } from '../config/database.js';
import participantRoutes from '../routes/participants.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

// Mock authentication middleware
jest.mock('../middleware/auth.js', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
  authorize: (...roles) => (req, res, next) => {
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Insufficient permissions' });
    }
  }
}));

// Mock database
jest.mock('../config/database.js', () => ({
  executeQuery: jest.fn()
}));

// Mock WebSocket service
jest.mock('../services/websocketService.js', () => ({
  emitDataUpdate: jest.fn(),
  emitAdminUpdate: jest.fn()
}));

const app = express();
app.use(express.json());
app.use('/participants', participantRoutes);

describe('Participants API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /participants', () => {
    it('should return all participants', async () => {
      const mockParticipants = [
        testUtils.generateTestParticipant({ id: 1, name: 'Participant 1' }),
        testUtils.generateTestParticipant({ id: 2, name: 'Participant 2' })
      ];

      executeQuery.mockResolvedValueOnce({ rows: mockParticipants });

      const response = await request(app)
        .get('/participants')
        .expect(200);

      expect(response.body).toEqual(mockParticipants);
      expect(executeQuery).toHaveBeenCalledWith(
        'SELECT * FROM participants ORDER BY name ASC'
      );
    });

    it('should handle database errors', async () => {
      executeQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/participants')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch participants');
    });
  });

  describe('GET /participants/:id', () => {
    it('should return specific participant', async () => {
      const mockParticipant = testUtils.generateTestParticipant({ id: 1 });
      executeQuery.mockResolvedValueOnce({ rows: [mockParticipant] });

      const response = await request(app)
        .get('/participants/1')
        .expect(200);

      expect(response.body).toEqual(mockParticipant);
      expect(executeQuery).toHaveBeenCalledWith(
        'SELECT * FROM participants WHERE id = $1',
        [1]
      );
    });

    it('should return 404 for non-existent participant', async () => {
      executeQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/participants/999')
        .expect(404);

      expect(response.body.error).toBe('Participant not found');
    });
  });

  describe('POST /participants', () => {
    it('should create new participant (admin only)', async () => {
      const participantData = testUtils.generateTestParticipant();
      const createdParticipant = { id: 1, ...participantData };
      
      executeQuery.mockResolvedValueOnce({ rows: [createdParticipant] });

      const response = await request(app)
        .post('/participants')
        .send(participantData)
        .expect(201);

      expect(response.body).toEqual(createdParticipant);
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO participants'),
        expect.arrayContaining([
          participantData.name,
          participantData.role,
          participantData.region,
          participantData.pronouns,
          participantData.instagram
        ])
      );
    });

    it('should handle creation errors', async () => {
      const participantData = testUtils.generateTestParticipant();
      executeQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/participants')
        .send(participantData)
        .expect(500);

      expect(response.body.error).toBe('Failed to create participant');
    });
  });

  describe('PUT /participants/:id', () => {
    it('should update participant (admin only)', async () => {
      const participantData = testUtils.generateTestParticipant();
      const updatedParticipant = { id: 1, ...participantData };
      
      executeQuery.mockResolvedValueOnce({ rows: [updatedParticipant] });

      const response = await request(app)
        .put('/participants/1')
        .send(participantData)
        .expect(200);

      expect(response.body).toEqual(updatedParticipant);
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE participants'),
        expect.arrayContaining([
          participantData.name,
          participantData.role,
          participantData.region,
          participantData.pronouns,
          participantData.instagram,
          1
        ])
      );
    });

    it('should return 404 for non-existent participant update', async () => {
      const participantData = testUtils.generateTestParticipant();
      executeQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/participants/999')
        .send(participantData)
        .expect(404);

      expect(response.body.error).toBe('Participant not found');
    });
  });

  describe('DELETE /participants/:id', () => {
    it('should delete participant (admin only)', async () => {
      const deletedParticipant = { id: 1, name: 'Deleted Participant' };
      executeQuery.mockResolvedValueOnce({ rows: [deletedParticipant] });

      const response = await request(app)
        .delete('/participants/1')
        .expect(200);

      expect(response.body.message).toBe('Participant deleted successfully');
      expect(executeQuery).toHaveBeenCalledWith(
        'DELETE FROM participants WHERE id = $1 RETURNING *',
        [1]
      );
    });

    it('should return 404 for non-existent participant deletion', async () => {
      executeQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/participants/999')
        .expect(404);

      expect(response.body.error).toBe('Participant not found');
    });
  });

  describe('GET /participants/search/:query', () => {
    it('should search participants', async () => {
      const searchResults = [
        testUtils.generateTestParticipant({ id: 1, name: 'John Doe' })
      ];
      
      executeQuery.mockResolvedValueOnce({ rows: searchResults });

      const response = await request(app)
        .get('/participants/search/john')
        .expect(200);

      expect(response.body).toEqual(searchResults);
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE name ILIKE'),
        ['%john%']
      );
    });
  });
});

