import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Validator } from '@seriousme/openapi-schema-validator';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildOpenApiDocument } from '../../src/openapi.js';
import { makeTestApp } from '../helpers/testApp.js';

const routesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/routes');

/** Every `r.<method>('<path>'` in the route files, except test-only and docs routes. */
function implementedRoutes(): string[] {
  const out: string[] = [];
  for (const file of readdirSync(routesDir)) {
    if (file === 'test.ts' || file === 'docs.ts') continue;
    const src = readFileSync(path.join(routesDir, file), 'utf8');
    for (const m of src.matchAll(/\br\.(get|post|patch|delete)\(\s*'([^']+)'/g)) {
      out.push(`${m[1]!.toUpperCase()} /api${m[2]!.replace(/:(\w+)/g, '{$1}')}`);
    }
  }
  return out.sort();
}

function documentedRoutes(): string[] {
  const doc = buildOpenApiDocument();
  const out: string[] = [];
  for (const [p, item] of Object.entries(doc.paths ?? {})) {
    for (const method of Object.keys(item as object)) out.push(`${method.toUpperCase()} ${p}`);
  }
  return out.sort();
}

describe('OpenAPI document', () => {
  it('is a valid OpenAPI 3.1 document', async () => {
    const result = await new Validator().validate(
      JSON.parse(JSON.stringify(buildOpenApiDocument())),
    );
    expect(result.errors ?? []).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('documents every implemented route and nothing else', () => {
    const implemented = implementedRoutes();
    expect(implemented.length).toBeGreaterThanOrEqual(30);
    expect(documentedRoutes()).toEqual(implemented);
  });

  it('does not document the test-only endpoints', () => {
    expect(documentedRoutes().some((r) => r.includes('/api/test'))).toBe(false);
  });

  it('describes bodies from the same schemas the API validates with', () => {
    const doc = buildOpenApiDocument() as unknown as {
      paths: Record<string, Record<string, { requestBody?: unknown; security?: unknown[] }>>;
    };
    const signup = doc.paths['/api/auth/signup']!.post!;
    expect(JSON.stringify(signup.requestBody)).toContain('password');
    expect(doc.paths['/api/health']!.get!.security).toEqual([]);
    expect(doc.paths['/api/tasks']!.get!.security).toHaveLength(2);
  });
});

describe('docs endpoints', () => {
  it('serves the JSON spec and Swagger UI', async () => {
    const { app } = await makeTestApp();
    const json = await request(app).get('/docs/openapi.json');
    expect(json.status).toBe(200);
    expect(json.body.info.title).toBe('TaskFlow API');
    const ui = await request(app).get('/docs/');
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('swagger-ui');
  });
});
