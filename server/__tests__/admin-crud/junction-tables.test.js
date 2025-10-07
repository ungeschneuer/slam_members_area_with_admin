/**
 * Comprehensive Junction Tables Tests
 * Tests all admin endpoints for junction table management (round participants, crew, feature artists, timetable participants)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { createTestAdmin, getAuthToken, getAuthCookie, cleanupTestData, resetTestData } from './setup.js';
import { participantFactory, roundFactory, timetableFactory, junctionFactory } from './helpers.js';

describe('Junction Tables CRUD', () => {
  let authToken;
  let authCookie;
  let testAdmin;
  let testParticipant;
  let testRound;
  let testTimetable;

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
    
    // Create test entities for junction operations
    const participant = participantFactory();
    const participantRes = await request(app)
      .post('/api/participants')
      .set('Cookie', authCookie)
      .send(participant);
    testParticipant = participantRes.body.data;

    const round = roundFactory();
    const roundRes = await request(app)
      .post('/api/rounds')
      .set('Cookie', authCookie)
      .send(round);
    testRound = roundRes.body.data;

    const timetable = timetableFactory();
    const timetableRes = await request(app)
      .post('/api/timetable')
      .set('Cookie', authCookie)
      .send(timetable);
    testTimetable = timetableRes.body.data;
  });

  describe('Round Participants Management', () => {
    describe('POST /api/rounds/:roundId/participants', () => {
      it('should add participant to round', async () => {
        const res = await request(app)
          .post(`/api/rounds/${testRound.id}/participants`)
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id })
          .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toMatchObject({
          roundId: testRound.id,
          participantId: testParticipant.id
        });
      });

      it('should fail to add non-existent participant to round', async () => {
        const res = await request(app)
          .post(`/api/rounds/${testRound.id}/participants`)
          .set('Cookie', authCookie)
          .send({ participantId: 99999 })
          .expect(404);

        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('not found');
      });

      it('should fail to add participant to non-existent round', async () => {
        const res = await request(app)
          .post('/api/rounds/99999/participants')
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id })
          .expect(404);

        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('not found');
      });

      it('should fail without authentication', async () => {
        const res = await request(app)
          .post(`/api/rounds/${testRound.id}/participants`)
          .send({ participantId: testParticipant.id })
          .expect(401);

        expect(res.body.success).toBe(false);
      });

      it('should fail with invalid round ID format', async () => {
        const res = await request(app)
          .post('/api/rounds/invalid/participants')
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id })
          .expect(400);

        expect(res.body.success).toBe(false);
      });

      it('should fail with invalid participant ID format', async () => {
        const res = await request(app)
          .post(`/api/rounds/${testRound.id}/participants`)
          .set('Cookie', authCookie)
          .send({ participantId: 'invalid' })
          .expect(400);

        expect(res.body.success).toBe(false);
      });

      it('should handle duplicate participant addition gracefully', async () => {
        // Add participant first time
        await request(app)
          .post(`/api/rounds/${testRound.id}/participants`)
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id })
          .expect(201);

        // Try to add same participant again
        const res = await request(app)
          .post(`/api/rounds/${testRound.id}/participants`)
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id })
          .expect(400);

        expect(res.body.success).toBe(false);
      });
    });

    describe('DELETE /api/rounds/:roundId/participants/:participantId', () => {
      beforeEach(async () => {
        // Add participant to round first
        await request(app)
          .post(`/api/rounds/${testRound.id}/participants`)
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id });
      });

      it('should remove participant from round', async () => {
        const res = await request(app)
          .delete(`/api/rounds/${testRound.id}/participants/${testParticipant.id}`)
          .set('Cookie', authCookie)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toMatchObject({
          roundId: testRound.id,
          participantId: testParticipant.id
        });
      });

      it('should fail to remove non-existent participant from round', async () => {
        const res = await request(app)
          .delete(`/api/rounds/${testRound.id}/participants/99999`)
          .set('Cookie', authCookie)
          .expect(404);

        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('not found');
      });

      it('should fail to remove participant from non-existent round', async () => {
        const res = await request(app)
          .delete(`/api/rounds/99999/participants/${testParticipant.id}`)
          .set('Cookie', authCookie)
          .expect(404);

        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('not found');
      });

      it('should fail without authentication', async () => {
        const res = await request(app)
          .delete(`/api/rounds/${testRound.id}/participants/${testParticipant.id}`)
          .expect(401);

        expect(res.body.success).toBe(false);
      });

      it('should fail with invalid round ID format', async () => {
        const res = await request(app)
          .delete(`/api/rounds/invalid/participants/${testParticipant.id}`)
          .set('Cookie', authCookie)
          .expect(400);

        expect(res.body.success).toBe(false);
      });

      it('should fail with invalid participant ID format', async () => {
        const res = await request(app)
          .delete(`/api/rounds/${testRound.id}/participants/invalid`)
          .set('Cookie', authCookie)
          .expect(400);

        expect(res.body.success).toBe(false);
      });
    });
  });

  describe('Round Crew Management', () => {
    describe('POST /api/rounds/:roundId/crew', () => {
      it('should add crew member to round', async () => {
        const res = await request(app)
          .post(`/api/rounds/${testRound.id}/crew`)
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id })
          .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toMatchObject({
          roundId: testRound.id,
          participantId: testParticipant.id
        });
      });

      it('should fail to add non-existent participant as crew', async () => {
        const res = await request(app)
          .post(`/api/rounds/${testRound.id}/crew`)
          .set('Cookie', authCookie)
          .send({ participantId: 99999 })
          .expect(404);

        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('not found');
      });

      it('should fail to add crew to non-existent round', async () => {
        const res = await request(app)
          .post('/api/rounds/99999/crew')
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id })
          .expect(404);

        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('not found');
      });

      it('should fail without authentication', async () => {
        const res = await request(app)
          .post(`/api/rounds/${testRound.id}/crew`)
          .send({ participantId: testParticipant.id })
          .expect(401);

        expect(res.body.success).toBe(false);
      });

      it('should handle duplicate crew addition gracefully', async () => {
        // Add crew first time
        await request(app)
          .post(`/api/rounds/${testRound.id}/crew`)
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id })
          .expect(201);

        // Try to add same crew again
        const res = await request(app)
          .post(`/api/rounds/${testRound.id}/crew`)
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id })
          .expect(400);

        expect(res.body.success).toBe(false);
      });
    });

    describe('DELETE /api/rounds/:roundId/crew/:participantId', () => {
      beforeEach(async () => {
        // Add crew member to round first
        await request(app)
          .post(`/api/rounds/${testRound.id}/crew`)
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id });
      });

      it('should remove crew member from round', async () => {
        const res = await request(app)
          .delete(`/api/rounds/${testRound.id}/crew/${testParticipant.id}`)
          .set('Cookie', authCookie)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toMatchObject({
          roundId: testRound.id,
          participantId: testParticipant.id
        });
      });

      it('should fail to remove non-existent crew member', async () => {
        const res = await request(app)
          .delete(`/api/rounds/${testRound.id}/crew/99999`)
          .set('Cookie', authCookie)
          .expect(404);

        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('not found');
      });

      it('should fail without authentication', async () => {
        const res = await request(app)
          .delete(`/api/rounds/${testRound.id}/crew/${testParticipant.id}`)
          .expect(401);

        expect(res.body.success).toBe(false);
      });
    });
  });

  describe('Round Feature Artists Management', () => {
    describe('POST /api/rounds/:roundId/feature-artists', () => {
      it('should add feature artist to round', async () => {
        const res = await request(app)
          .post(`/api/rounds/${testRound.id}/feature-artists`)
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id })
          .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toMatchObject({
          roundId: testRound.id,
          participantId: testParticipant.id
        });
      });

      it('should fail to add non-existent participant as feature artist', async () => {
        const res = await request(app)
          .post(`/api/rounds/${testRound.id}/feature-artists`)
          .set('Cookie', authCookie)
          .send({ participantId: 99999 })
          .expect(404);

        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('not found');
      });

      it('should fail to add feature artist to non-existent round', async () => {
        const res = await request(app)
          .post('/api/rounds/99999/feature-artists')
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id })
          .expect(404);

        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('not found');
      });

      it('should fail without authentication', async () => {
        const res = await request(app)
          .post(`/api/rounds/${testRound.id}/feature-artists`)
          .send({ participantId: testParticipant.id })
          .expect(401);

        expect(res.body.success).toBe(false);
      });

      it('should handle duplicate feature artist addition gracefully', async () => {
        // Add feature artist first time
        await request(app)
          .post(`/api/rounds/${testRound.id}/feature-artists`)
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id })
          .expect(201);

        // Try to add same feature artist again
        const res = await request(app)
          .post(`/api/rounds/${testRound.id}/feature-artists`)
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id })
          .expect(400);

        expect(res.body.success).toBe(false);
      });
    });

    describe('DELETE /api/rounds/:roundId/feature-artists/:participantId', () => {
      beforeEach(async () => {
        // Add feature artist to round first
        await request(app)
          .post(`/api/rounds/${testRound.id}/feature-artists`)
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id });
      });

      it('should remove feature artist from round', async () => {
        const res = await request(app)
          .delete(`/api/rounds/${testRound.id}/feature-artists/${testParticipant.id}`)
          .set('Cookie', authCookie)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toMatchObject({
          roundId: testRound.id,
          participantId: testParticipant.id
        });
      });

      it('should fail to remove non-existent feature artist', async () => {
        const res = await request(app)
          .delete(`/api/rounds/${testRound.id}/feature-artists/99999`)
          .set('Cookie', authCookie)
          .expect(404);

        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('not found');
      });

      it('should fail without authentication', async () => {
        const res = await request(app)
          .delete(`/api/rounds/${testRound.id}/feature-artists/${testParticipant.id}`)
          .expect(401);

        expect(res.body.success).toBe(false);
      });
    });
  });

  describe('Timetable Participants Management', () => {
    describe('POST /api/timetable/:entryId/participants', () => {
      it('should add participant to timetable entry', async () => {
        const res = await request(app)
          .post(`/api/timetable/${testTimetable.id}/participants`)
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id })
          .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toMatchObject({
          entryId: testTimetable.id,
          participantId: testParticipant.id
        });
      });

      it('should fail to add non-existent participant to timetable', async () => {
        const res = await request(app)
          .post(`/api/timetable/${testTimetable.id}/participants`)
          .set('Cookie', authCookie)
          .send({ participantId: 99999 })
          .expect(404);

        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('not found');
      });

      it('should fail to add participant to non-existent timetable entry', async () => {
        const res = await request(app)
          .post('/api/timetable/99999/participants')
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id })
          .expect(404);

        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('not found');
      });

      it('should fail without authentication', async () => {
        const res = await request(app)
          .post(`/api/timetable/${testTimetable.id}/participants`)
          .send({ participantId: testParticipant.id })
          .expect(401);

        expect(res.body.success).toBe(false);
      });

      it('should handle duplicate participant addition gracefully', async () => {
        // Add participant first time
        await request(app)
          .post(`/api/timetable/${testTimetable.id}/participants`)
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id })
          .expect(201);

        // Try to add same participant again
        const res = await request(app)
          .post(`/api/timetable/${testTimetable.id}/participants`)
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id })
          .expect(400);

        expect(res.body.success).toBe(false);
      });
    });

    describe('DELETE /api/timetable/:entryId/participants/:participantId', () => {
      beforeEach(async () => {
        // Add participant to timetable first
        await request(app)
          .post(`/api/timetable/${testTimetable.id}/participants`)
          .set('Cookie', authCookie)
          .send({ participantId: testParticipant.id });
      });

      it('should remove participant from timetable entry', async () => {
        const res = await request(app)
          .delete(`/api/timetable/${testTimetable.id}/participants/${testParticipant.id}`)
          .set('Cookie', authCookie)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toMatchObject({
          entryId: testTimetable.id,
          participantId: testParticipant.id
        });
      });

      it('should fail to remove non-existent participant from timetable', async () => {
        const res = await request(app)
          .delete(`/api/timetable/${testTimetable.id}/participants/99999`)
          .set('Cookie', authCookie)
          .expect(404);

        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('not found');
      });

      it('should fail to remove participant from non-existent timetable entry', async () => {
        const res = await request(app)
          .delete(`/api/timetable/99999/participants/${testParticipant.id}`)
          .set('Cookie', authCookie)
          .expect(404);

        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('not found');
      });

      it('should fail without authentication', async () => {
        const res = await request(app)
          .delete(`/api/timetable/${testTimetable.id}/participants/${testParticipant.id}`)
          .expect(401);

        expect(res.body.success).toBe(false);
      });
    });
  });

  describe('Cascade Delete Verification', () => {
    it('should handle cascade delete when round is deleted', async () => {
      // Add participant to round
      await request(app)
        .post(`/api/rounds/${testRound.id}/participants`)
        .set('Cookie', authCookie)
        .send({ participantId: testParticipant.id })
        .expect(201);

      // Add crew to round
      await request(app)
        .post(`/api/rounds/${testRound.id}/crew`)
        .set('Cookie', authCookie)
        .send({ participantId: testParticipant.id })
        .expect(201);

      // Add feature artist to round
      await request(app)
        .post(`/api/rounds/${testRound.id}/feature-artists`)
        .set('Cookie', authCookie)
        .send({ participantId: testParticipant.id })
        .expect(201);

      // Delete the round
      await request(app)
        .delete(`/api/rounds/${testRound.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      // Verify that junction table entries are cleaned up
      // (This would require a separate endpoint to check junction table state)
    });

    it('should handle cascade delete when timetable entry is deleted', async () => {
      // Add participant to timetable
      await request(app)
        .post(`/api/timetable/${testTimetable.id}/participants`)
        .set('Cookie', authCookie)
        .send({ participantId: testParticipant.id })
        .expect(201);

      // Delete the timetable entry
      await request(app)
        .delete(`/api/timetable/${testTimetable.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      // Verify that junction table entries are cleaned up
      // (This would require a separate endpoint to check junction table state)
    });

    it('should handle cascade delete when participant is deleted', async () => {
      // Add participant to round
      await request(app)
        .post(`/api/rounds/${testRound.id}/participants`)
        .set('Cookie', authCookie)
        .send({ participantId: testParticipant.id })
        .expect(201);

      // Add participant to timetable
      await request(app)
        .post(`/api/timetable/${testTimetable.id}/participants`)
        .set('Cookie', authCookie)
        .send({ participantId: testParticipant.id })
        .expect(201);

      // Delete the participant
      await request(app)
        .delete(`/api/participants/${testParticipant.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      // Verify that junction table entries are cleaned up
      // (This would require a separate endpoint to check junction table state)
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle multiple participants in same round', async () => {
      // Create additional participants
      const participant2 = participantFactory({ name: 'TEST Participant 2' });
      const participant2Res = await request(app)
        .post('/api/participants')
        .set('Cookie', authCookie)
        .send(participant2);
      const testParticipant2 = participant2Res.body.data;

      const participant3 = participantFactory({ name: 'TEST Participant 3' });
      const participant3Res = await request(app)
        .post('/api/participants')
        .set('Cookie', authCookie)
        .send(participant3);
      const testParticipant3 = participant3Res.body.data;

      // Add all participants to round
      await request(app)
        .post(`/api/rounds/${testRound.id}/participants`)
        .set('Cookie', authCookie)
        .send({ participantId: testParticipant.id })
        .expect(201);

      await request(app)
        .post(`/api/rounds/${testRound.id}/participants`)
        .set('Cookie', authCookie)
        .send({ participantId: testParticipant2.id })
        .expect(201);

      await request(app)
        .post(`/api/rounds/${testRound.id}/participants`)
        .set('Cookie', authCookie)
        .send({ participantId: testParticipant3.id })
        .expect(201);

      // All should succeed
      expect(true).toBe(true);
    });

    it('should handle same participant in different roles', async () => {
      // Add participant as regular participant
      await request(app)
        .post(`/api/rounds/${testRound.id}/participants`)
        .set('Cookie', authCookie)
        .send({ participantId: testParticipant.id })
        .expect(201);

      // Add same participant as crew
      await request(app)
        .post(`/api/rounds/${testRound.id}/crew`)
        .set('Cookie', authCookie)
        .send({ participantId: testParticipant.id })
        .expect(201);

      // Add same participant as feature artist
      await request(app)
        .post(`/api/rounds/${testRound.id}/feature-artists`)
        .set('Cookie', authCookie)
        .send({ participantId: testParticipant.id })
        .expect(201);

      // All should succeed
      expect(true).toBe(true);
    });

    it('should handle malformed JSON in request body', async () => {
      const res = await request(app)
        .post(`/api/rounds/${testRound.id}/participants`)
        .set('Cookie', authCookie)
        .set('Content-Type', 'application/json')
        .send('{"participantId": 123') // Missing closing brace
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle missing participantId in request body', async () => {
      const res = await request(app)
        .post(`/api/rounds/${testRound.id}/participants`)
        .set('Cookie', authCookie)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle invalid participantId type in request body', async () => {
      const res = await request(app)
        .post(`/api/rounds/${testRound.id}/participants`)
        .set('Cookie', authCookie)
        .send({ participantId: 'invalid' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });
});
