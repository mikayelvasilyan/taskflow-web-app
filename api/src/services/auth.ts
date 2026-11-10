import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { invites, projectMembers, users } from '../db/schema.js';
import type { Env } from '../env.js';
import { badRequest, conflict, forbidden, unauthenticated } from '../lib/errors.js';
import { newId } from '../lib/ids.js';
import { signToken } from '../lib/jwt.js';
import { pickColor } from '../lib/palette.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import type { AuthUser } from '../types/express.js';
import { getUserByEmail, getUserById, toAuthUser } from './users.js';

export async function signup(
  db: Db,
  env: Env,
  input: { name: string; email: string; password: string },
) {
  if (await getUserByEmail(db, input.email))
    throw conflict('An account with this email already exists');
  const now = new Date().toISOString();
  const row = {
    id: newId(),
    email: input.email,
    name: input.name,
    passwordHash: await hashPassword(input.password),
    role: 'member' as const,
    avatarColor: pickColor(input.email),
    isProtected: false,
    createdAt: now,
  };
  await db.insert(users).values(row);
  await applyPendingInvites(db, row.id, row.email);
  return { user: toAuthUser(row), token: signToken(row.id, env) };
}

/** Turns stored invites for this email into real memberships. */
export async function applyPendingInvites(db: Db, userId: string, emailAddr: string) {
  const pending = await db.select().from(invites).where(eq(invites.email, emailAddr));
  const now = new Date().toISOString();
  for (const inv of pending) {
    await db
      .insert(projectMembers)
      .values({ projectId: inv.projectId, userId, createdAt: now })
      .onConflictDoNothing();
  }
  if (pending.length) await db.delete(invites).where(eq(invites.email, emailAddr));
}

export async function login(db: Db, env: Env, input: { email: string; password: string }) {
  const user = await getUserByEmail(db, input.email);
  const ok = user ? await verifyPassword(input.password, user.passwordHash) : false;
  if (!user || !ok) throw unauthenticated('Invalid email or password');
  return { user: toAuthUser(user), token: signToken(user.id, env) };
}

export async function updateMe(
  db: Db,
  actor: AuthUser,
  input: { name?: string; currentPassword?: string; newPassword?: string },
) {
  const user = await getUserById(db, actor.id);
  if (!user) throw unauthenticated();
  const patch: Partial<typeof users.$inferInsert> = {};
  if (input.name) patch.name = input.name;
  if (input.newPassword) {
    if (user.isProtected) throw forbidden('Demo accounts cannot change their password');
    if (
      !input.currentPassword ||
      !(await verifyPassword(input.currentPassword, user.passwordHash))
    ) {
      throw badRequest('Current password is incorrect', [
        { path: 'currentPassword', message: 'Current password is incorrect' },
      ]);
    }
    patch.passwordHash = await hashPassword(input.newPassword);
  }
  if (Object.keys(patch).length) await db.update(users).set(patch).where(eq(users.id, actor.id));
  const fresh = await getUserById(db, actor.id);
  return toAuthUser(fresh!);
}

export async function countUsers(db: Db) {
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(users);
  return Number(r?.n ?? 0);
}
