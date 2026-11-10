import request from 'supertest';
import { eq } from 'drizzle-orm';
import { users } from '../../src/db/schema.js';
import type { makeTestApp } from './testApp.js';

export type TestApp = Awaited<ReturnType<typeof makeTestApp>>;

let counter = 0;

/** Signs a user up through the API and returns a ready-to-use Bearer header. */
export async function signupUser(
  t: TestApp,
  opts: { name?: string; email?: string; role?: 'admin' | 'member' } = {},
) {
  counter += 1;
  const email = opts.email ?? `user${counter}@test.dev`;
  const res = await request(t.app)
    .post('/api/auth/signup')
    .send({ name: opts.name ?? `User ${counter}`, email, password: 'Passw0rd!' });
  if (res.status !== 201) throw new Error(`signup failed: ${JSON.stringify(res.body)}`);
  if (opts.role === 'admin') {
    await t.db.update(users).set({ role: 'admin' }).where(eq(users.id, res.body.user.id));
  }
  return {
    id: res.body.user.id as string,
    email,
    password: 'Passw0rd!',
    token: res.body.token as string,
    auth: { Authorization: `Bearer ${res.body.token}` } as Record<string, string>,
  };
}
