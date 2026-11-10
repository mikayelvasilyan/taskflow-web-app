import { createApp } from '../../src/app.js';
import { createDb } from '../../src/db/client.js';
import { runMigrations } from '../../src/db/migrate.js';
import { parseEnv, type Env } from '../../src/env.js';

export async function makeTestApp(overrides: Record<string, string> = {}) {
  const env: Env = parseEnv({ NODE_ENV: 'test', DATABASE_URL: ':memory:', ...overrides });
  const { db, client } = createDb(':memory:');
  await runMigrations(db);
  const app = createApp({ db, env });
  return { app, db, client, env };
}
