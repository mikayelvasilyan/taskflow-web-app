import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { Db } from './db/client.js';
import type { Env } from './env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { docsRouter } from './routes/docs.js';
import { healthRouter } from './routes/health.js';
import { projectsRouter } from './routes/projects.js';
import { tasksRouter } from './routes/tasks.js';
import { testRouter } from './routes/test.js';
import { usersRouter } from './routes/users.js';
import { contentSecurityPolicy } from './security.js';

export interface AppContext {
  db: Db;
  env: Env;
}

export function createApp(ctx: AppContext) {
  const app = express();
  app.disable('x-powered-by');
  if (ctx.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  // Helmet sets the other security headers; our own CSP (below) skips Swagger UI at /docs.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(contentSecurityPolicy);
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/docs', docsRouter());

  const api = express.Router();
  api.use(healthRouter(ctx.db));
  api.use(authRouter(ctx));
  api.use(usersRouter(ctx));
  api.use(projectsRouter(ctx));
  api.use(tasksRouter(ctx));
  api.use(dashboardRouter(ctx));
  // Mounted only under NODE_ENV=test; elsewhere these paths simply do not exist (404).
  if (ctx.env.NODE_ENV === 'test') api.use(testRouter(ctx));
  api.use(notFoundHandler);
  app.use('/api', api);

  // Single-image deploy: serve the built web app and fall back to index.html for client routes.
  if (ctx.env.SERVE_WEB_DIR) {
    const root = path.resolve(ctx.env.SERVE_WEB_DIR);
    app.use(express.static(root, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (!req.accepts('html')) return next();
      res.sendFile(path.join(root, 'index.html'), { headers: { 'Cache-Control': 'no-cache' } });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
