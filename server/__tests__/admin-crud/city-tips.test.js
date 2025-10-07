/**
 * Comprehensive City Tips CRUD Tests
 * Tests all admin endpoints for city tip management including coordinate validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { createTestAdmin, getAuthToken, getAuthCookie, cleanupTestData, resetTestData } from './setup.js';
import { cityTipFactory, invalidDataFactory, boundaryDataFactory } from './helpers.js';

describe('City Tips CRUD', () => {
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

  describe('POST /api/city-tips', () => {
    it('should create city tip with valid data', async () => {
      const cityTip = cityTipFactory();
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        name: cityTip.name,
        category: cityTip.category,
        description: cityTip.description,
        address: cityTip.address,
        latitude: cityTip.latitude,
        longitude: cityTip.longitude,
        status: cityTip.status
      });
      expect(res.body.meta.queryType).toBe('CREATE_CITY_TIP');
      expect(res.body.meta.duration).toBeDefined();
    });

    it('should normalize opening_hours JSON object', async () => {
      const cityTip = cityTipFactory({
        opening_hours: {
          monday: '10:00-22:00',
          tuesday: '10:00-22:00',
          wednesday: '10:00-22:00',
          thursday: '10:00-22:00',
          friday: '10:00-23:00',
          saturday: '10:00-23:00',
          sunday: '12:00-21:00'
        }
      });
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip)
        .expect(201);

      expect(res.body.data.opening_hours).toEqual(cityTip.opening_hours);
    });

    it('should normalize contact_info JSON object', async () => {
      const cityTip = cityTipFactory({
        contact_info: {
          phone: '+49 30 12345678',
          email: 'contact@example.com',
          website: 'https://example.com'
        }
      });
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip)
        .expect(201);

      expect(res.body.data.contact_info).toEqual(cityTip.contact_info);
    });

    it('should normalize images JSON array', async () => {
      const cityTip = cityTipFactory({
        images: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
          'https://example.com/image3.jpg'
        ]
      });
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip)
        .expect(201);

      expect(res.body.data.images).toEqual(cityTip.images);
    });

    it('should set default status to ACTIVE', async () => {
      const cityTip = cityTipFactory({ status: undefined });
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip)
        .expect(201);

      expect(res.body.data.status).toBe('ACTIVE');
    });

    it('should handle is_featured boolean', async () => {
      const cityTip = cityTipFactory({ is_featured: true });
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip)
        .expect(201);

      expect(res.body.data.is_featured).toBe(true);
    });

    it('should handle slug validation', async () => {
      const cityTip = cityTipFactory({ slug: 'custom-slug-123' });
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip)
        .expect(201);

      expect(res.body.data.slug).toBe('custom-slug-123');
    });

    it('should fail without authentication', async () => {
      const cityTip = cityTipFactory();
      const res = await request(app)
        .post('/api/city-tips')
        .send(cityTip)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Authentication required');
    });

    it('should fail with missing required fields', async () => {
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send({ address: 'Test Address' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail with empty name', async () => {
      const cityTip = cityTipFactory({ name: '' });
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail with empty category', async () => {
      const cityTip = cityTipFactory({ category: '' });
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail with empty description', async () => {
      const cityTip = cityTipFactory({ description: '' });
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should validate latitude range (-90 to 90)', async () => {
      const cityTip = cityTipFactory({ latitude: 91 }); // Invalid latitude
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should validate longitude range (-180 to 180)', async () => {
      const cityTip = cityTipFactory({ longitude: 181 }); // Invalid longitude
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should accept valid coordinate ranges', async () => {
      const validCoordinates = [
        { latitude: -90, longitude: -180 },
        { latitude: 0, longitude: 0 },
        { latitude: 90, longitude: 180 },
        { latitude: 52.5200, longitude: 13.4050 } // Berlin coordinates
      ];

      for (const coords of validCoordinates) {
        const cityTip = cityTipFactory(coords);
        const res = await request(app)
          .post('/api/city-tips')
          .set('Cookie', authCookie)
          .send(cityTip)
          .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data.latitude).toBe(coords.latitude);
        expect(res.body.data.longitude).toBe(coords.longitude);
      }
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousData = invalidDataFactory('sqlInjection').cityTips;
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(maliciousData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle invalid field types', async () => {
      const invalidData = invalidDataFactory('invalidTypes').cityTips;
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(invalidData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle maximum length fields', async () => {
      const maxLengthData = boundaryDataFactory('maxLength').cityTips;
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(maxLengthData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/city-tips/:id', () => {
    let createdCityTip;

    beforeEach(async () => {
      const cityTip = cityTipFactory();
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip);
      createdCityTip = res.body.data;
    });

    it('should update city tip with valid data', async () => {
      const updateData = {
        name: 'Updated Test City Tip',
        category: 'updated-category',
        description: 'Updated description',
        address: 'Updated Address 456',
        latitude: 52.5200,
        longitude: 13.4050,
        price_range: '€€€',
        website: 'https://updated-example.com'
      };

      const res = await request(app)
        .put(`/api/city-tips/${createdCityTip.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject(updateData);
      expect(res.body.meta.queryType).toBe('UPDATE_CITY_TIP');
    });

    it('should update city tip with partial data', async () => {
      const updateData = {
        name: 'Partially Updated City Tip'
      };

      const res = await request(app)
        .put(`/api/city-tips/${createdCityTip.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(updateData.name);
      expect(res.body.data.category).toBe(createdCityTip.category); // Should remain unchanged
    });

    it('should update opening_hours', async () => {
      const updateData = {
        opening_hours: {
          monday: '09:00-21:00',
          tuesday: '09:00-21:00',
          wednesday: '09:00-21:00',
          thursday: '09:00-21:00',
          friday: '09:00-22:00',
          saturday: '10:00-22:00',
          sunday: 'closed'
        }
      };

      const res = await request(app)
        .put(`/api/city-tips/${createdCityTip.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.opening_hours).toEqual(updateData.opening_hours);
    });

    it('should update contact_info', async () => {
      const updateData = {
        contact_info: {
          phone: '+49 30 98765432',
          email: 'newcontact@example.com',
          website: 'https://newwebsite.com'
        }
      };

      const res = await request(app)
        .put(`/api/city-tips/${createdCityTip.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.contact_info).toEqual(updateData.contact_info);
    });

    it('should update images array', async () => {
      const updateData = {
        images: [
          'https://example.com/new-image1.jpg',
          'https://example.com/new-image2.jpg'
        ]
      };

      const res = await request(app)
        .put(`/api/city-tips/${createdCityTip.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.images).toEqual(updateData.images);
    });

    it('should update coordinates', async () => {
      const updateData = {
        latitude: 48.1351, // Munich coordinates
        longitude: 11.5820
      };

      const res = await request(app)
        .put(`/api/city-tips/${createdCityTip.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.latitude).toBe(updateData.latitude);
      expect(res.body.data.longitude).toBe(updateData.longitude);
    });

    it('should fail to update with invalid coordinates', async () => {
      const updateData = {
        latitude: 91, // Invalid latitude
        longitude: 13.4050
      };

      const res = await request(app)
        .put(`/api/city-tips/${createdCityTip.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail to update non-existent city tip', async () => {
      const updateData = { name: 'Updated Name' };
      
      const res = await request(app)
        .put('/api/city-tips/99999')
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not found');
    });

    it('should fail without authentication', async () => {
      const updateData = { name: 'Updated Name' };
      
      const res = await request(app)
        .put(`/api/city-tips/${createdCityTip.id}`)
        .send(updateData)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid ID format', async () => {
      const updateData = { name: 'Updated Name' };
      
      const res = await request(app)
        .put('/api/city-tips/invalid')
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle SQL injection in update', async () => {
      const maliciousData = invalidDataFactory('sqlInjection').cityTips;
      
      const res = await request(app)
        .put(`/api/city-tips/${createdCityTip.id}`)
        .set('Cookie', authCookie)
        .send(maliciousData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/city-tips/:id', () => {
    let createdCityTip;

    beforeEach(async () => {
      const cityTip = cityTipFactory();
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip);
      createdCityTip = res.body.data;
    });

    it('should delete existing city tip', async () => {
      const res = await request(app)
        .delete(`/api/city-tips/${createdCityTip.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdCityTip.id);
      expect(res.body.meta.queryType).toBe('DELETE_CITY_TIP');
    });

    it('should fail to delete non-existent city tip', async () => {
      const res = await request(app)
        .delete('/api/city-tips/99999')
        .set('Cookie', authCookie)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not found');
    });

    it('should fail without authentication', async () => {
      const res = await request(app)
        .delete(`/api/city-tips/${createdCityTip.id}`)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid ID format', async () => {
      const res = await request(app)
        .delete('/api/city-tips/invalid')
        .set('Cookie', authCookie)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/city-tips (verification)', () => {
    let createdCityTips = [];

    beforeEach(async () => {
      // Create multiple city tips for list testing
      for (let i = 0; i < 3; i++) {
        const cityTip = cityTipFactory({ name: `TEST City Tip ${i} ${Date.now()}` });
        const res = await request(app)
          .post('/api/city-tips')
          .set('Cookie', authCookie)
          .send(cityTip);
        createdCityTips.push(res.body.data);
      }
    });

    it('should list all city tips including created ones', async () => {
      const res = await request(app)
        .get('/api/city-tips')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // Verify our test city tips are in the list
      const testCityTipNames = createdCityTips.map(c => c.name);
      const returnedNames = res.body.data.map(c => c.name);
      
      testCityTipNames.forEach(name => {
        expect(returnedNames).toContain(name);
      });
    });

    it('should return city tips with correct structure', async () => {
      const res = await request(app)
        .get('/api/city-tips')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      
      const cityTip = res.body.data[0];
      expect(cityTip).toHaveProperty('id');
      expect(cityTip).toHaveProperty('name');
      expect(cityTip).toHaveProperty('category');
      expect(cityTip).toHaveProperty('description');
      expect(cityTip).toHaveProperty('address');
      expect(cityTip).toHaveProperty('latitude');
      expect(cityTip).toHaveProperty('longitude');
      expect(cityTip).toHaveProperty('status');
      expect(cityTip).toHaveProperty('created_at');
      expect(cityTip).toHaveProperty('updated_at');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long descriptions', async () => {
      const cityTip = cityTipFactory({
        description: 'A'.repeat(10000),
        tips: 'A'.repeat(5000)
      });
      
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe(cityTip.description);
      expect(res.body.data.tips).toBe(cityTip.tips);
    });

    it('should handle many images', async () => {
      const cityTip = cityTipFactory({
        images: Array.from({ length: 20 }, (_, i) => `https://example.com/image${i}.jpg`)
      });
      
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.images).toEqual(cityTip.images);
    });

    it('should handle empty images array', async () => {
      const cityTip = cityTipFactory({ images: [] });
      
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.images).toEqual([]);
    });

    it('should handle complex opening_hours structure', async () => {
      const cityTip = cityTipFactory({
        opening_hours: {
          monday: { open: '10:00', close: '22:00', note: 'Regular hours' },
          tuesday: { open: '10:00', close: '22:00', note: 'Regular hours' },
          wednesday: { open: '10:00', close: '22:00', note: 'Regular hours' },
          thursday: { open: '10:00', close: '22:00', note: 'Regular hours' },
          friday: { open: '10:00', close: '23:00', note: 'Extended hours' },
          saturday: { open: '10:00', close: '23:00', note: 'Extended hours' },
          sunday: { open: '12:00', close: '21:00', note: 'Reduced hours' }
        }
      });
      
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.opening_hours).toEqual(cityTip.opening_hours);
    });

    it('should handle complex contact_info structure', async () => {
      const cityTip = cityTipFactory({
        contact_info: {
          phone: '+49 30 12345678',
          email: 'contact@example.com',
          website: 'https://example.com',
          social: {
            instagram: '@example',
            facebook: 'Example Restaurant',
            twitter: '@example'
          },
          additional: {
            reservation_required: true,
            max_party_size: 8,
            dress_code: 'casual'
          }
        }
      });
      
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.contact_info).toEqual(cityTip.contact_info);
    });

    it('should handle special characters in content', async () => {
      const cityTip = cityTipFactory({
        name: 'City Tip with Special Chars: !@#$%^&*()',
        description: 'Description with Ümläuts and émojis 🎉',
        tips: 'Tips with special chars: <>&"\''
      });
      
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(cityTip.name);
      expect(res.body.data.description).toBe(cityTip.description);
      expect(res.body.data.tips).toBe(cityTip.tips);
    });

    it('should handle extreme coordinate values', async () => {
      const extremeCoordinates = [
        { latitude: -90, longitude: -180 }, // South Pole, International Date Line
        { latitude: 90, longitude: 180 },   // North Pole, International Date Line
        { latitude: 0, longitude: 0 }      // Equator, Prime Meridian
      ];

      for (const coords of extremeCoordinates) {
        const cityTip = cityTipFactory(coords);
        const res = await request(app)
          .post('/api/city-tips')
          .set('Cookie', authCookie)
          .send(cityTip)
          .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data.latitude).toBe(coords.latitude);
        expect(res.body.data.longitude).toBe(coords.longitude);
      }
    });

    it('should handle malformed JSON in request body', async () => {
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .set('Content-Type', 'application/json')
        .send('{"name": "Test", "category": "restaurant"') // Missing closing brace
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle decimal precision in coordinates', async () => {
      const cityTip = cityTipFactory({
        latitude: 52.520008, // High precision Berlin coordinates
        longitude: 13.404954
      });
      
      const res = await request(app)
        .post('/api/city-tips')
        .set('Cookie', authCookie)
        .send(cityTip)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.latitude).toBe(cityTip.latitude);
      expect(res.body.data.longitude).toBe(cityTip.longitude);
    });
  });
});
