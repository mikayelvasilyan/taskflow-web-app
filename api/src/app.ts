import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { Db } from './db/client.js';
import type { Env } from './env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';

export interface AppContext {
  db: Db;
  env: Env;
}

export function createApp(ctx: AppContext) {
  const app = express();
  app.disable('x-powered-by');
  if (ctx.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  const api = express.Router();
  api.use(healthRouter(ctx.db));
  api.use(authRouter(ctx));
  api.use(notFoundHandler);
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
