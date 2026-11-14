import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

// These paths never touch the database (no session cookie is sent).
const app = createApp();

describe('HTTP security baseline', () => {
  it('serves liveness without auth and sets hardened headers', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('requires authentication for private routes', async () => {
    for (const path of ['/api/profile', '/api/applications', '/api/auth/me']) {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    }
  });

  it('rejects state-changing requests without the CSRF header', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'x'.repeat(200) });
    expect(res.status).toBe(403);
  });

  it('rejects requests from foreign origins', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('x-fitcv-csrf', '1')
      .set('origin', 'https://evil.example');
    expect(res.status).toBe(403);
  });

  it('validates the Google credential payload', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .set('x-fitcv-csrf', '1')
      .set('origin', 'http://localhost:3000')
      .send({ credential: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('rejects an invalid Google token as unauthenticated', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .set('x-fitcv-csrf', '1')
      .send({ credential: 'a'.repeat(300) });
    expect(res.status).toBe(401);
  });

  it('returns JSON 404 for unknown routes and rejects malformed JSON', async () => {
    expect((await request(app).get('/nope')).status).toBe(404);
    const bad = await request(app)
      .post('/api/auth/logout')
      .set('x-fitcv-csrf', '1')
      .set('content-type', 'application/json')
      .send('{"oops"');
    expect(bad.status).toBe(400);
  });
});
