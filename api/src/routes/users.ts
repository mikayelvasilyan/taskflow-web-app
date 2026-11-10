import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../app.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { idParam } from '../schemas/projects.js';
import * as users from '../services/users.js';

const roleBody = z.object({ role: z.enum(['admin', 'member'], 'Role must be admin or member') });

export function usersRouter(ctx: AppContext) {
  const { db } = ctx;
  const r = Router();
  r.use('/users', authenticate(ctx), requireAdmin);

  r.get('/users', async (_req, res) => {
    res.json({ users: await users.listUsers(db) });
  });

  r.patch('/users/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    const { role } = roleBody.parse(req.body);
    res.json({ user: await users.setUserRole(db, id, role) });
  });

  r.delete('/users/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    await users.deleteUser(db, req.user!, id);
    res.status(204).end();
  });

  return r;
}
