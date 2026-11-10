import { sql } from 'drizzle-orm';
import { addDaysUtc } from '../lib/dates.js';
import { newId } from '../lib/ids.js';
import { PROJECT_COLORS, pickColor } from '../lib/palette.js';
import { hashPassword } from '../lib/password.js';
import { POSITION_STEP } from '../lib/position.js';
import type { Db } from './client.js';
import { LABELS, PEOPLE, PROJECTS, type PersonKey } from './seed-data.js';
import {
  activity,
  comments,
  invites,
  labels,
  projectMembers,
  projects,
  taskLabels,
  tasks,
  users,
  type Priority,
  type Status,
} from './schema.js';

const DAY = 86_400_000;

/** Deletes every row. Child tables first so it works with foreign keys on. */
export async function wipeAll(db: Db) {
  for (const table of [
    activity,
    comments,
    taskLabels,
    tasks,
    labels,
    invites,
    projectMembers,
    projects,
    users,
  ]) {
    await db.delete(table);
  }
}

export async function isEmpty(db: Db) {
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(users);
  return Number(r?.n ?? 0) === 0;
}

/** Realistic demo data. All dates are relative to `now`. */
export async function seedDemo(db: Db, now: Date = new Date()) {
  const iso = (offsetMs: number) => new Date(now.getTime() + offsetMs).toISOString();
  const hashes = new Map<string, string>();
  for (const p of PEOPLE) {
    if (!hashes.has(p.password)) hashes.set(p.password, await hashPassword(p.password));
  }

  const ids = {} as Record<PersonKey, string>;
  await db.insert(users).values(
    PEOPLE.map((p, i) => {
      ids[p.key] = newId();
      return {
        id: ids[p.key],
        email: p.email,
        name: p.name,
        passwordHash: hashes.get(p.password)!,
        role: p.role,
        avatarColor: pickColor(p.email),
        isProtected: p.isProtected,
        createdAt: iso(-(60 - i) * DAY),
      };
    }),
  );

  for (const [pi, proj] of PROJECTS.entries()) {
    const projectId = newId();
    const created = iso(-(30 - pi * 3) * DAY);
    await db.insert(projects).values({
      id: projectId,
      name: proj.name,
      key: proj.key,
      description: proj.description,
      color: proj.color,
      ownerId: ids[proj.owner],
      createdAt: created,
      updatedAt: created,
    });
    await db
      .insert(projectMembers)
      .values(proj.members.map((m) => ({ projectId, userId: ids[m], createdAt: created })));
    for (const email of proj.invites ?? []) {
      await db.insert(invites).values({
        id: newId(),
        projectId,
        email,
        invitedById: ids[proj.owner],
        createdAt: iso(-DAY),
      });
    }

    const labelIds = new Map<string, string>();
    await db.insert(labels).values(
      LABELS.map((l) => {
        const id = newId();
        labelIds.set(l.name, id);
        return { id, projectId, name: l.name, color: l.color };
      }),
    );

    const nextPos: Record<Status, number> = { todo: 0, in_progress: 0, done: 0 };
    for (const [ti, t] of proj.tasks.entries()) {
      const taskId = newId();
      nextPos[t.status] += POSITION_STEP;
      const createdAt = iso(-(24 - ti) * DAY);
      const completedAt = t.status === 'done' ? iso(-(t.doneDaysAgo ?? 1) * DAY) : null;
      await db.insert(tasks).values({
        id: taskId,
        projectId,
        number: ti + 1,
        title: t.title,
        description: t.desc ?? '',
        status: t.status,
        priority: t.priority,
        dueDate: t.due === null ? null : addDaysUtc(t.due, now),
        assigneeId: t.who ? ids[t.who] : null,
        position: nextPos[t.status],
        createdById: ids[proj.owner],
        createdAt,
        updatedAt: completedAt ?? createdAt,
        completedAt,
      });
      if (t.labels.length) {
        await db
          .insert(taskLabels)
          .values(t.labels.map((name) => ({ taskId, labelId: labelIds.get(name)! })));
      }
      await db.insert(activity).values({
        id: newId(),
        taskId,
        actorId: ids[proj.owner],
        type: 'created',
        data: null,
        createdAt,
      });
      if (t.status !== 'todo') {
        await db.insert(activity).values({
          id: newId(),
          taskId,
          actorId: t.who ? ids[t.who] : ids[proj.owner],
          type: 'status_changed',
          data: { from: 'todo', to: t.status },
          createdAt: completedAt ?? iso(-DAY),
        });
      }
      for (const [ci, [who, body]] of (t.comments ?? []).entries()) {
        const commentId = newId();
        const at = iso(-(3 - ci) * 3_600_000 * 5 - DAY);
        await db
          .insert(comments)
          .values({ id: commentId, taskId, authorId: ids[who], body, createdAt: at });
        await db.insert(activity).values({
          id: newId(),
          taskId,
          actorId: ids[who],
          type: 'commented',
          data: { commentId },
          createdAt: at,
        });
      }
    }
  }
}

export interface WorkspaceCredentials {
  id: string;
  email: string;
  password: string;
}

const WORKSPACE_PASSWORD = 'Passw0rd!';

/**
 * An isolated workspace with unique emails: safe to create many in parallel.
 * Admin owns the project, `member` is a plain project member, `outsider` is not in the project.
 */
export async function seedWorkspace(db: Db, opts: { tasks?: number } = {}, now: Date = new Date()) {
  const tag = newId();
  const hash = await hashPassword(WORKSPACE_PASSWORD);
  const createdAt = now.toISOString();
  const mk = (label: string): WorkspaceCredentials & { name: string } => ({
    id: newId(),
    email: `${label}-${tag}@workspace.test`,
    password: WORKSPACE_PASSWORD,
    name: `${label[0]!.toUpperCase()}${label.slice(1)} ${tag.slice(0, 4)}`,
  });
  const admin = mk('admin');
  const member = mk('member');
  const outsider = mk('outsider');
  await db.insert(users).values([
    { ...base(admin, 'admin'), createdAt },
    { ...base(member, 'member'), createdAt },
    { ...base(outsider, 'member'), createdAt },
  ]);
  function base(u: WorkspaceCredentials & { name: string }, role: 'admin' | 'member') {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      passwordHash: hash,
      role,
      avatarColor: pickColor(u.email),
      isProtected: false,
    };
  }

  const projectId = newId();
  const projectKey = `W${tag
    .slice(0, 3)
    .toUpperCase()
    .replace(/[0-9]/g, (d) => 'ABCDEFGHIJ'[Number(d)]!)}`;
  const project = {
    id: projectId,
    name: `Workspace ${tag.slice(0, 6)}`,
    key: projectKey,
    description: 'Isolated workspace created for a test run',
    color: pickColor(tag, PROJECT_COLORS),
    ownerId: admin.id,
    createdAt,
    updatedAt: createdAt,
  };
  // Keys must be unique across projects; retry with fresh letters on the (rare) collision.
  await insertProjectWithUniqueKey(db, project);
  await db
    .insert(projectMembers)
    .values([admin, member].map((u) => ({ projectId, userId: u.id, createdAt })));

  const labelRows = LABELS.slice(0, 3).map((l) => ({ id: newId(), projectId, ...l }));
  await db.insert(labels).values(labelRows);

  const fixed: {
    title: string;
    status: Status;
    priority: Priority;
    due: number | null;
    who: string | null;
    label?: number;
  }[] = [
    { title: 'Todo low unassigned', status: 'todo', priority: 'low', due: null, who: null },
    {
      title: 'Todo medium assigned',
      status: 'todo',
      priority: 'medium',
      due: 5,
      who: member.id,
      label: 0,
    },
    {
      title: 'Todo high overdue',
      status: 'todo',
      priority: 'high',
      due: -3,
      who: member.id,
      label: 1,
    },
    { title: 'Todo urgent due today', status: 'todo', priority: 'urgent', due: 0, who: admin.id },
    {
      title: 'In progress medium',
      status: 'in_progress',
      priority: 'medium',
      due: 2,
      who: admin.id,
      label: 2,
    },
    {
      title: 'In progress high overdue',
      status: 'in_progress',
      priority: 'high',
      due: -1,
      who: null,
    },
    { title: 'Done low', status: 'done', priority: 'low', due: -5, who: member.id },
    { title: 'Done medium', status: 'done', priority: 'medium', due: null, who: admin.id },
  ];
  const extra = Math.max(0, opts.tasks ?? 0);
  const all = [
    ...fixed,
    ...Array.from({ length: extra }, (_, i) => ({
      title: `Generated task ${i + 1}`,
      status: (['todo', 'in_progress', 'done'] as const)[i % 3]!,
      priority: (['low', 'medium', 'high', 'urgent'] as const)[i % 4]!,
      due: null,
      who: null,
    })),
  ];
  const nextPos: Record<Status, number> = { todo: 0, in_progress: 0, done: 0 };
  const out = [];
  for (const [i, t] of all.entries()) {
    const id = newId();
    nextPos[t.status] += POSITION_STEP;
    const row = {
      id,
      projectId,
      number: i + 1,
      title: t.title,
      description: '',
      status: t.status,
      priority: t.priority,
      dueDate: t.due === null ? null : addDaysUtc(t.due, now),
      assigneeId: t.who,
      position: nextPos[t.status],
      createdById: admin.id,
      createdAt,
      updatedAt: createdAt,
      completedAt: t.status === 'done' ? createdAt : null,
    };
    await db.insert(tasks).values(row);
    const labelIdx = 'label' in t ? t.label : undefined;
    if (labelIdx !== undefined)
      await db.insert(taskLabels).values({ taskId: id, labelId: labelRows[labelIdx]!.id });
    await db.insert(activity).values({
      id: newId(),
      taskId: id,
      actorId: admin.id,
      type: 'created',
      data: null,
      createdAt,
    });
    out.push({
      id,
      key: `${projectKey}-${row.number}`,
      title: row.title,
      status: row.status,
      priority: row.priority,
      dueDate: row.dueDate,
      assigneeId: row.assigneeId,
    });
  }

  const creds = (u: WorkspaceCredentials) => ({ id: u.id, email: u.email, password: u.password });
  return {
    admin: creds(admin),
    member: creds(member),
    outsider: creds(outsider),
    project: { id: projectId, key: projectKey, name: project.name },
    labels: labelRows.map((l) => ({ id: l.id, name: l.name })),
    tasks: out,
  };
}

async function insertProjectWithUniqueKey(db: Db, project: typeof projects.$inferInsert) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      await db.insert(projects).values(project);
      return;
    } catch (err) {
      if (!String(err).includes('UNIQUE')) throw err;
      const rnd = () => letters[Math.floor(Math.random() * 26)]!;
      project.key = `W${rnd()}${rnd()}${rnd()}`;
    }
  }
  throw new Error('Could not allocate a unique project key');
}

export async function seedIfEmpty(db: Db) {
  if (await isEmpty(db)) {
    await seedDemo(db);
    return true;
  }
  return false;
}

/** Wipes everything and re-creates the demo data (used by the live demo's periodic reset). */
export async function resetDemo(db: Db) {
  await wipeAll(db);
  await seedDemo(db);
}
