import { inArray, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { projects, tasks, type Priority, type Status } from '../db/schema.js';
import { addDaysUtc, todayUtc } from '../lib/dates.js';
import type { AuthUser } from '../types/express.js';
import { visibleProjectIds } from './permissions.js';
import { listTasks } from './tasks.js';

const LIST_LIMIT = 10;
const CHART_DAYS = 14;

export async function getDashboard(db: Db, user: AuthUser) {
  const projectIds = await visibleProjectIds(db, user);
  const today = todayUtc();

  const rows =
    projectIds && projectIds.length === 0
      ? []
      : await db
          .select({
            status: tasks.status,
            priority: tasks.priority,
            dueDate: tasks.dueDate,
            completedAt: tasks.completedAt,
          })
          .from(tasks)
          .where(projectIds ? inArray(tasks.projectId, projectIds) : undefined);

  const counts: Record<Status | 'overdue', number> = {
    todo: 0,
    in_progress: 0,
    done: 0,
    overdue: 0,
  };
  const byPriority: Record<Priority, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
  const completed = new Map<string, number>();

  for (const r of rows) {
    counts[r.status] += 1;
    if (r.status !== 'done') {
      byPriority[r.priority] += 1;
      if (r.dueDate && r.dueDate < today) counts.overdue += 1;
    } else if (r.completedAt) {
      const day = r.completedAt.slice(0, 10);
      completed.set(day, (completed.get(day) ?? 0) + 1);
    }
  }

  const weekEnd = addDaysUtc(7);
  let dueThisWeek = 0;
  let oldestOverdueDays: number | null = null;
  for (const r of rows) {
    if (r.status === 'done' || !r.dueDate) continue;
    if (r.dueDate >= today && r.dueDate <= weekEnd) dueThisWeek += 1;
    if (r.dueDate < today) {
      const days = Math.round((Date.parse(today) - Date.parse(r.dueDate)) / 86_400_000);
      oldestOverdueDays = Math.max(oldestOverdueDays ?? 0, days);
    }
  }
  let projectCount = projectIds?.length ?? 0;
  if (!projectIds) {
    const [c] = await db.select({ n: sql<number>`count(*)` }).from(projects);
    projectCount = Number(c?.n ?? 0);
  }

  const completedByDay = Array.from({ length: CHART_DAYS }, (_, i) => {
    const date = addDaysUtc(i - (CHART_DAYS - 1));
    return { date, count: completed.get(date) ?? 0 };
  });

  const insights = {
    projectCount,
    dueThisWeek,
    completedLast7Days: completedByDay.slice(-7).reduce((n, d) => n + d.count, 0),
    oldestOverdueDays,
  };

  const base = { projectIds, meId: user.id };
  const overdue = (await listTasks(db, { ...base, overdue: 'true', sort: 'dueDate' })).slice(
    0,
    LIST_LIMIT,
  );
  const myTasks = (await listTasks(db, { ...base, assignee: 'me', sort: 'dueDate' }))
    .filter((t) => t.status !== 'done')
    .slice(0, LIST_LIMIT);

  return { counts, byPriority, completedByDay, insights, overdue, myTasks };
}
