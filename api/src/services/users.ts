import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { projectMembers, users } from '../db/schema.js';
import { badRequest, notFound } from '../lib/errors.js';
import type { AuthUser } from '../types/express.js';

type UserRow = typeof users.$inferSelect;

export const toAuthUser = (u: UserRow): AuthUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  avatarColor: u.avatarColor,
  isProtected: u.isProtected,
});

export async function getUserById(db: Db, id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ?? null;
}

export async function getUserByEmail(db: Db, email: string) {
  const [row] = await db.select().from(users).where(eq(users.email, email));
  return row ?? null;
}

export async function listUsers(db: Db) {
  const rows = await db.select().from(users).orderBy(users.createdAt);
  const counts = await db
    .select({ userId: projectMembers.userId, n: sql<number>`count(*)` })
    .from(projectMembers)
    .groupBy(projectMembers.userId);
  const byUser = new Map(counts.map((c) => [c.userId, Number(c.n)]));
  return rows.map((u) => ({
    ...toAuthUser(u),
    createdAt: u.createdAt,
    projectCount: byUser.get(u.id) ?? 0,
  }));
}

export async function setUserRole(db: Db, id: string, role: 'admin' | 'member') {
  const user = await getUserById(db, id);
  if (!user) throw notFound('User');
  if (user.isProtected) throw badRequest('Protected accounts cannot be changed');
  await db.update(users).set({ role }).where(eq(users.id, id));
  return toAuthUser({ ...user, role });
}

export async function deleteUser(db: Db, actor: AuthUser, id: string) {
  const user = await getUserById(db, id);
  if (!user) throw notFound('User');
  if (user.id === actor.id) throw badRequest('You cannot delete your own account');
  if (user.isProtected) throw badRequest('Protected accounts cannot be deleted');
  // Projects owned by the user are removed by cascade (see schema).
  await db.delete(users).where(eq(users.id, id));
}
