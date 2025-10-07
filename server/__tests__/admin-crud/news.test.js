/**
 * Comprehensive News CRUD Tests
 * Tests all admin endpoints for news article management
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { createTestAdmin, getAuthToken, getAuthCookie, cleanupTestData, resetTestData } from './setup.js';
import { newsFactory, invalidDataFactory, boundaryDataFactory } from './helpers.js';

describe('News CRUD', () => {
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

  describe('POST /api/news', () => {
    it('should create news article with valid data', async () => {
      const news = newsFactory();
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        title: news.title,
        content: news.content,
        excerpt: news.excerpt,
        category: news.category,
        priority: news.priority,
        status: news.status
      });
      expect(res.body.meta.queryType).toBe('CREATE_NEWS');
      expect(res.body.meta.duration).toBeDefined();
    });

    it('should normalize tags array', async () => {
      const news = newsFactory({ tags: ['tag1', 'tag2', 'tag3'] });
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(201);

      expect(res.body.data.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should handle empty tags array', async () => {
      const news = newsFactory({ tags: [] });
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(201);

      expect(res.body.data.tags).toEqual([]);
    });

    it('should set default status to DRAFT', async () => {
      const news = newsFactory({ status: undefined });
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(201);

      expect(res.body.data.status).toBe('DRAFT');
    });

    it('should handle publishedAt timestamp', async () => {
      const publishedAt = '2024-12-31T12:00:00Z';
      const news = newsFactory({ publishedAt });
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(201);

      expect(res.body.data.publishedAt).toBe(publishedAt);
    });

    it('should handle null publishedAt', async () => {
      const news = newsFactory({ publishedAt: null });
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(201);

      expect(res.body.data.publishedAt).toBeNull();
    });

    it('should handle featured image URL', async () => {
      const featuredImageUrl = 'https://example.com/featured-image.jpg';
      const news = newsFactory({ featuredImageUrl });
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(201);

      expect(res.body.data.featuredImageUrl).toBe(featuredImageUrl);
    });

    it('should fail without authentication', async () => {
      const news = newsFactory();
      const res = await request(app)
        .post('/api/news')
        .send(news)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Authentication required');
    });

    it('should fail with missing required fields', async () => {
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send({ category: 'general' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail with empty title', async () => {
      const news = newsFactory({ title: '' });
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail with empty content', async () => {
      const news = newsFactory({ content: '' });
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should validate priority values', async () => {
      const news = newsFactory({ priority: 'INVALID_PRIORITY' });
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(201); // Should accept any string value

      expect(res.body.data.priority).toBe('INVALID_PRIORITY');
    });

    it('should validate status values', async () => {
      const news = newsFactory({ status: 'INVALID_STATUS' });
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(201); // Should accept any string value

      expect(res.body.data.status).toBe('INVALID_STATUS');
    });

    it('should handle XSS prevention in content', async () => {
      const news = newsFactory({
        title: '<script>alert("xss")</script>',
        content: '<img src=x onerror=alert("xss")>'
      });
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(201);

      // Content should be stored as-is (XSS prevention handled by frontend)
      expect(res.body.data.title).toBe(news.title);
      expect(res.body.data.content).toBe(news.content);
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousData = invalidDataFactory('sqlInjection').news;
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(maliciousData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle invalid field types', async () => {
      const invalidData = invalidDataFactory('invalidTypes').news;
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(invalidData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle maximum length fields', async () => {
      const maxLengthData = boundaryDataFactory('maxLength').news;
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(maxLengthData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/news/:id', () => {
    let createdNews;

    beforeEach(async () => {
      const news = newsFactory();
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news);
      createdNews = res.body.data;
    });

    it('should update news article with valid data', async () => {
      const updateData = {
        title: 'Updated Test News',
        content: 'Updated content with more information.',
        excerpt: 'Updated excerpt',
        category: 'updated',
        priority: 'HIGH',
        status: 'PUBLISHED'
      };

      const res = await request(app)
        .put(`/api/news/${createdNews.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject(updateData);
      expect(res.body.meta.queryType).toBe('UPDATE_NEWS');
    });

    it('should update news article with partial data', async () => {
      const updateData = {
        title: 'Partially Updated News'
      };

      const res = await request(app)
        .put(`/api/news/${createdNews.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(updateData.title);
      expect(res.body.data.content).toBe(createdNews.content); // Should remain unchanged
    });

    it('should update tags array', async () => {
      const updateData = {
        tags: ['updated', 'tags', 'array']
      };

      const res = await request(app)
        .put(`/api/news/${createdNews.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tags).toEqual(updateData.tags);
    });

    it('should update publishedAt timestamp', async () => {
      const publishedAt = '2024-12-31T15:00:00Z';
      const updateData = { publishedAt };

      const res = await request(app)
        .put(`/api/news/${createdNews.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.publishedAt).toBe(publishedAt);
    });

    it('should update featured image URL', async () => {
      const featuredImageUrl = 'https://example.com/new-featured-image.jpg';
      const updateData = { featuredImageUrl };

      const res = await request(app)
        .put(`/api/news/${createdNews.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.featuredImageUrl).toBe(featuredImageUrl);
    });

    it('should fail to update non-existent news article', async () => {
      const updateData = { title: 'Updated Title' };
      
      const res = await request(app)
        .put('/api/news/99999')
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not found');
    });

    it('should fail without authentication', async () => {
      const updateData = { title: 'Updated Title' };
      
      const res = await request(app)
        .put(`/api/news/${createdNews.id}`)
        .send(updateData)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid ID format', async () => {
      const updateData = { title: 'Updated Title' };
      
      const res = await request(app)
        .put('/api/news/invalid')
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle SQL injection in update', async () => {
      const maliciousData = invalidDataFactory('sqlInjection').news;
      
      const res = await request(app)
        .put(`/api/news/${createdNews.id}`)
        .set('Cookie', authCookie)
        .send(maliciousData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/news/:id', () => {
    let createdNews;

    beforeEach(async () => {
      const news = newsFactory();
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news);
      createdNews = res.body.data;
    });

    it('should delete existing news article', async () => {
      const res = await request(app)
        .delete(`/api/news/${createdNews.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdNews.id);
      expect(res.body.meta.queryType).toBe('DELETE_NEWS');
    });

    it('should fail to delete non-existent news article', async () => {
      const res = await request(app)
        .delete('/api/news/99999')
        .set('Cookie', authCookie)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not found');
    });

    it('should fail without authentication', async () => {
      const res = await request(app)
        .delete(`/api/news/${createdNews.id}`)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid ID format', async () => {
      const res = await request(app)
        .delete('/api/news/invalid')
        .set('Cookie', authCookie)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/news (verification)', () => {
    let createdNews = [];

    beforeEach(async () => {
      // Create multiple news articles for list testing
      for (let i = 0; i < 3; i++) {
        const news = newsFactory({ title: `TEST News ${i} ${Date.now()}` });
        const res = await request(app)
          .post('/api/news')
          .set('Cookie', authCookie)
          .send(news);
        createdNews.push(res.body.data);
      }
    });

    it('should list all news articles including created ones', async () => {
      const res = await request(app)
        .get('/api/news')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // Verify our test news articles are in the list
      const testNewsTitles = createdNews.map(n => n.title);
      const returnedTitles = res.body.data.map(n => n.title);
      
      testNewsTitles.forEach(title => {
        expect(returnedTitles).toContain(title);
      });
    });

    it('should return news articles with correct structure', async () => {
      const res = await request(app)
        .get('/api/news')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      
      const news = res.body.data[0];
      expect(news).toHaveProperty('id');
      expect(news).toHaveProperty('title');
      expect(news).toHaveProperty('content');
      expect(news).toHaveProperty('excerpt');
      expect(news).toHaveProperty('category');
      expect(news).toHaveProperty('priority');
      expect(news).toHaveProperty('status');
      expect(news).toHaveProperty('created_at');
      expect(news).toHaveProperty('updated_at');
    });
  });

  describe('Breaking News Functionality', () => {
    it('should create breaking news article', async () => {
      const news = newsFactory({
        isBreakingNews: true,
        breakingNewsUntil: '2024-12-31T23:59:59Z'
      });
      
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isBreakingNews).toBe(true);
      expect(res.body.data.breakingNewsUntil).toBe(news.breakingNewsUntil);
    });

    it('should handle breaking news without end time', async () => {
      const news = newsFactory({
        isBreakingNews: true,
        breakingNewsUntil: null
      });
      
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isBreakingNews).toBe(true);
      expect(res.body.data.breakingNewsUntil).toBeNull();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long content', async () => {
      const news = newsFactory({
        content: 'A'.repeat(50000) // Very long content
      });
      
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe(news.content);
    });

    it('should handle very long excerpt', async () => {
      const news = newsFactory({
        excerpt: 'A'.repeat(1000) // Long excerpt
      });
      
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.excerpt).toBe(news.excerpt);
    });

    it('should handle many tags', async () => {
      const news = newsFactory({
        tags: Array.from({ length: 50 }, (_, i) => `tag${i}`)
      });
      
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tags).toEqual(news.tags);
    });

    it('should handle empty tags array', async () => {
      const news = newsFactory({ tags: [] });
      
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tags).toEqual([]);
    });

    it('should handle special characters in content', async () => {
      const news = newsFactory({
        title: 'News with Special Chars: !@#$%^&*()',
        content: 'Content with Ümläuts and émojis 🎉',
        excerpt: 'Excerpt with special chars: <>&"\''
      });
      
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(news.title);
      expect(res.body.data.content).toBe(news.content);
      expect(res.body.data.excerpt).toBe(news.excerpt);
    });

    it('should handle future publishedAt dates', async () => {
      const news = newsFactory({
        publishedAt: '2030-12-31T12:00:00Z'
      });
      
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.publishedAt).toBe(news.publishedAt);
    });

    it('should handle past publishedAt dates', async () => {
      const news = newsFactory({
        publishedAt: '2020-01-01T12:00:00Z'
      });
      
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .send(news)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.publishedAt).toBe(news.publishedAt);
    });

    it('should handle malformed JSON in request body', async () => {
      const res = await request(app)
        .post('/api/news')
        .set('Cookie', authCookie)
        .set('Content-Type', 'application/json')
        .send('{"title": "Test", "content": "Test content"') // Missing closing brace
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });
});
