import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { makeTestApp } from '../helpers/testApp.js';

describe('GET /api/health', () => {
  it('reports ok with db status', async () => {
    const { app } = await makeTestApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'ok', version: '1.0.0' });
    expect(typeof res.body.uptime).toBe('number');
  });

  it('returns the standard error shape for unknown routes', async () => {
    const { app } = await makeTestApp();
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns a validation error for malformed JSON', async () => {
    const { app } = await makeTestApp();
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
