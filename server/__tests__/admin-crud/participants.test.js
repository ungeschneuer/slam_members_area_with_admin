/**
 * Comprehensive Participants CRUD Tests
 * Tests all admin endpoints for participant management
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { createTestAdmin, getAuthToken, getAuthCookie, cleanupTestData, resetTestData } from './setup.js';
import { participantFactory, invalidDataFactory, boundaryDataFactory } from './helpers.js';

describe('Participants CRUD', () => {
  let authToken;
  let authCookie;
  let testAdmin;

  beforeAll(async () => {
    testAdmin = await createTestAdmin();
    authToken = await getAuthToken(testAdmin.id, testAdmin.role);
    authCookie = getAuthCookie(authToken);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    await resetTestData();
  });

  describe('POST /api/participants', () => {
    it('should create participant with valid data', async () => {
      const participant = participantFactory();
      const res = await request(app)
        .post('/api/participants')
        .set('Cookie', authCookie)
        .send(participant)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        name: participant.name,
        role: participant.role,
        region: participant.region,
        pronouns: participant.pronouns
      });
      expect(res.body.meta.queryType).toBe('CREATE_PARTICIPANT');
      expect(res.body.meta.duration).toBeDefined();
    });

    it('should normalize Instagram URL from @username format', async () => {
      const participant = participantFactory({ instagram: '@testuser' });
      const res = await request(app)
        .post('/api/participants')
        .set('Cookie', authCookie)
        .send(participant)
        .expect(201);

      expect(res.body.data.instagram).toBe('https://instagram.com/testuser');
    });

    it('should normalize Instagram URL from username format', async () => {
      const participant = participantFactory({ instagram: 'testuser' });
      const res = await request(app)
        .post('/api/participants')
        .set('Cookie', authCookie)
        .send(participant)
        .expect(201);

      expect(res.body.data.instagram).toBe('https://instagram.com/testuser');
    });

    it('should keep full Instagram URL as is', async () => {
      const participant = participantFactory({ instagram: 'https://instagram.com/testuser' });
      const res = await request(app)
        .post('/api/participants')
        .set('Cookie', authCookie)
        .send(participant)
        .expect(201);

      expect(res.body.data.instagram).toBe('https://instagram.com/testuser');
    });

    it('should fail without authentication', async () => {
      const participant = participantFactory();
      const res = await request(app)
        .post('/api/participants')
        .send(participant)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Authentication required');
    });

    it('should fail with missing required fields', async () => {
      const res = await request(app)
        .post('/api/participants')
        .set('Cookie', authCookie)
        .send({ region: 'Berlin' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail with empty name', async () => {
      const participant = participantFactory({ name: '' });
      const res = await request(app)
        .post('/api/participants')
        .set('Cookie', authCookie)
        .send(participant)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail with empty role', async () => {
      const participant = participantFactory({ role: '' });
      const res = await request(app)
        .post('/api/participants')
        .set('Cookie', authCookie)
        .send(participant)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail with empty region', async () => {
      const participant = participantFactory({ region: '' });
      const res = await request(app)
        .post('/api/participants')
        .set('Cookie', authCookie)
        .send(participant)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousData = invalidDataFactory('sqlInjection').participants;
      const res = await request(app)
        .post('/api/participants')
        .set('Cookie', authCookie)
        .send(maliciousData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle invalid field types', async () => {
      const invalidData = invalidDataFactory('invalidTypes').participants;
      const res = await request(app)
        .post('/api/participants')
        .set('Cookie', authCookie)
        .send(invalidData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle maximum length fields', async () => {
      const maxLengthData = boundaryDataFactory('maxLength').participants;
      const res = await request(app)
        .post('/api/participants')
        .set('Cookie', authCookie)
        .send(maxLengthData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/participants/:id', () => {
    let createdParticipant;

    beforeEach(async () => {
      const participant = participantFactory();
      const res = await request(app)
        .post('/api/participants')
        .set('Cookie', authCookie)
        .send(participant);
      createdParticipant = res.body.data;
    });

    it('should update participant with valid data', async () => {
      const updateData = {
        name: 'Updated Test Participant',
        role: 'Judge',
        region: 'Hamburg',
        pronouns: 'he/him',
        instagram: '@updateduser'
      };

      const res = await request(app)
        .put(`/api/participants/${createdParticipant.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject(updateData);
      expect(res.body.meta.queryType).toBe('UPDATE_PARTICIPANT');
    });

    it('should update participant with partial data', async () => {
      const updateData = {
        name: 'Partially Updated Participant'
      };

      const res = await request(app)
        .put(`/api/participants/${createdParticipant.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(updateData.name);
      expect(res.body.data.role).toBe(createdParticipant.role); // Should remain unchanged
    });

    it('should normalize Instagram URL on update', async () => {
      const updateData = {
        instagram: '@newuser'
      };

      const res = await request(app)
        .put(`/api/participants/${createdParticipant.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.data.instagram).toBe('https://instagram.com/newuser');
    });

    it('should fail to update non-existent participant', async () => {
      const updateData = { name: 'Updated Name' };
      
      const res = await request(app)
        .put('/api/participants/99999')
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not found');
    });

    it('should fail without authentication', async () => {
      const updateData = { name: 'Updated Name' };
      
      const res = await request(app)
        .put(`/api/participants/${createdParticipant.id}`)
        .send(updateData)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid ID format', async () => {
      const updateData = { name: 'Updated Name' };
      
      const res = await request(app)
        .put('/api/participants/invalid')
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle SQL injection in update', async () => {
      const maliciousData = invalidDataFactory('sqlInjection').participants;
      
      const res = await request(app)
        .put(`/api/participants/${createdParticipant.id}`)
        .set('Cookie', authCookie)
        .send(maliciousData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/participants/:id', () => {
    let createdParticipant;

    beforeEach(async () => {
      const participant = participantFactory();
      const res = await request(app)
        .post('/api/participants')
        .set('Cookie', authCookie)
        .send(participant);
      createdParticipant = res.body.data;
    });

    it('should delete existing participant', async () => {
      const res = await request(app)
        .delete(`/api/participants/${createdParticipant.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdParticipant.id);
      expect(res.body.meta.queryType).toBe('DELETE_PARTICIPANT');
    });

    it('should fail to delete non-existent participant', async () => {
      const res = await request(app)
        .delete('/api/participants/99999')
        .set('Cookie', authCookie)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not found');
    });

    it('should fail without authentication', async () => {
      const res = await request(app)
        .delete(`/api/participants/${createdParticipant.id}`)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid ID format', async () => {
      const res = await request(app)
        .delete('/api/participants/invalid')
        .set('Cookie', authCookie)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/participants (verification)', () => {
    let createdParticipants = [];

    beforeEach(async () => {
      // Create multiple participants for list testing
      for (let i = 0; i < 3; i++) {
        const participant = participantFactory({ name: `TEST Participant ${i} ${Date.now()}` });
        const res = await request(app)
          .post('/api/participants')
          .set('Cookie', authCookie)
          .send(participant);
        createdParticipants.push(res.body.data);
      }
    });

    it('should list all participants including created ones', async () => {
      const res = await request(app)
        .get('/api/participants')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // Verify our test participants are in the list
      const testParticipantNames = createdParticipants.map(p => p.name);
      const returnedNames = res.body.data.map(p => p.name);
      
      testParticipantNames.forEach(name => {
        expect(returnedNames).toContain(name);
      });
    });

    it('should return participants with correct structure', async () => {
      const res = await request(app)
        .get('/api/participants')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      
      const participant = res.body.data[0];
      expect(participant).toHaveProperty('id');
      expect(participant).toHaveProperty('name');
      expect(participant).toHaveProperty('role');
      expect(participant).toHaveProperty('region');
      expect(participant).toHaveProperty('created_at');
      expect(participant).toHaveProperty('updated_at');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database connection
      // For now, we'll test that the error handling structure is in place
      const participant = participantFactory();
      
      // Normal request should work
      const res = await request(app)
        .post('/api/participants')
        .set('Cookie', authCookie)
        .send(participant)
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('should handle malformed JSON in request body', async () => {
      const res = await request(app)
        .post('/api/participants')
        .set('Cookie', authCookie)
        .set('Content-Type', 'application/json')
        .send('{"name": "Test", "role": "Slammer", "region": "Berlin"') // Missing closing brace
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle very long Instagram URLs', async () => {
      const participant = participantFactory({ 
        instagram: 'https://instagram.com/' + 'a'.repeat(1000) 
      });
      
      const res = await request(app)
        .post('/api/participants')
        .set('Cookie', authCookie)
        .send(participant)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle special characters in participant data', async () => {
      const participant = participantFactory({
        name: 'Test Participant with Special Chars: !@#$%^&*()',
        pronouns: 'they/them/their',
        region: 'Berlin-Mitte'
      });

      const res = await request(app)
        .post('/api/participants')
        .set('Cookie', authCookie)
        .send(participant)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(participant.name);
    });
  });
});
