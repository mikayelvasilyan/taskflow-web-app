import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';

export type Db = ReturnType<typeof createDb>['db'];

export function createDb(url: string) {
  const client: Client = createClient({ url });
  const db = drizzle(client, { schema });
  return { db, client };
}

export async function enableForeignKeys(client: Client) {
  await client.execute('PRAGMA foreign_keys = ON');
}
