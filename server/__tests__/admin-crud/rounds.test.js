/**
 * Comprehensive Rounds CRUD Tests
 * Tests all admin endpoints for round management including slug generation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { createTestAdmin, getAuthToken, getAuthCookie, cleanupTestData, resetTestData } from './setup.js';
import { roundFactory, invalidDataFactory, boundaryDataFactory } from './helpers.js';

describe('Rounds CRUD', () => {
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

  describe('POST /api/rounds', () => {
    it('should create round with valid data', async () => {
      const round = roundFactory();
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        title: round.title,
        slug: round.slug,
        location: round.location,
        competitionType: round.competitionType,
        status: round.status
      });
      expect(res.body.meta.queryType).toBe('CREATE_ROUND');
      expect(res.body.meta.duration).toBeDefined();
    });

    it('should generate unique slug from title when slug not provided', async () => {
      const round = roundFactory({ 
        title: 'Test Round Title',
        slug: undefined 
      });
      
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round)
        .expect(201);

      expect(res.body.data.slug).toBe('test-round-title');
    });

    it('should handle slug generation with special characters', async () => {
      const round = roundFactory({ 
        title: 'Test Round with Special Chars! @#$%',
        slug: undefined 
      });
      
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round)
        .expect(201);

      expect(res.body.data.slug).toBeDefined();
      expect(res.body.data.slug).toMatch(/^test-round-with-special-chars/);
    });

    it('should use provided slug when given', async () => {
      const round = roundFactory({ 
        title: 'Test Round',
        slug: 'custom-slug-123'
      });
      
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round)
        .expect(201);

      expect(res.body.data.slug).toBe('custom-slug-123');
    });

    it('should validate time constraints (endTime > startTime)', async () => {
      const round = roundFactory({
        date: '2024-12-31',
        startTime: '22:00',
        endTime: '19:00' // End before start
      });
      
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should set default totalJuryMembers to 5', async () => {
      const round = roundFactory({ totalJuryMembers: undefined });
      
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round)
        .expect(201);

      expect(res.body.data.totalJuryMembers).toBe(5);
    });

    it('should set default status to SCHEDULED', async () => {
      const round = roundFactory({ status: undefined });
      
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round)
        .expect(201);

      expect(res.body.data.status).toBe('SCHEDULED');
    });

    it('should fail without authentication', async () => {
      const round = roundFactory();
      const res = await request(app)
        .post('/api/rounds')
        .send(round)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Authentication required');
    });

    it('should fail with missing required fields', async () => {
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send({ location: 'Test Venue' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail with empty title', async () => {
      const round = roundFactory({ title: '' });
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail with empty location', async () => {
      const round = roundFactory({ location: '' });
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid date formats', async () => {
      const round = roundFactory({
        date: 'invalid-date',
        startTime: '19:00',
        endTime: '22:00'
      });
      
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should validate competitionType values', async () => {
      const round = roundFactory({ competitionType: 'invalid-type' });
      
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round)
        .expect(201); // Should accept any string value

      expect(res.body.data.competitionType).toBe('invalid-type');
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousData = invalidDataFactory('sqlInjection').rounds;
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(maliciousData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle invalid field types', async () => {
      const invalidData = invalidDataFactory('invalidTypes').rounds;
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(invalidData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle maximum length fields', async () => {
      const maxLengthData = boundaryDataFactory('maxLength').rounds;
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(maxLengthData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/rounds/:id', () => {
    let createdRound;

    beforeEach(async () => {
      const round = roundFactory();
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round);
      createdRound = res.body.data;
    });

    it('should update round with valid data', async () => {
      const updateData = {
        title: 'Updated Test Round',
        location: 'Updated Venue',
        description: 'Updated description',
        status: 'ONGOING'
      };

      const res = await request(app)
        .put(`/api/rounds/${createdRound.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject(updateData);
      expect(res.body.meta.queryType).toBe('UPDATE_ROUND');
    });

    it('should update round with partial data', async () => {
      const updateData = {
        title: 'Partially Updated Round'
      };

      const res = await request(app)
        .put(`/api/rounds/${createdRound.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(updateData.title);
      expect(res.body.data.location).toBe(createdRound.location); // Should remain unchanged
    });

    it('should update dates and validate constraints', async () => {
      const updateData = {
        date: '2024-12-31',
        startTime: '20:00',
        endTime: '23:00'
      };

      const res = await request(app)
        .put(`/api/rounds/${createdRound.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.date).toBe(updateData.date);
      expect(res.body.data.startTime).toBe(updateData.startTime);
      expect(res.body.data.endTime).toBe(updateData.endTime);
    });

    it('should fail to update with invalid date constraints', async () => {
      const updateData = {
        date: '2024-12-31',
        startTime: '22:00',
        endTime: '19:00' // End before start
      };

      const res = await request(app)
        .put(`/api/rounds/${createdRound.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail to update non-existent round', async () => {
      const updateData = { title: 'Updated Title' };
      
      const res = await request(app)
        .put('/api/rounds/99999')
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not found');
    });

    it('should fail without authentication', async () => {
      const updateData = { title: 'Updated Title' };
      
      const res = await request(app)
        .put(`/api/rounds/${createdRound.id}`)
        .send(updateData)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid ID format', async () => {
      const updateData = { title: 'Updated Title' };
      
      const res = await request(app)
        .put('/api/rounds/invalid')
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle SQL injection in update', async () => {
      const maliciousData = invalidDataFactory('sqlInjection').rounds;
      
      const res = await request(app)
        .put(`/api/rounds/${createdRound.id}`)
        .set('Cookie', authCookie)
        .send(maliciousData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/rounds/:id', () => {
    let createdRound;

    beforeEach(async () => {
      const round = roundFactory();
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round);
      createdRound = res.body.data;
    });

    it('should delete existing round', async () => {
      const res = await request(app)
        .delete(`/api/rounds/${createdRound.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdRound.id);
      expect(res.body.meta.queryType).toBe('DELETE_ROUND');
    });

    it('should fail to delete non-existent round', async () => {
      const res = await request(app)
        .delete('/api/rounds/99999')
        .set('Cookie', authCookie)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not found');
    });

    it('should fail without authentication', async () => {
      const res = await request(app)
        .delete(`/api/rounds/${createdRound.id}`)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid ID format', async () => {
      const res = await request(app)
        .delete('/api/rounds/invalid')
        .set('Cookie', authCookie)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/rounds (verification)', () => {
    let createdRounds = [];

    beforeEach(async () => {
      // Create multiple rounds for list testing
      for (let i = 0; i < 3; i++) {
        const round = roundFactory({ title: `TEST Round ${i} ${Date.now()}` });
        const res = await request(app)
          .post('/api/rounds')
          .set('Cookie', authCookie)
          .send(round);
        createdRounds.push(res.body.data);
      }
    });

    it('should list all rounds including created ones', async () => {
      const res = await request(app)
        .get('/api/rounds')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // Verify our test rounds are in the list
      const testRoundTitles = createdRounds.map(r => r.title);
      const returnedTitles = res.body.data.map(r => r.title);
      
      testRoundTitles.forEach(title => {
        expect(returnedTitles).toContain(title);
      });
    });

    it('should return rounds with correct structure', async () => {
      const res = await request(app)
        .get('/api/rounds')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      
      const round = res.body.data[0];
      expect(round).toHaveProperty('id');
      expect(round).toHaveProperty('title');
      expect(round).toHaveProperty('slug');
      expect(round).toHaveProperty('date');
      expect(round).toHaveProperty('startTime');
      expect(round).toHaveProperty('endTime');
      expect(round).toHaveProperty('location');
      expect(round).toHaveProperty('status');
      expect(round).toHaveProperty('created_at');
      expect(round).toHaveProperty('updated_at');
    });
  });

  describe('Slug Generation and Uniqueness', () => {
    it('should generate unique slugs for similar titles', async () => {
      const round1 = roundFactory({ 
        title: 'Test Round',
        slug: undefined 
      });
      
      const round2 = roundFactory({ 
        title: 'Test Round',
        slug: undefined 
      });

      const res1 = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round1)
        .expect(201);

      const res2 = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round2)
        .expect(201);

      expect(res1.body.data.slug).toBe('test-round');
      expect(res2.body.data.slug).toBeDefined();
      expect(res2.body.data.slug).not.toBe(res1.body.data.slug);
    });

    it('should handle very long titles in slug generation', async () => {
      const round = roundFactory({ 
        title: 'A'.repeat(200) + ' Test Round',
        slug: undefined 
      });
      
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round)
        .expect(201);

      expect(res.body.data.slug).toBeDefined();
      expect(res.body.data.slug.length).toBeLessThan(255); // Database limit
    });

    it('should handle special characters in slug generation', async () => {
      const round = roundFactory({ 
        title: 'Test Round with Ümläuts & Special Chars!',
        slug: undefined 
      });
      
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round)
        .expect(201);

      expect(res.body.data.slug).toBeDefined();
      expect(res.body.data.slug).toMatch(/^test-round-with/);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long descriptions', async () => {
      const round = roundFactory({
        description: 'A'.repeat(10000)
      });
      
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe(round.description);
    });

    it('should handle future dates far in the future', async () => {
      const round = roundFactory({
        date: '2030-12-31',
        startTime: '19:00',
        endTime: '22:00'
      });
      
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round)
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('should handle past dates', async () => {
      const round = roundFactory({
        date: '2020-01-01',
        startTime: '19:00',
        endTime: '22:00'
      });
      
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round)
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('should handle different time zones in dates', async () => {
      const round = roundFactory({
        date: '2024-12-31',
        startTime: '19:00',
        endTime: '22:00'
      });
      
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round)
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('should handle empty optional fields', async () => {
      const round = roundFactory({
        description: '',
        address: '',
        afterPlayReport: ''
      });
      
      const res = await request(app)
        .post('/api/rounds')
        .set('Cookie', authCookie)
        .send(round)
        .expect(201);

      expect(res.body.success).toBe(true);
    });
  });
});
