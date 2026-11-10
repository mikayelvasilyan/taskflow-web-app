import { Router } from 'express';
import { sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';

const startedAt = Date.now();

export function healthRouter(db: Db) {
  const r = Router();
  r.get('/health', async (_req, res) => {
    let dbStatus: 'ok' | 'error' = 'ok';
    try {
      await db.run(sql`select 1`);
    } catch {
      dbStatus = 'error';
    }
    res.status(dbStatus === 'ok' ? 200 : 503).json({
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      version: '1.0.0',
      uptime: Math.round((Date.now() - startedAt) / 1000),
      db: dbStatus,
    });
  });
  return r;
}
