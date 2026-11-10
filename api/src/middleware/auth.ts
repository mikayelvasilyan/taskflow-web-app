import type { RequestHandler } from 'express';
import type { AppContext } from '../app.js';
import { forbidden, unauthenticated } from '../lib/errors.js';
import { verifyToken } from '../lib/jwt.js';
import { getUserById, toAuthUser } from '../services/users.js';

export const COOKIE_NAME = 'tf_token';

export function extractToken(req: Parameters<RequestHandler>[0]): string | null {
  const header = req.headers.authorization;
  if (header?.toLowerCase().startsWith('bearer ')) return header.slice(7).trim() || null;
  const cookie = req.cookies?.[COOKIE_NAME];
  return typeof cookie === 'string' && cookie ? cookie : null;
}

export function authenticate({ db, env }: AppContext): RequestHandler {
  return async (req, _res, next) => {
    const token = extractToken(req);
    const payload = token ? verifyToken(token, env) : null;
    if (!payload) throw unauthenticated();
    const user = await getUserById(db, payload.sub);
    if (!user) throw unauthenticated();
    req.user = toAuthUser(user);
    next();
  };
}

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== 'admin') throw forbidden('Admin access required');
  next();
};
