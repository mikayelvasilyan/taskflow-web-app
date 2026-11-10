import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { addDaysUtc } from '../../src/lib/dates.js';
import { isEmpty, seedDemo, seedIfEmpty } from '../../src/db/seed.js';
import { makeTestApp } from '../helpers/testApp.js';

const login = async (
  t: Awaited<ReturnType<typeof makeTestApp>>,
  email: string,
  password: string,
) => {
  const res = await request(t.app).post('/api/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return { Authorization: `Bearer ${res.body.token}` };
};

describe('demo seed', () => {
  it('creates the documented demo accounts, projects and varied tasks', async () => {
    const t = await makeTestApp();
    expect(await isEmpty(t.db)).toBe(true);
    expect(await seedIfEmpty(t.db)).toBe(true);
    expect(await seedIfEmpty(t.db)).toBe(false);

    const admin = await login(t, 'demo@taskflow.dev', 'Demo123!');
    const member = await login(t, 'member@taskflow.dev', 'Member123!');

    const adminProjects = (await request(t.app).get('/api/projects').set(admin)).body.projects;
    expect(adminProjects.map((p: { key: string }) => p.key)).toEqual(['WEB', 'APP', 'MKT']);
    const memberProjects = (await request(t.app).get('/api/projects').set(member)).body.projects;
    expect(memberProjects.map((p: { key: string }) => p.key)).toEqual(['WEB', 'APP']);

    const me = await request(t.app).get('/api/auth/me').set(admin);
    expect(me.body.user).toMatchObject({ role: 'admin', isProtected: true });

    const dash = (await request(t.app).get('/api/dashboard').set(admin)).body;
    expect(dash.counts.overdue).toBe(4);
    expect(dash.counts.done).toBe(15);
    expect(
      dash.completedByDay.filter((d: { count: number }) => d.count > 0).length,
    ).toBeGreaterThan(8);

    const all = (await request(t.app).get('/api/tasks').set(admin)).body.tasks;
    expect(all.length).toBeGreaterThanOrEqual(30);
    const dueToday = all.filter(
      (x: { dueDate: string | null; status: string }) => x.dueDate === addDaysUtc(0),
    );
    const dueTomorrow = all.filter((x: { dueDate: string | null }) => x.dueDate === addDaysUtc(1));
    expect(dueToday.length).toBe(2);
    expect(dueTomorrow.length).toBe(2);
    expect(all.some((x: { commentCount: number }) => x.commentCount > 0)).toBe(true);
    expect(all.some((x: { labels: unknown[] }) => x.labels.length > 0)).toBe(true);

    const web = adminProjects.find((p: { key: string }) => p.key === 'WEB');
    const members = await request(t.app).get(`/api/projects/${web.id}/members`).set(admin);
    expect(members.body.invites).toHaveLength(1);
  });

  it('keeps dates relative to the seed time', async () => {
    const t = await makeTestApp();
    await seedDemo(t.db, new Date('2030-06-15T12:00:00Z'));
    const admin = await login(t, 'demo@taskflow.dev', 'Demo123!');
    const res = await request(t.app).get('/api/tasks').set(admin);
    const dates = res.body.tasks.map((x: { dueDate: string | null }) => x.dueDate);
    expect(dates.filter((d: string | null) => d === '2030-06-15')).toHaveLength(2);
    expect(dates.filter((d: string | null) => d === '2030-06-16')).toHaveLength(2);
  });
});

describe('test-only endpoints', () => {
  it('seeds an isolated workspace with usable credentials', async () => {
    const t = await makeTestApp();
    const res = await request(t.app).post('/api/test/seed').send({});
    expect(res.status).toBe(201);
    const { admin, member, outsider, project, tasks } = res.body;
    expect(tasks).toHaveLength(8);
    expect(new Set(tasks.map((x: { status: string }) => x.status))).toEqual(
      new Set(['todo', 'in_progress', 'done']),
    );
    expect(new Set(tasks.map((x: { priority: string }) => x.priority)).size).toBe(4);
    expect(tasks.some((x: { assigneeId: string | null }) => x.assigneeId === null)).toBe(true);

    const adminAuth = await login(t, admin.email, admin.password);
    const memberAuth = await login(t, member.email, member.password);
    const outsiderAuth = await login(t, outsider.email, outsider.password);

    expect((await request(t.app).get(`/api/projects/${project.id}`).set(memberAuth)).status).toBe(
      200,
    );
    expect((await request(t.app).get(`/api/projects/${project.id}`).set(outsiderAuth)).status).toBe(
      403,
    );
    expect((await request(t.app).get('/api/users').set(adminAuth)).status).toBe(200);
    expect((await request(t.app).get('/api/users').set(memberAuth)).status).toBe(403);
    expect(
      (await request(t.app).delete(`/api/projects/${project.id}`).set(memberAuth)).status,
    ).toBe(403);

    const list = (await request(t.app).get(`/api/projects/${project.id}/tasks`).set(memberAuth))
      .body.tasks;
    expect(
      list.filter(
        (x: { dueDate: string | null; status: string }) =>
          x.dueDate && x.dueDate < addDaysUtc(0) && x.status !== 'done',
      ),
    ).toHaveLength(2);
    expect(list.some((x: { dueDate: string | null }) => x.dueDate === addDaysUtc(0))).toBe(true);
  });

  it('creates independent workspaces and generates extra tasks on request', async () => {
    const t = await makeTestApp();
    const [a, b] = await Promise.all([
      request(t.app).post('/api/test/seed').send({ tasks: 4 }),
      request(t.app).post('/api/test/seed').send({}),
    ]);
    expect(a.body.tasks).toHaveLength(12);
    expect(a.body.admin.email).not.toBe(b.body.admin.email);
    expect(a.body.project.key).not.toBe(b.body.project.key);
    const memberA = await login(t, a.body.member.email, a.body.member.password);
    expect(
      (await request(t.app).get(`/api/projects/${b.body.project.id}`).set(memberA)).status,
    ).toBe(403);
    expect((await request(t.app).get('/api/projects').set(memberA)).body.projects).toHaveLength(1);
  });

  it('seeds the demo scenario, and resets with or without demo data', async () => {
    const t = await makeTestApp();
    expect((await request(t.app).post('/api/test/seed').send({ scenario: 'demo' })).status).toBe(
      201,
    );
    await login(t, 'demo@taskflow.dev', 'Demo123!');
    expect((await request(t.app).post('/api/test/reset').send({ seed: 'none' })).body.seeded).toBe(
      'none',
    );
    expect(await isEmpty(t.db)).toBe(true);
    expect((await request(t.app).post('/api/test/reset')).status).toBe(200);
    expect(await isEmpty(t.db)).toBe(false);
    expect((await request(t.app).post('/api/test/seed').send({ scenario: 'nope' })).status).toBe(
      400,
    );
  });

  it.each(['development', 'production'])(
    'returns 404 for both endpoints when NODE_ENV=%s',
    async (env) => {
      const t = await makeTestApp({ NODE_ENV: env, JWT_SECRET: 'x'.repeat(32) });
      const reset = await request(t.app).post('/api/test/reset').send({});
      const seed = await request(t.app).post('/api/test/seed').send({});
      expect(reset.status).toBe(404);
      expect(seed.status).toBe(404);
      expect(reset.body.error.code).toBe('NOT_FOUND');
      expect(await isEmpty(t.db)).toBe(true);
    },
  );

  it('works when NODE_ENV=test', async () => {
    const t = await makeTestApp({ NODE_ENV: 'test' });
    expect((await request(t.app).post('/api/test/seed').send({})).status).toBe(201);
  });
});
