import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiDocument } from '../openapi.js';

/** Swagger UI at /docs and the raw spec at /docs/openapi.json (served at the root, not /api). */
export function docsRouter() {
  const r = Router();
  const doc = buildOpenApiDocument();
  r.get('/openapi.json', (_req, res) => {
    res.json(doc);
  });
  r.use('/', swaggerUi.serve);
  r.get('/', swaggerUi.setup(doc, { customSiteTitle: 'TaskFlow API docs' }));
  return r;
}
