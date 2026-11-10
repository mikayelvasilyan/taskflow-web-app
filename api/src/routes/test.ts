import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../app.js';
import { resetDemo, seedWorkspace, wipeAll } from '../db/seed.js';

const resetBody = z.object({ seed: z.enum(['demo', 'none']).default('demo') });
const seedBody = z.object({
  scenario: z.enum(['workspace', 'demo']).default('workspace'),
  tasks: z.number().int().min(0).max(500).optional(),
});

/**
 * Test-only helpers. This router is only mounted when NODE_ENV=test (see createApp);
 * in every other environment these paths fall through to the normal 404.
 */
export function testRouter({ db }: AppContext) {
  const r = Router();

  // Global wipe: not parallel-safe. Use /test/seed for isolated workspaces.
  r.post('/test/reset', async (req, res) => {
    const { seed } = resetBody.parse(req.body ?? {});
    if (seed === 'demo') await resetDemo(db);
    else await wipeAll(db);
    res.json({ ok: true, seeded: seed });
  });

  r.post('/test/seed', async (req, res) => {
    const { scenario, tasks } = seedBody.parse(req.body ?? {});
    if (scenario === 'demo') {
      await resetDemo(db);
      res.status(201).json({ scenario });
      return;
    }
    res.status(201).json({ scenario, ...(await seedWorkspace(db, { tasks })) });
  });

  return r;
}
