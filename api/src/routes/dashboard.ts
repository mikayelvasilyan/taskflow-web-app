import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../app.js';
import { authenticate } from '../middleware/auth.js';
import { getDashboard } from '../services/dashboard.js';
import { search } from '../services/search.js';

const searchQuery = z.object({ q: z.string().trim().max(100).default('') });

export function dashboardRouter(ctx: AppContext) {
  const { db } = ctx;
  const r = Router();
  r.use(['/dashboard', '/search'], authenticate(ctx));

  r.get('/dashboard', async (req, res) => {
    res.json(await getDashboard(db, req.user!));
  });

  r.get('/search', async (req, res) => {
    const { q } = searchQuery.parse(req.query);
    res.json(await search(db, req.user!, q));
  });

  return r;
}
