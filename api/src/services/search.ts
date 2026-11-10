import { inArray, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { projects } from '../db/schema.js';
import type { AuthUser } from '../types/express.js';
import { visibleProjectIds } from './permissions.js';
import { listTasks } from './tasks.js';

const MAX = 8;

export async function search(db: Db, user: AuthUser, q: string) {
  const term = q.trim();
  if (!term) return { projects: [], tasks: [] };
  const projectIds = await visibleProjectIds(db, user);
  if (projectIds && projectIds.length === 0) return { projects: [], tasks: [] };

  const like = `%${term.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const matchName = sql`(lower(${projects.name}) like ${like} escape '\\' or lower(${projects.key}) like ${like} escape '\\')`;
  const rows = await db
    .select({ id: projects.id, name: projects.name, key: projects.key, color: projects.color })
    .from(projects)
    .where(projectIds ? sql`${matchName} and ${inArray(projects.id, projectIds)}` : matchName)
    .orderBy(projects.name)
    .limit(MAX);

  const found = await listTasks(db, {
    projectIds,
    meId: user.id,
    q: term,
    sort: 'createdAt',
    order: 'desc',
  });
  return { projects: rows, tasks: found.slice(0, MAX) };
}
