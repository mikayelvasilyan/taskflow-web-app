import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { invites, labels, projectMembers, projects, tasks, users } from '../db/schema.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { newId } from '../lib/ids.js';
import { PROJECT_COLORS, pickColor } from '../lib/palette.js';
import type { AuthUser } from '../types/express.js';
import { getProjectOrThrow, visibleProjectIds } from './permissions.js';
import { getUserByEmail, toAuthUser } from './users.js';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Candidate keys for a project name, best first: initials, first letters, then letter swaps. */
export function keyCandidates(name: string): string[] {
  const words = name.toUpperCase().match(/[A-Z]+/g) ?? [];
  const joined = words.join('');
  const out: string[] = [];
  if (words.length >= 2)
    out.push(
      words
        .map((w) => w[0])
        .join('')
        .slice(0, 4)
        .padEnd(2, joined[1] ?? 'X'),
    );
  out.push(joined.slice(0, 3).padEnd(2, 'X'));
  out.push(joined.slice(0, 4).padEnd(2, 'X'));
  const base = (out[out.length - 1] ?? 'PRJ').slice(0, 3);
  for (const c of LETTERS) out.push(`${base}${c}`);
  return [...new Set(out.filter((k) => k.length >= 2 && k.length <= 4))];
}

async function uniqueKey(db: Db, name: string) {
  const taken = new Set((await db.select({ key: projects.key }).from(projects)).map((p) => p.key));
  const free = keyCandidates(name).find((k) => !taken.has(k));
  if (free) return free;
  for (;;) {
    const k = Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * 26)]).join('');
    if (!taken.has(k)) return k;
  }
}

export async function listProjects(db: Db, user: AuthUser) {
  const visible = await visibleProjectIds(db, user);
  if (visible && visible.length === 0) return [];
  const rows = visible
    ? await db.select().from(projects).where(inArray(projects.id, visible))
    : await db.select().from(projects);
  rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const statusCounts = await db
    .select({ projectId: tasks.projectId, status: tasks.status, n: sql<number>`count(*)` })
    .from(tasks)
    .groupBy(tasks.projectId, tasks.status);
  const memberCounts = await db
    .select({ projectId: projectMembers.projectId, n: sql<number>`count(*)` })
    .from(projectMembers)
    .groupBy(projectMembers.projectId);

  return rows.map((p) => {
    const taskCounts = { todo: 0, in_progress: 0, done: 0 };
    for (const c of statusCounts) if (c.projectId === p.id) taskCounts[c.status] = Number(c.n);
    const memberCount = Number(memberCounts.find((m) => m.projectId === p.id)?.n ?? 0);
    return { ...p, taskCounts, memberCount };
  });
}

export async function createProject(
  db: Db,
  user: AuthUser,
  input: { name: string; description?: string; color?: string },
) {
  const now = new Date().toISOString();
  const project = {
    id: newId(),
    name: input.name,
    key: await uniqueKey(db, input.name),
    description: input.description ?? '',
    color: input.color ?? pickColor(input.name, PROJECT_COLORS),
    ownerId: user.id,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(projects).values(project);
  await db
    .insert(projectMembers)
    .values({ projectId: project.id, userId: user.id, createdAt: now });
  return project;
}

export async function getProjectDetail(db: Db, projectId: string) {
  const project = await getProjectOrThrow(db, projectId);
  const members = await listMembers(db, projectId);
  const projectLabels = await db.select().from(labels).where(eq(labels.projectId, projectId));
  return { ...project, members: members.members, labels: projectLabels };
}

export async function updateProject(
  db: Db,
  projectId: string,
  input: { name?: string; description?: string; color?: string },
) {
  await db
    .update(projects)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(eq(projects.id, projectId));
  return getProjectOrThrow(db, projectId);
}

export async function deleteProject(db: Db, projectId: string) {
  await db.delete(projects).where(eq(projects.id, projectId));
}

export async function listMembers(db: Db, projectId: string) {
  const rows = await db
    .select({ user: users, joinedAt: projectMembers.createdAt })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .where(eq(projectMembers.projectId, projectId))
    .orderBy(projectMembers.createdAt);
  const pending = await db
    .select()
    .from(invites)
    .where(eq(invites.projectId, projectId))
    .orderBy(invites.createdAt);
  return {
    members: rows.map((r) => ({ ...toAuthUser(r.user), joinedAt: r.joinedAt })),
    invites: pending,
  };
}

export async function inviteMember(db: Db, actor: AuthUser, projectId: string, emailAddr: string) {
  const now = new Date().toISOString();
  const existing = await getUserByEmail(db, emailAddr);
  if (existing) {
    const [already] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, existing.id)));
    if (already) throw conflict('This person is already a member');
    await db.insert(projectMembers).values({ projectId, userId: existing.id, createdAt: now });
    return { member: { ...toAuthUser(existing), joinedAt: now } };
  }
  const [dup] = await db
    .select()
    .from(invites)
    .where(and(eq(invites.projectId, projectId), eq(invites.email, emailAddr)));
  if (dup) throw conflict('This email has already been invited');
  const invite = {
    id: newId(),
    projectId,
    email: emailAddr,
    invitedById: actor.id,
    createdAt: now,
  };
  await db.insert(invites).values(invite);
  return { invite };
}

export async function deleteInvite(db: Db, projectId: string, inviteId: string) {
  const [inv] = await db
    .select()
    .from(invites)
    .where(and(eq(invites.id, inviteId), eq(invites.projectId, projectId)));
  if (!inv) throw notFound('Invite');
  await db.delete(invites).where(eq(invites.id, inviteId));
}

export async function removeMember(db: Db, projectId: string, userId: string) {
  const project = await getProjectOrThrow(db, projectId);
  if (project.ownerId === userId) throw badRequest('The project owner cannot be removed');
  const removed = await db
    .delete(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .returning();
  if (removed.length === 0) throw notFound('Member');
  await db
    .update(tasks)
    .set({ assigneeId: null })
    .where(and(eq(tasks.projectId, projectId), eq(tasks.assigneeId, userId)));
}
