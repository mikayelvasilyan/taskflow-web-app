import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY } from '../../src/security.js';
import { makeTestApp } from '../helpers/testApp.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('Content-Security-Policy', () => {
  it('is set on API responses and forbids inline scripts', async () => {
    const { app } = await makeTestApp();
    const res = await request(app).get('/api/health');
    const csp = res.headers['content-security-policy'];
    expect(csp).toBe(CONTENT_SECURITY_POLICY);
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('is not applied to Swagger UI at /docs, which needs inline scripts', async () => {
    const { app } = await makeTestApp();
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(200);
    expect(res.headers['content-security-policy']).toBeUndefined();
  });

  it('is the same policy that nginx sends in the Docker Compose setup', () => {
    const nginx = readFileSync(path.join(repo, 'web/nginx.conf'), 'utf8');
    const match = /add_header Content-Security-Policy "([^"]+)"/.exec(nginx);
    expect(match?.[1]).toBe(CONTENT_SECURITY_POLICY);
  });

  it('needs no inline script: index.html only loads external scripts', () => {
    const html = readFileSync(path.join(repo, 'web/index.html'), 'utf8');
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
    expect(scripts.length).toBeGreaterThan(0);
    for (const [, attrs, body] of scripts) {
      expect(attrs).toMatch(/\bsrc=/);
      expect(body?.trim()).toBe('');
    }
  });
});
