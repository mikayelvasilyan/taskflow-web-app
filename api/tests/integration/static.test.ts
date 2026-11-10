import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { makeTestApp } from '../helpers/testApp.js';

function webDir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'tf-web-'));
  mkdirSync(path.join(dir, 'assets'));
  writeFileSync(path.join(dir, 'index.html'), '<!doctype html><div id="root"></div>');
  writeFileSync(path.join(dir, 'assets', 'app.js'), 'console.log(1)');
  return dir;
}

describe('serving the web build (SERVE_WEB_DIR)', () => {
  it('serves assets, falls back to index.html for client routes, keeps API 404s as JSON', async () => {
    const { app } = await makeTestApp({ SERVE_WEB_DIR: webDir() });
    const asset = await request(app).get('/assets/app.js');
    expect(asset.status).toBe(200);
    expect(asset.text).toContain('console.log');

    for (const route of ['/', '/login', '/app/projects/abc/board']) {
      const page = await request(app).get(route).set('Accept', 'text/html');
      expect(page.status).toBe(200);
      expect(page.text).toContain('id="root"');
    }

    const api = await request(app).get('/api/nope').set('Accept', 'text/html');
    expect(api.status).toBe(404);
    expect(api.body.error.code).toBe('NOT_FOUND');
    expect((await request(app).get('/api/health')).body.status).toBe('ok');
  });

  it('does not serve anything extra when SERVE_WEB_DIR is unset', async () => {
    const { app } = await makeTestApp();
    expect((await request(app).get('/login').set('Accept', 'text/html')).status).toBe(404);
  });
});
