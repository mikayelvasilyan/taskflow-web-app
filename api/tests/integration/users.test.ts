import request from 'supertest';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { users } from '../../src/db/schema.js';
import { signupUser } from '../helpers/auth.js';
import { makeTestApp } from '../helpers/testApp.js';

describe('admin user management', () => {
  it('lists users for admins only (401 / 403 / 200)', async () => {
    const t = await makeTestApp();
    const admin = await signupUser(t, { role: 'admin' });
    const member = await signupUser(t);

    expect((await request(t.app).get('/api/users')).status).toBe(401);
    const forbidden = await request(t.app).get('/api/users').set(member.auth);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');

    const ok = await request(t.app).get('/api/users').set(admin.auth);
    expect(ok.status).toBe(200);
    expect(ok.body.users).toHaveLength(2);
    expect(ok.body.users[0]).toHaveProperty('projectCount');
    expect(ok.body.users[0].passwordHash).toBeUndefined();
  });

  it('changes a role and validates input', async () => {
    const t = await makeTestApp();
    const admin = await signupUser(t, { role: 'admin' });
    const member = await signupUser(t);

    const bad = await request(t.app)
      .patch(`/api/users/${member.id}`)
      .set(admin.auth)
      .send({ role: 'root' });
    expect(bad.status).toBe(400);

    const ok = await request(t.app)
      .patch(`/api/users/${member.id}`)
      .set(admin.auth)
      .send({ role: 'admin' });
    expect(ok.status).toBe(200);
    expect(ok.body.user.role).toBe('admin');

    expect(
      (await request(t.app).patch('/api/users/nope').set(admin.auth).send({ role: 'member' }))
        .status,
    ).toBe(404);
  });

  it('prevents members from changing roles', async () => {
    const t = await makeTestApp();
    const member = await signupUser(t);
    const other = await signupUser(t);
    const res = await request(t.app)
      .patch(`/api/users/${other.id}`)
      .set(member.auth)
      .send({ role: 'admin' });
    expect(res.status).toBe(403);
  });

  it('deletes a user, but not self or protected accounts', async () => {
    const t = await makeTestApp();
    const admin = await signupUser(t, { role: 'admin' });
    const member = await signupUser(t);
    const demo = await signupUser(t);
    await t.db.update(users).set({ isProtected: true }).where(eq(users.id, demo.id));

    expect((await request(t.app).delete(`/api/users/${admin.id}`).set(admin.auth)).status).toBe(
      400,
    );
    expect((await request(t.app).delete(`/api/users/${demo.id}`).set(admin.auth)).status).toBe(400);
    expect(
      (await request(t.app).patch(`/api/users/${demo.id}`).set(admin.auth).send({ role: 'admin' }))
        .status,
    ).toBe(400);
    expect((await request(t.app).delete('/api/users/nope').set(admin.auth)).status).toBe(404);
    expect((await request(t.app).delete(`/api/users/${member.id}`).set(member.auth)).status).toBe(
      403,
    );

    expect((await request(t.app).delete(`/api/users/${member.id}`).set(admin.auth)).status).toBe(
      204,
    );
    expect((await request(t.app).get('/api/auth/me').set(member.auth)).status).toBe(401);
  });

  it('blocks protected accounts from changing their password', async () => {
    const t = await makeTestApp();
    const demo = await signupUser(t);
    await t.db.update(users).set({ isProtected: true }).where(eq(users.id, demo.id));
    const res = await request(t.app)
      .patch('/api/auth/me')
      .set(demo.auth)
      .send({ currentPassword: demo.password, newPassword: 'Newpass123' });
    expect(res.status).toBe(403);
  });
});
