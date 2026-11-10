import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/libsql/migrator';
import type { Db } from './client.js';

const here = path.dirname(fileURLToPath(import.meta.url));
// src/db -> ../../drizzle ; dist/db -> ../../drizzle (same depth)
const migrationsFolder = path.resolve(here, '../../drizzle');

export async function runMigrations(db: Db) {
  await migrate(db, { migrationsFolder });
}
