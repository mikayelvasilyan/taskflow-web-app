import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import {
  activity,
  comments,
  labels,
  projects,
  taskLabels,
  tasks,
  users,
  type ActivityType,
  type Status,
} from '../db/schema.js';
import { todayUtc } from '../lib/dates.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { newId } from '../lib/ids.js';
import { POSITION_STEP } from '../lib/position.js';
import type { CreateTaskInput, TaskQuery, UpdateTaskInput } from '../schemas/tasks.js';
import type { AuthUser } from '../types/express.js';
import { labelsBelongToProject } from './labels.js';
import { isAdmin, isProjectMember, requireProjectAccess } from './permissions.js';

type TaskRow = typeof tasks.$inferSelect;
type UserRow = typeof users.$inferSelect;

export interface TaskListFilters extends TaskQuery {
  /** Restrict to these projects. `null` = no restriction (admin, all projects). */
  projectIds: string[] | null;
  /** Resolves `assignee=me`. */
  meId: string;
}

const priorityRank = sql`case ${tasks.priority} when 'urgent' then 4 when 'high' then 3 when 'medium' then 2 else 1 end`;

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

function buildWhere(f: TaskListFilters): SQL | undefined {
  const c: SQL[] = [];
  if (f.projectIds) c.push(f.projectIds.length ? inArray(tasks.projectId, f.projectIds) : sql`0`);
  if (f.status) c.push(eq(tasks.status, f.status));
  if (f.priority) c.push(eq(tasks.priority, f.priority));
  if (f.assignee === 'none') c.push(sql`${tasks.assigneeId} is null`);
  else if (f.assignee) c.push(eq(tasks.assigneeId, f.assignee === 'me' ? f.meId : f.assignee));
  if (f.label) {
    c.push(
      sql`exists (select 1 from ${taskLabels} where ${taskLabels.taskId} = ${tasks.id} and ${taskLabels.labelId} = ${f.label})`,
    );
  }
  if (f.q) {
    const like = `%${escapeLike(f.q.toLowerCase())}%`;
    c.push(
      sql`(lower(${tasks.title}) like ${like} escape '\\' or lower(${tasks.description}) like ${like} escape '\\')`,
    );
  }
  if (f.overdue === 'true') {
    c.push(sql`${tasks.dueDate} < ${todayUtc()}`, sql`${tasks.status} != 'done'`);
  }
  return c.length ? and(...c) : undefined;
}

function buildOrder(f: Pick<TaskQuery, 'sort' | 'order'>) {
  const dir = f.order === 'desc' ? desc : asc;
  switch (f.sort) {
    case 'dueDate':
      // Tasks without a due date always sort last.
      return [sql`${tasks.dueDate} is null`, dir(tasks.dueDate), asc(tasks.position)];
    case 'priority':
      return [dir(priorityRank), asc(tasks.position)];
    case 'createdAt':
      return [dir(tasks.createdAt)];
    case 'title':
      return [dir(sql`lower(${tasks.title})`)];
    default:
      return [dir(tasks.position), asc(tasks.createdAt)];
  }
}

const personOf = (u: { id: string; name: string; avatarColor: string } | null) =>
  u ? { id: u.id, name: u.name, avatarColor: u.avatarColor } : null;

async function serialize(
  db: Db,
  rows: { task: TaskRow; projectKey: string; assignee: UserRow | null }[],
) {
  const ids = rows.map((r) => r.task.id);
  const labelMap = new Map<string, { id: string; name: string; color: string }[]>();
  const countMap = new Map<string, number>();
  if (ids.length) {
    const ls = await db
      .select({ taskId: taskLabels.taskId, id: labels.id, name: labels.name, color: labels.color })
      .from(taskLabels)
      .innerJoin(labels, eq(labels.id, taskLabels.labelId))
      .where(inArray(taskLabels.taskId, ids))
      .orderBy(labels.name);
    for (const l of ls) {
      const list = labelMap.get(l.taskId) ?? [];
      list.push({ id: l.id, name: l.name, color: l.color });
      labelMap.set(l.taskId, list);
    }
    const cs = await db
      .select({ taskId: comments.taskId, n: sql<number>`count(*)` })
      .from(comments)
      .where(inArray(comments.taskId, ids))
      .groupBy(comments.taskId);
    for (const c of cs) countMap.set(c.taskId, Number(c.n));
  }
  return rows.map(({ task, projectKey, assignee }) => ({
    id: task.id,
    key: `${projectKey}-${task.number}`,
    number: task.number,
    projectId: task.projectId,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    position: task.position,
    assignee: personOf(assignee),
    labels: labelMap.get(task.id) ?? [],
    commentCount: countMap.get(task.id) ?? 0,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt,
  }));
}

export type TaskListItem = Awaited<ReturnType<typeof serialize>>[number];

export async function listTasks(db: Db, filters: TaskListFilters): Promise<TaskListItem[]> {
  const rows = await db
    .select({ task: tasks, projectKey: projects.key, assignee: users })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .where(buildWhere(filters))
    .orderBy(...buildOrder(filters));
  return serialize(db, rows);
}

async function getTaskRow(db: Db, id: string): Promise<TaskRow> {
  const [row] = await db.select().from(tasks).where(eq(tasks.id, id));
  if (!row) throw notFound('Task');
  return row;
}

/** Task with access check; used by every single-task route. */
export async function getTaskForUser(db: Db, user: AuthUser, id: string) {
  const task = await getTaskRow(db, id);
  await requireProjectAccess(db, user, task.projectId);
  return task;
}

export async function getTaskDetail(db: Db, id: string) {
  const [row] = await db
    .select({ task: tasks, projectKey: projects.key, assignee: users })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .where(eq(tasks.id, id));
  if (!row) throw notFound('Task');
  const [item] = await serialize(db, [row]);
  const commentRows = await db
    .select({ c: comments, author: users })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.taskId, id))
    .orderBy(asc(comments.createdAt));
  const activityRows = await db
    .select({ a: activity, actor: users })
    .from(activity)
    .innerJoin(users, eq(users.id, activity.actorId))
    .where(eq(activity.taskId, id))
    .orderBy(desc(activity.createdAt), desc(activity.id));
  return {
    ...item!,
    description: row.task.description,
    createdById: row.task.createdById,
    comments: commentRows.map(({ c, author }) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      author: personOf(author),
    })),
    activity: activityRows.map(({ a, actor }) => ({
      id: a.id,
      type: a.type,
      data: a.data,
      createdAt: a.createdAt,
      actor: personOf(actor),
    })),
  };
}

async function endPosition(db: Db, projectId: string, status: Status) {
  const [r] = await db
    .select({ max: sql<number | null>`max(${tasks.position})` })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.status, status)));
  return (r?.max ?? 0) + POSITION_STEP;
}

async function assertAssignee(db: Db, projectId: string, assigneeId: string) {
  if (!(await isProjectMember(db, projectId, assigneeId))) {
    throw badRequest('Assignee must be a member of the project', [
      { path: 'assigneeId', message: 'Assignee must be a member of the project' },
    ]);
  }
}

async function assertLabels(db: Db, projectId: string, labelIds: string[]) {
  if (!(await labelsBelongToProject(db, projectId, labelIds))) {
    throw badRequest('Unknown label', [
      { path: 'labelIds', message: 'One or more labels do not exist' },
    ]);
  }
}

async function userName(db: Db, id: string | null) {
  if (!id) return null;
  const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, id));
  return u?.name ?? null;
}

async function logActivity(
  db: Db,
  taskId: string,
  actorId: string,
  type: ActivityType,
  data: Record<string, unknown> | null,
  createdAt: string,
) {
  await db.insert(activity).values({ id: newId(), taskId, actorId, type, data, createdAt });
}

export async function createTask(
  db: Db,
  user: AuthUser,
  projectId: string,
  input: CreateTaskInput,
) {
  await requireProjectAccess(db, user, projectId);
  if (input.assigneeId) await assertAssignee(db, projectId, input.assigneeId);
  if (input.labelIds) await assertLabels(db, projectId, input.labelIds);

  const now = new Date().toISOString();
  const status: Status = input.status ?? 'todo';
  const id = newId();
  await db.insert(tasks).values({
    id,
    projectId,
    // Single-statement counter so concurrent creates cannot reuse a number.
    number: sql`(select coalesce(max(number), 0) + 1 from tasks where project_id = ${projectId})`,
    title: input.title,
    description: input.description ?? '',
    status,
    priority: input.priority ?? 'medium',
    dueDate: input.dueDate ?? null,
    assigneeId: input.assigneeId ?? null,
    position: await endPosition(db, projectId, status),
    createdById: user.id,
    createdAt: now,
    updatedAt: now,
    completedAt: status === 'done' ? now : null,
  });
  if (input.labelIds?.length) {
    await db.insert(taskLabels).values(input.labelIds.map((labelId) => ({ taskId: id, labelId })));
  }
  await logActivity(db, id, user.id, 'created', null, now);
  return getTaskDetail(db, id);
}

export async function updateTask(db: Db, user: AuthUser, taskId: string, patch: UpdateTaskInput) {
  const task = await getTaskForUser(db, user, taskId);
  const now = new Date().toISOString();
  const changes: Partial<typeof tasks.$inferInsert> = {};
  const log: { type: ActivityType; data: Record<string, unknown> }[] = [];

  if (patch.title !== undefined && patch.title !== task.title) {
    changes.title = patch.title;
    log.push({ type: 'renamed', data: { from: task.title, to: patch.title } });
  }
  if (patch.description !== undefined && patch.description !== task.description) {
    changes.description = patch.description;
  }
  if (patch.priority !== undefined && patch.priority !== task.priority) {
    changes.priority = patch.priority;
    log.push({ type: 'priority_changed', data: { from: task.priority, to: patch.priority } });
  }
  if (patch.dueDate !== undefined && patch.dueDate !== task.dueDate) {
    changes.dueDate = patch.dueDate;
    log.push({ type: 'due_changed', data: { from: task.dueDate, to: patch.dueDate } });
  }
  if (patch.assigneeId !== undefined && patch.assigneeId !== task.assigneeId) {
    if (patch.assigneeId) await assertAssignee(db, task.projectId, patch.assigneeId);
    changes.assigneeId = patch.assigneeId;
    log.push({
      type: 'assigned',
      data: {
        from: await userName(db, task.assigneeId),
        to: await userName(db, patch.assigneeId),
      },
    });
  }
  if (patch.status !== undefined && patch.status !== task.status) {
    changes.status = patch.status;
    changes.completedAt = patch.status === 'done' ? now : null;
    // Moving to another column without an explicit slot puts the task at the end.
    if (patch.position === undefined) {
      changes.position = await endPosition(db, task.projectId, patch.status);
    }
    log.push({ type: 'status_changed', data: { from: task.status, to: patch.status } });
  }
  if (patch.position !== undefined && patch.position !== task.position) {
    changes.position = patch.position;
  }
  if (patch.labelIds) await assertLabels(db, task.projectId, patch.labelIds);

  const labelsChanged = !!patch.labelIds;
  if (Object.keys(changes).length || labelsChanged) {
    await db
      .update(tasks)
      .set({ ...changes, updatedAt: now })
      .where(eq(tasks.id, taskId));
  }
  if (patch.labelIds) {
    await db.delete(taskLabels).where(eq(taskLabels.taskId, taskId));
    if (patch.labelIds.length) {
      await db
        .insert(taskLabels)
        .values([...new Set(patch.labelIds)].map((labelId) => ({ taskId, labelId })));
    }
  }
  for (const entry of log) await logActivity(db, taskId, user.id, entry.type, entry.data, now);
  return getTaskDetail(db, taskId);
}

export async function deleteTask(db: Db, user: AuthUser, taskId: string) {
  await getTaskForUser(db, user, taskId);
  await db.delete(tasks).where(eq(tasks.id, taskId));
}

export async function addComment(db: Db, user: AuthUser, taskId: string, body: string) {
  await getTaskForUser(db, user, taskId);
  const now = new Date().toISOString();
  const id = newId();
  await db.insert(comments).values({ id, taskId, authorId: user.id, body, createdAt: now });
  await logActivity(db, taskId, user.id, 'commented', { commentId: id }, now);
  return { id, body, createdAt: now, author: personOf(user) };
}

export async function deleteComment(db: Db, user: AuthUser, commentId: string) {
  const [c] = await db.select().from(comments).where(eq(comments.id, commentId));
  if (!c) throw notFound('Comment');
  await getTaskForUser(db, user, c.taskId);
  if (c.authorId !== user.id && !isAdmin(user)) {
    throw forbidden('Only the author or an admin can delete this comment');
  }
  await db.delete(comments).where(eq(comments.id, commentId));
}
