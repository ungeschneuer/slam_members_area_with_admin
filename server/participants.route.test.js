import request from 'supertest';
import app from './server.js';

// Mock optimizedQueryService used by the route handler to avoid DB coupling
vi.mock('./services/optimizedQueryService.js', () => ({
  default: {
    getParticipantsWithStats: async () => ([
      { id: 1, name: 'Alice', region: 'Berlin', pronouns: 'she/her' },
      { id: 2, name: 'Bob', region: 'Hamburg', pronouns: 'he/him' }
    ]),
    clearCache: () => {}
  }
}));

describe('GET /api/participants', () => {
  it('returns success=true with data array and meta shape', async () => {
    const res = await request(app).get('/api/participants');
    expect(res.status).toBe(200);
    expect(res.body && res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(typeof res.body.meta).toBe('object');
    expect(res.body.meta.queryType).toBe('JOIN_OPTIMIZED');
    expect(typeof res.body.meta.duration).toBe('string');
  });
});


