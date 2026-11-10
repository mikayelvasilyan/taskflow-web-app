import request from 'supertest';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { tasks } from '../../src/db/schema.js';
import { addDaysUtc } from '../../src/lib/dates.js';
import { signupUser } from '../helpers/auth.js';
import { makeTestApp } from '../helpers/testApp.js';

async function setup() {
  const t = await makeTestApp();
  const owner = await signupUser(t);
  const member = await signupUser(t);
  const outsider = await signupUser(t);
  const admin = await signupUser(t, { role: 'admin' });
  const project = (
    await request(t.app).post('/api/projects').set(owner.auth).send({ name: 'Mobile App Launch' })
  ).body.project;
  await request(t.app)
    .post(`/api/projects/${project.id}/invites`)
    .set(owner.auth)
    .send({ email: member.email });
  const create = async (body: object) =>
    (await request(t.app).post(`/api/projects/${project.id}/tasks`).set(owner.auth).send(body)).body
      .task;

  await create({
    title: 'Overdue A',
    dueDate: addDaysUtc(-5),
    priority: 'urgent',
    assigneeId: member.id,
  });
  await create({ title: 'Overdue B', dueDate: addDaysUtc(-1), status: 'in_progress' });
  await create({ title: 'Due today', dueDate: addDaysUtc(0), assigneeId: member.id });
  await create({ title: 'Later', dueDate: addDaysUtc(7), priority: 'low' });
  const finished = await create({
    title: 'Finished late',
    dueDate: addDaysUtc(-3),
    status: 'done',
  });
  const old = await create({ title: 'Finished long ago', status: 'done' });
  await t.db
    .update(tasks)
    .set({ completedAt: `${addDaysUtc(-2)}T10:00:00.000Z` })
    .where(eq(tasks.id, finished.id));
  await t.db
    .update(tasks)
    .set({ completedAt: `${addDaysUtc(-40)}T10:00:00.000Z` })
    .where(eq(tasks.id, old.id));
  return { t, owner, member, outsider, admin, project };
}

describe('GET /api/dashboard', () => {
  it('requires authentication', async () => {
    const { t } = await setup();
    expect((await request(t.app).get('/api/dashboard')).status).toBe(401);
  });

  it('computes counts, priorities and the completion chart for the owner', async () => {
    const { t, owner } = await setup();
    const res = await request(t.app).get('/api/dashboard').set(owner.auth);
    expect(res.status).toBe(200);
    expect(res.body.counts).toEqual({ todo: 3, in_progress: 1, done: 2, overdue: 2 });
    expect(res.body.byPriority).toEqual({ low: 1, medium: 2, high: 0, urgent: 1 });
    expect(res.body.completedByDay).toHaveLength(14);
    expect(res.body.completedByDay.at(-1).date).toBe(addDaysUtc(0));
    const total = res.body.completedByDay.reduce(
      (n: number, d: { count: number }) => n + d.count,
      0,
    );
    expect(total).toBe(1);
    expect(
      res.body.completedByDay.find((d: { date: string }) => d.date === addDaysUtc(-2)).count,
    ).toBe(1);
    expect(res.body.overdue.map((x: { title: string }) => x.title)).toEqual([
      'Overdue A',
      'Overdue B',
    ]);
  });

  it("lists only the caller's open tasks under myTasks", async () => {
    const { t, member } = await setup();
    const res = await request(t.app).get('/api/dashboard').set(member.auth);
    expect(res.body.myTasks.map((x: { title: string }) => x.title)).toEqual([
      'Overdue A',
      'Due today',
    ]);
  });

  it('is scoped: outsiders see zeros, admins see everything', async () => {
    const { t, outsider, admin } = await setup();
    const none = await request(t.app).get('/api/dashboard').set(outsider.auth);
    expect(none.body.counts).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    expect(none.body.overdue).toEqual([]);
    expect(none.body.myTasks).toEqual([]);
    const all = await request(t.app).get('/api/dashboard').set(admin.auth);
    expect(all.body.counts.todo).toBe(3);
  });
});

describe('GET /api/search', () => {
  it('finds projects (name or key) and tasks, scoped to what the user can see', async () => {
    const { t, owner, outsider } = await setup();
    const byName = await request(t.app).get('/api/search?q=mobile').set(owner.auth);
    expect(byName.body.projects).toHaveLength(1);
    expect(byName.body.projects[0].key).toBe('MAL');
    const byKey = await request(t.app).get('/api/search?q=mal').set(owner.auth);
    expect(byKey.body.projects).toHaveLength(1);
    const tasks = await request(t.app).get('/api/search?q=overdue').set(owner.auth);
    expect(tasks.body.tasks).toHaveLength(2);
    const hidden = await request(t.app).get('/api/search?q=overdue').set(outsider.auth);
    expect(hidden.body).toEqual({ projects: [], tasks: [] });
  });

  it('returns empty results for an empty query and requires auth', async () => {
    const { t, owner } = await setup();
    expect((await request(t.app).get('/api/search?q=').set(owner.auth)).body).toEqual({
      projects: [],
      tasks: [],
    });
    expect((await request(t.app).get('/api/search')).status).toBe(401);
  });

  it('caps results at 8 per group', async () => {
    const { t, owner, project } = await setup();
    for (let i = 0; i < 10; i++) {
      await request(t.app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(owner.auth)
        .send({ title: `Bulk item ${i}` });
    }
    const res = await request(t.app).get('/api/search?q=bulk').set(owner.auth);
    expect(res.body.tasks).toHaveLength(8);
  });
});
