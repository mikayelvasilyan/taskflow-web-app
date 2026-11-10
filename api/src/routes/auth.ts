import { Router, type Response } from 'express';
import type { AppContext } from '../app.js';
import { COOKIE_NAME, authenticate } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { loginBody, signupBody, updateMeBody } from '../schemas/auth.js';
import * as auth from '../services/auth.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function setAuthCookie(res: Response, token: string, secure: boolean) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: WEEK_MS,
    path: '/',
  });
}

export function authRouter(ctx: AppContext) {
  const { db, env } = ctx;
  const r = Router();
  const limit = authRateLimit(env);

  r.post('/auth/signup', limit, async (req, res) => {
    const body = signupBody.parse(req.body);
    const result = await auth.signup(db, env, body);
    setAuthCookie(res, result.token, env.COOKIE_SECURE);
    res.status(201).json(result);
  });

  r.post('/auth/login', limit, async (req, res) => {
    const body = loginBody.parse(req.body);
    const result = await auth.login(db, env, body);
    setAuthCookie(res, result.token, env.COOKIE_SECURE);
    res.json(result);
  });

  r.post('/auth/logout', (_req, res) => {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.status(204).end();
  });

  r.get('/auth/me', authenticate(ctx), (req, res) => {
    res.json({ user: req.user });
  });

  r.patch('/auth/me', authenticate(ctx), async (req, res) => {
    const body = updateMeBody.parse(req.body);
    res.json({ user: await auth.updateMe(db, req.user!, body) });
  });

  return r;
}
