import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { labels } from '../db/schema.js';
import { conflict } from '../lib/errors.js';
import { newId } from '../lib/ids.js';

export const listLabels = (db: Db, projectId: string) =>
  db.select().from(labels).where(eq(labels.projectId, projectId)).orderBy(labels.name);

export async function createLabel(
  db: Db,
  projectId: string,
  input: { name: string; color: string },
) {
  const existing = await listLabels(db, projectId);
  if (existing.some((l) => l.name.toLowerCase() === input.name.toLowerCase())) {
    throw conflict('A label with this name already exists');
  }
  const label = { id: newId(), projectId, ...input };
  await db.insert(labels).values(label);
  return label;
}

export async function labelsBelongToProject(db: Db, projectId: string, labelIds: string[]) {
  if (labelIds.length === 0) return true;
  const rows = await db
    .select({ id: labels.id })
    .from(labels)
    .where(and(eq(labels.projectId, projectId)));
  const valid = new Set(rows.map((r) => r.id));
  return labelIds.every((id) => valid.has(id));
}
