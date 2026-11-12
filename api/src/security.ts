import type { RequestHandler } from 'express';

/**
 * Content-Security-Policy for the web app (and every API response).
 * No inline scripts: the theme bootstrap lives in /theme-init.js. Inline *styles* are allowed because
 * Radix positions popovers and Recharts draws charts with style attributes.
 * The same string is set by nginx in the Docker Compose setup (a test keeps them in sync).
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** Swagger UI at /docs needs inline scripts, so it is the one path without the policy. */
export const contentSecurityPolicy: RequestHandler = (req, res, next) => {
  if (!req.path.startsWith('/docs')) {
    res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  }
  next();
};
