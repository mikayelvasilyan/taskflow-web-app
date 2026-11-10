import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { createApp } from './app.js';
import { createDb } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { resetDemo, seedIfEmpty } from './db/seed.js';
import { parseEnv } from './env.js';

const env = parseEnv();
if (env.DATABASE_URL.startsWith('file:') && !env.DATABASE_URL.includes(':memory:')) {
  mkdirSync(path.dirname(env.DATABASE_URL.replace(/^file:/, '')), { recursive: true });
}
const { db } = createDb(env.DATABASE_URL);
await runMigrations(db);

if (env.SEED_ON_START && (await seedIfEmpty(db))) console.log('Seeded demo data');
if (env.DEMO_RESET_INTERVAL_MINUTES > 0) {
  setInterval(() => {
    resetDemo(db).then(
      () => console.log('Demo data reset'),
      (err) => console.error('Demo reset failed', err),
    );
  }, env.DEMO_RESET_INTERVAL_MINUTES * 60_000).unref();
}

const app = createApp({ db, env });
app.listen(env.PORT, () => {
  console.log(`TaskFlow API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
