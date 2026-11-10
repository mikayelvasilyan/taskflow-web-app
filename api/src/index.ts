import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { createApp } from './app.js';
import { createDb } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { parseEnv } from './env.js';

const env = parseEnv();
if (env.DATABASE_URL.startsWith('file:') && !env.DATABASE_URL.includes(':memory:')) {
  mkdirSync(path.dirname(env.DATABASE_URL.replace(/^file:/, '')), { recursive: true });
}
const { db } = createDb(env.DATABASE_URL);
await runMigrations(db);

const app = createApp({ db, env });
app.listen(env.PORT, () => {
  console.log(`TaskFlow API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
