/**
 * Comprehensive Info Pages CRUD Tests
 * Tests all admin endpoints for info page management including SEO optimization
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { createTestAdmin, getAuthToken, getAuthCookie, cleanupTestData, resetTestData } from './setup.js';
import { infoPageFactory, invalidDataFactory, boundaryDataFactory } from './helpers.js';

describe('Info Pages CRUD', () => {
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

  describe('POST /api/info-pages', () => {
    it('should create info page with valid data', async () => {
      const infoPage = infoPageFactory();
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        title: infoPage.title,
        slug: infoPage.slug,
        content: infoPage.content,
        excerpt: infoPage.excerpt,
        category: infoPage.category,
        status: infoPage.status
      });
      expect(res.body.meta.queryType).toBe('CREATE_INFO_PAGE');
      expect(res.body.meta.duration).toBeDefined();
    });

    it('should normalize tags array', async () => {
      const infoPage = infoPageFactory({ tags: ['tag1', 'tag2', 'tag3'] });
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.data.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should handle empty tags array', async () => {
      const infoPage = infoPageFactory({ tags: [] });
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.data.tags).toEqual([]);
    });

    it('should set default category to general', async () => {
      const infoPage = infoPageFactory({ category: undefined });
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.data.category).toBe('general');
    });

    it('should set default order to 0', async () => {
      const infoPage = infoPageFactory({ order: undefined });
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.data.order).toBe(0);
    });

    it('should set default status to DRAFT', async () => {
      const infoPage = infoPageFactory({ status: undefined });
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.data.status).toBe('DRAFT');
    });

    it('should set default isPublished to false', async () => {
      const infoPage = infoPageFactory({ isPublished: undefined });
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.data.isPublished).toBe(false);
    });

    it('should handle metaDescription for SEO', async () => {
      const metaDescription = 'This is a meta description for SEO optimization';
      const infoPage = infoPageFactory({ metaDescription });
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.data.metaDescription).toBe(metaDescription);
    });

    it('should handle featuredImageUrl', async () => {
      const featuredImageUrl = 'https://example.com/featured-image.jpg';
      const infoPage = infoPageFactory({ featuredImageUrl });
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.data.featuredImageUrl).toBe(featuredImageUrl);
    });

    it('should handle publishedAt timestamp', async () => {
      const publishedAt = '2024-12-31T12:00:00Z';
      const infoPage = infoPageFactory({ publishedAt });
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.data.publishedAt).toBe(publishedAt);
    });

    it('should handle null publishedAt', async () => {
      const infoPage = infoPageFactory({ publishedAt: null });
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.data.publishedAt).toBeNull();
    });

    it('should fail without authentication', async () => {
      const infoPage = infoPageFactory();
      const res = await request(app)
        .post('/api/info-pages')
        .send(infoPage)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Authentication required');
    });

    it('should fail with missing required fields', async () => {
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send({ category: 'general' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail with empty title', async () => {
      const infoPage = infoPageFactory({ title: '' });
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail with empty content', async () => {
      const infoPage = infoPageFactory({ content: '' });
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should validate status values', async () => {
      const validStatuses = ['DRAFT', 'PUBLISHED'];
      
      for (const status of validStatuses) {
        const infoPage = infoPageFactory({ status });
        const res = await request(app)
          .post('/api/info-pages')
          .set('Cookie', authCookie)
          .send(infoPage)
          .expect(201);

        expect(res.body.data.status).toBe(status);
      }
    });

    it('should handle isPublished boolean', async () => {
      const infoPage = infoPageFactory({ isPublished: true });
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.data.isPublished).toBe(true);
    });

    it('should handle XSS prevention in content', async () => {
      const infoPage = infoPageFactory({
        title: '<script>alert("xss")</script>',
        content: '<img src=x onerror=alert("xss")>',
        excerpt: '<script>alert("xss")</script>'
      });
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      // Content should be stored as-is (XSS prevention handled by frontend)
      expect(res.body.data.title).toBe(infoPage.title);
      expect(res.body.data.content).toBe(infoPage.content);
      expect(res.body.data.excerpt).toBe(infoPage.excerpt);
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousData = invalidDataFactory('sqlInjection').infoPages;
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(maliciousData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle invalid field types', async () => {
      const invalidData = invalidDataFactory('invalidTypes').infoPages;
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(invalidData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle maximum length fields', async () => {
      const maxLengthData = boundaryDataFactory('maxLength').infoPages;
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(maxLengthData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/info-pages/:id', () => {
    let createdInfoPage;

    beforeEach(async () => {
      const infoPage = infoPageFactory();
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage);
      createdInfoPage = res.body.data;
    });

    it('should update info page with valid data', async () => {
      const updateData = {
        title: 'Updated Test Info Page',
        content: 'Updated content with more information.',
        excerpt: 'Updated excerpt',
        category: 'updated',
        order: 5,
        status: 'PUBLISHED',
        isPublished: true
      };

      const res = await request(app)
        .put(`/api/info-pages/${createdInfoPage.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject(updateData);
      expect(res.body.meta.queryType).toBe('UPDATE_INFO_PAGE');
    });

    it('should update info page with partial data', async () => {
      const updateData = {
        title: 'Partially Updated Info Page'
      };

      const res = await request(app)
        .put(`/api/info-pages/${createdInfoPage.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(updateData.title);
      expect(res.body.data.content).toBe(createdInfoPage.content); // Should remain unchanged
    });

    it('should update tags array', async () => {
      const updateData = {
        tags: ['updated', 'tags', 'array']
      };

      const res = await request(app)
        .put(`/api/info-pages/${createdInfoPage.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tags).toEqual(updateData.tags);
    });

    it('should update metaDescription', async () => {
      const updateData = {
        metaDescription: 'Updated meta description for SEO'
      };

      const res = await request(app)
        .put(`/api/info-pages/${createdInfoPage.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.metaDescription).toBe(updateData.metaDescription);
    });

    it('should update featuredImageUrl', async () => {
      const updateData = {
        featuredImageUrl: 'https://example.com/new-featured-image.jpg'
      };

      const res = await request(app)
        .put(`/api/info-pages/${createdInfoPage.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.featuredImageUrl).toBe(updateData.featuredImageUrl);
    });

    it('should update publishedAt timestamp', async () => {
      const publishedAt = '2024-12-31T15:00:00Z';
      const updateData = { publishedAt };

      const res = await request(app)
        .put(`/api/info-pages/${createdInfoPage.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.publishedAt).toBe(publishedAt);
    });

    it('should update isPublished status', async () => {
      const updateData = { isPublished: true };

      const res = await request(app)
        .put(`/api/info-pages/${createdInfoPage.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isPublished).toBe(true);
    });

    it('should fail to update non-existent info page', async () => {
      const updateData = { title: 'Updated Title' };
      
      const res = await request(app)
        .put('/api/info-pages/99999')
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not found');
    });

    it('should fail without authentication', async () => {
      const updateData = { title: 'Updated Title' };
      
      const res = await request(app)
        .put(`/api/info-pages/${createdInfoPage.id}`)
        .send(updateData)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid ID format', async () => {
      const updateData = { title: 'Updated Title' };
      
      const res = await request(app)
        .put('/api/info-pages/invalid')
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle SQL injection in update', async () => {
      const maliciousData = invalidDataFactory('sqlInjection').infoPages;
      
      const res = await request(app)
        .put(`/api/info-pages/${createdInfoPage.id}`)
        .set('Cookie', authCookie)
        .send(maliciousData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/info-pages/:id', () => {
    let createdInfoPage;

    beforeEach(async () => {
      const infoPage = infoPageFactory();
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage);
      createdInfoPage = res.body.data;
    });

    it('should delete existing info page', async () => {
      const res = await request(app)
        .delete(`/api/info-pages/${createdInfoPage.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdInfoPage.id);
      expect(res.body.meta.queryType).toBe('DELETE_INFO_PAGE');
    });

    it('should fail to delete non-existent info page', async () => {
      const res = await request(app)
        .delete('/api/info-pages/99999')
        .set('Cookie', authCookie)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not found');
    });

    it('should fail without authentication', async () => {
      const res = await request(app)
        .delete(`/api/info-pages/${createdInfoPage.id}`)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid ID format', async () => {
      const res = await request(app)
        .delete('/api/info-pages/invalid')
        .set('Cookie', authCookie)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/info-pages (verification)', () => {
    let createdInfoPages = [];

    beforeEach(async () => {
      // Create multiple info pages for list testing
      for (let i = 0; i < 3; i++) {
        const infoPage = infoPageFactory({ title: `TEST Info Page ${i} ${Date.now()}` });
        const res = await request(app)
          .post('/api/info-pages')
          .set('Cookie', authCookie)
          .send(infoPage);
        createdInfoPages.push(res.body.data);
      }
    });

    it('should list all info pages including created ones', async () => {
      const res = await request(app)
        .get('/api/info-pages')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // Verify our test info pages are in the list
      const testInfoPageTitles = createdInfoPages.map(p => p.title);
      const returnedTitles = res.body.data.map(p => p.title);
      
      testInfoPageTitles.forEach(title => {
        expect(returnedTitles).toContain(title);
      });
    });

    it('should return info pages with correct structure', async () => {
      const res = await request(app)
        .get('/api/info-pages')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      
      const infoPage = res.body.data[0];
      expect(infoPage).toHaveProperty('id');
      expect(infoPage).toHaveProperty('title');
      expect(infoPage).toHaveProperty('slug');
      expect(infoPage).toHaveProperty('content');
      expect(infoPage).toHaveProperty('excerpt');
      expect(infoPage).toHaveProperty('category');
      expect(infoPage).toHaveProperty('order');
      expect(infoPage).toHaveProperty('status');
      expect(infoPage).toHaveProperty('isPublished');
      expect(infoPage).toHaveProperty('created_at');
      expect(infoPage).toHaveProperty('updated_at');
    });
  });

  describe('SEO Optimization Features', () => {
    it('should handle metaDescription for SEO', async () => {
      const infoPage = infoPageFactory({
        metaDescription: 'This is a comprehensive meta description for SEO optimization that helps search engines understand the content.'
      });
      
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.metaDescription).toBe(infoPage.metaDescription);
    });

    it('should handle long metaDescription', async () => {
      const infoPage = infoPageFactory({
        metaDescription: 'A'.repeat(300) // Long meta description
      });
      
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.metaDescription).toBe(infoPage.metaDescription);
    });

    it('should handle empty metaDescription', async () => {
      const infoPage = infoPageFactory({ metaDescription: '' });
      
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.metaDescription).toBe('');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long content', async () => {
      const infoPage = infoPageFactory({
        content: 'A'.repeat(100000) // Very long content
      });
      
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe(infoPage.content);
    });

    it('should handle very long excerpt', async () => {
      const infoPage = infoPageFactory({
        excerpt: 'A'.repeat(2000) // Long excerpt
      });
      
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.excerpt).toBe(infoPage.excerpt);
    });

    it('should handle many tags', async () => {
      const infoPage = infoPageFactory({
        tags: Array.from({ length: 50 }, (_, i) => `tag${i}`)
      });
      
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tags).toEqual(infoPage.tags);
    });

    it('should handle empty tags array', async () => {
      const infoPage = infoPageFactory({ tags: [] });
      
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tags).toEqual([]);
    });

    it('should handle special characters in content', async () => {
      const infoPage = infoPageFactory({
        title: 'Info Page with Special Chars: !@#$%^&*()',
        content: 'Content with Ümläuts and émojis 🎉',
        excerpt: 'Excerpt with special chars: <>&"\''
      });
      
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(infoPage.title);
      expect(res.body.data.content).toBe(infoPage.content);
      expect(res.body.data.excerpt).toBe(infoPage.excerpt);
    });

    it('should handle future publishedAt dates', async () => {
      const infoPage = infoPageFactory({
        publishedAt: '2030-12-31T12:00:00Z'
      });
      
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.publishedAt).toBe(infoPage.publishedAt);
    });

    it('should handle past publishedAt dates', async () => {
      const infoPage = infoPageFactory({
        publishedAt: '2020-01-01T12:00:00Z'
      });
      
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.publishedAt).toBe(infoPage.publishedAt);
    });

    it('should handle negative order values', async () => {
      const infoPage = infoPageFactory({ order: -5 });
      
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.order).toBe(-5);
    });

    it('should handle large order values', async () => {
      const infoPage = infoPageFactory({ order: 999999 });
      
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .send(infoPage)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.order).toBe(999999);
    });

    it('should handle malformed JSON in request body', async () => {
      const res = await request(app)
        .post('/api/info-pages')
        .set('Cookie', authCookie)
        .set('Content-Type', 'application/json')
        .send('{"title": "Test", "content": "Test content"') // Missing closing brace
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });
});
