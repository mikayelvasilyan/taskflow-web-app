import { rateLimit } from 'express-rate-limit';
import type { Env } from '../env.js';
import { AppError } from '../lib/errors.js';

/** 10 login/signup attempts per minute per IP. Disabled when NODE_ENV=test. */
export const authRateLimit = (env: Env) =>
  rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test',
    handler: (_req, _res, next) =>
      next(new AppError('RATE_LIMITED', 'Too many attempts, try again in a minute')),
  });
