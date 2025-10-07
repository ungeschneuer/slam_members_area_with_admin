/**
 * Comprehensive Timetable CRUD Tests
 * Tests all admin endpoints for timetable entry management
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { createTestAdmin, getAuthToken, getAuthCookie, cleanupTestData, resetTestData } from './setup.js';
import { timetableFactory, invalidDataFactory, boundaryDataFactory } from './helpers.js';

describe('Timetable CRUD', () => {
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

  describe('POST /api/timetable', () => {
    it('should create timetable entry with valid data', async () => {
      const timetable = timetableFactory();
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(timetable)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        title: timetable.title,
        description: timetable.description,
        location: timetable.location,
        date: timetable.date,
        time: timetable.time,
        type: timetable.type,
        status: timetable.status
      });
      expect(res.body.meta.queryType).toBe('CREATE_TIMETABLE');
      expect(res.body.meta.duration).toBeDefined();
    });

    it('should normalize additionalLinks JSON array', async () => {
      const timetable = timetableFactory({
        additionalLinks: [
          { name: 'Link 1', url: 'https://example1.com' },
          { name: 'Link 2', url: 'https://example2.com' }
        ]
      });
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(timetable)
        .expect(201);

      expect(res.body.data.additionalLinks).toEqual(timetable.additionalLinks);
    });

    it('should handle empty additionalLinks array', async () => {
      const timetable = timetableFactory({ additionalLinks: [] });
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(timetable)
        .expect(201);

      expect(res.body.data.additionalLinks).toEqual([]);
    });

    it('should set default type to general', async () => {
      const timetable = timetableFactory({ type: undefined });
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(timetable)
        .expect(201);

      expect(res.body.data.type).toBe('general');
    });

    it('should set default status to confirmed', async () => {
      const timetable = timetableFactory({ status: undefined });
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(timetable)
        .expect(201);

      expect(res.body.data.status).toBe('confirmed');
    });

    it('should validate type values', async () => {
      const validTypes = ['team-round', 'individual-round', 'workshop', 'fun', 'aftershow'];
      
      for (const type of validTypes) {
        const timetable = timetableFactory({ type });
        const res = await request(app)
          .post('/api/timetable')
          .set('Cookie', authCookie)
          .send(timetable)
          .expect(201);

        expect(res.body.data.type).toBe(type);
      }
    });

    it('should validate status values', async () => {
      const validStatuses = ['confirmed', 'tentative', 'cancelled'];
      
      for (const status of validStatuses) {
        const timetable = timetableFactory({ status });
        const res = await request(app)
          .post('/api/timetable')
          .set('Cookie', authCookie)
          .send(timetable)
          .expect(201);

        expect(res.body.data.status).toBe(status);
      }
    });

    it('should handle detailedDescription', async () => {
      const timetable = timetableFactory({
        detailedDescription: 'This is a detailed description with more information about the event.'
      });
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(timetable)
        .expect(201);

      expect(res.body.data.detailedDescription).toBe(timetable.detailedDescription);
    });

    it('should fail without authentication', async () => {
      const timetable = timetableFactory();
      const res = await request(app)
        .post('/api/timetable')
        .send(timetable)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Authentication required');
    });

    it('should fail with missing required fields', async () => {
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send({ location: 'Test Location' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail with empty title', async () => {
      const timetable = timetableFactory({ title: '' });
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(timetable)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail with empty description', async () => {
      const timetable = timetableFactory({ description: '' });
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(timetable)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle invalid date formats', async () => {
      const timetable = timetableFactory({ date: 'invalid-date' });
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(timetable)
        .expect(201); // Should accept any string value

      expect(res.body.data.date).toBe('invalid-date');
    });

    it('should handle invalid time formats', async () => {
      const timetable = timetableFactory({ time: 'invalid-time' });
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(timetable)
        .expect(201); // Should accept any string value

      expect(res.body.data.time).toBe('invalid-time');
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousData = invalidDataFactory('sqlInjection').timetable;
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(maliciousData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle invalid field types', async () => {
      const invalidData = invalidDataFactory('invalidTypes').timetable;
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(invalidData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle maximum length fields', async () => {
      const maxLengthData = boundaryDataFactory('maxLength').timetable;
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(maxLengthData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/timetable/:id', () => {
    let createdTimetable;

    beforeEach(async () => {
      const timetable = timetableFactory();
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(timetable);
      createdTimetable = res.body.data;
    });

    it('should update timetable entry with valid data', async () => {
      const updateData = {
        title: 'Updated Test Timetable',
        description: 'Updated description',
        location: 'Updated Location',
        date: '2024-01-01',
        time: '20:00',
        type: 'workshop',
        status: 'tentative'
      };

      const res = await request(app)
        .put(`/api/timetable/${createdTimetable.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject(updateData);
      expect(res.body.meta.queryType).toBe('UPDATE_TIMETABLE');
    });

    it('should update timetable entry with partial data', async () => {
      const updateData = {
        title: 'Partially Updated Timetable'
      };

      const res = await request(app)
        .put(`/api/timetable/${createdTimetable.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(updateData.title);
      expect(res.body.data.description).toBe(createdTimetable.description); // Should remain unchanged
    });

    it('should update additionalLinks array', async () => {
      const updateData = {
        additionalLinks: [
          { name: 'New Link', url: 'https://newexample.com' }
        ]
      };

      const res = await request(app)
        .put(`/api/timetable/${createdTimetable.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.additionalLinks).toEqual(updateData.additionalLinks);
    });

    it('should update detailedDescription', async () => {
      const updateData = {
        detailedDescription: 'Updated detailed description with more information.'
      };

      const res = await request(app)
        .put(`/api/timetable/${createdTimetable.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.detailedDescription).toBe(updateData.detailedDescription);
    });

    it('should fail to update non-existent timetable entry', async () => {
      const updateData = { title: 'Updated Title' };
      
      const res = await request(app)
        .put('/api/timetable/99999')
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not found');
    });

    it('should fail without authentication', async () => {
      const updateData = { title: 'Updated Title' };
      
      const res = await request(app)
        .put(`/api/timetable/${createdTimetable.id}`)
        .send(updateData)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid ID format', async () => {
      const updateData = { title: 'Updated Title' };
      
      const res = await request(app)
        .put('/api/timetable/invalid')
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle SQL injection in update', async () => {
      const maliciousData = invalidDataFactory('sqlInjection').timetable;
      
      const res = await request(app)
        .put(`/api/timetable/${createdTimetable.id}`)
        .set('Cookie', authCookie)
        .send(maliciousData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/timetable/:id', () => {
    let createdTimetable;

    beforeEach(async () => {
      const timetable = timetableFactory();
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(timetable);
      createdTimetable = res.body.data;
    });

    it('should delete existing timetable entry', async () => {
      const res = await request(app)
        .delete(`/api/timetable/${createdTimetable.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdTimetable.id);
      expect(res.body.meta.queryType).toBe('DELETE_TIMETABLE');
    });

    it('should fail to delete non-existent timetable entry', async () => {
      const res = await request(app)
        .delete('/api/timetable/99999')
        .set('Cookie', authCookie)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not found');
    });

    it('should fail without authentication', async () => {
      const res = await request(app)
        .delete(`/api/timetable/${createdTimetable.id}`)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid ID format', async () => {
      const res = await request(app)
        .delete('/api/timetable/invalid')
        .set('Cookie', authCookie)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/timetable (verification)', () => {
    let createdTimetables = [];

    beforeEach(async () => {
      // Create multiple timetable entries for list testing
      for (let i = 0; i < 3; i++) {
        const timetable = timetableFactory({ title: `TEST Timetable ${i} ${Date.now()}` });
        const res = await request(app)
          .post('/api/timetable')
          .set('Cookie', authCookie)
          .send(timetable);
        createdTimetables.push(res.body.data);
      }
    });

    it('should list all timetable entries including created ones', async () => {
      const res = await request(app)
        .get('/api/timetable')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // Verify our test timetable entries are in the list
      const testTimetableTitles = createdTimetables.map(t => t.title);
      const returnedTitles = res.body.data.map(t => t.title);
      
      testTimetableTitles.forEach(title => {
        expect(returnedTitles).toContain(title);
      });
    });

    it('should return timetable entries with correct structure', async () => {
      const res = await request(app)
        .get('/api/timetable')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      
      const timetable = res.body.data[0];
      expect(timetable).toHaveProperty('id');
      expect(timetable).toHaveProperty('title');
      expect(timetable).toHaveProperty('description');
      expect(timetable).toHaveProperty('location');
      expect(timetable).toHaveProperty('date');
      expect(timetable).toHaveProperty('time');
      expect(timetable).toHaveProperty('type');
      expect(timetable).toHaveProperty('status');
      expect(timetable).toHaveProperty('created_at');
      expect(timetable).toHaveProperty('updated_at');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long descriptions', async () => {
      const timetable = timetableFactory({
        description: 'A'.repeat(10000),
        detailedDescription: 'A'.repeat(20000)
      });
      
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(timetable)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe(timetable.description);
      expect(res.body.data.detailedDescription).toBe(timetable.detailedDescription);
    });

    it('should handle many additionalLinks', async () => {
      const timetable = timetableFactory({
        additionalLinks: Array.from({ length: 20 }, (_, i) => ({
          name: `Link ${i}`,
          url: `https://example${i}.com`
        }))
      });
      
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(timetable)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.additionalLinks).toEqual(timetable.additionalLinks);
    });

    it('should handle empty additionalLinks array', async () => {
      const timetable = timetableFactory({ additionalLinks: [] });
      
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(timetable)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.additionalLinks).toEqual([]);
    });

    it('should handle special characters in content', async () => {
      const timetable = timetableFactory({
        title: 'Timetable with Special Chars: !@#$%^&*()',
        description: 'Description with Ümläuts and émojis 🎉',
        detailedDescription: 'Detailed description with special chars: <>&"\''
      });
      
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(timetable)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(timetable.title);
      expect(res.body.data.description).toBe(timetable.description);
      expect(res.body.data.detailedDescription).toBe(timetable.detailedDescription);
    });

    it('should handle various date formats', async () => {
      const dateFormats = [
        '2024-12-31',
        '31.12.2024',
        '2024/12/31',
        'Dec 31, 2024'
      ];

      for (const date of dateFormats) {
        const timetable = timetableFactory({ date });
        const res = await request(app)
          .post('/api/timetable')
          .set('Cookie', authCookie)
          .send(timetable)
          .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data.date).toBe(date);
      }
    });

    it('should handle various time formats', async () => {
      const timeFormats = [
        '19:00',
        '7:00 PM',
        '19:00:00',
        '7pm'
      ];

      for (const time of timeFormats) {
        const timetable = timetableFactory({ time });
        const res = await request(app)
          .post('/api/timetable')
          .set('Cookie', authCookie)
          .send(timetable)
          .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data.time).toBe(time);
      }
    });

    it('should handle malformed JSON in request body', async () => {
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .set('Content-Type', 'application/json')
        .send('{"title": "Test", "description": "Test description"') // Missing closing brace
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle complex additionalLinks structure', async () => {
      const timetable = timetableFactory({
        additionalLinks: [
          {
            name: 'Complex Link',
            url: 'https://example.com',
            description: 'Link description',
            type: 'external'
          },
          {
            name: 'Another Link',
            url: 'https://another.com',
            description: 'Another description'
          }
        ]
      });
      
      const res = await request(app)
        .post('/api/timetable')
        .set('Cookie', authCookie)
        .send(timetable)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.additionalLinks).toEqual(timetable.additionalLinks);
    });
  });
});
