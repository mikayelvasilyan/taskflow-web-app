import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, notFound } from '../lib/errors.js';

export const zodDetails = (err: ZodError) =>
  err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(notFound('Route'));

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: zodDetails(err) },
    });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) },
    });
    return;
  }
  // body-parser errors (malformed JSON, payload too large)
  const status = typeof err?.status === 'number' ? err.status : 500;
  if (status >= 400 && status < 500) {
    res.status(status).json({ error: { code: 'VALIDATION_ERROR', message: 'Malformed request' } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
};
