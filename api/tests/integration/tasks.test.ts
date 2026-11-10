import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { addDaysUtc } from '../../src/lib/dates.js';
import { signupUser } from '../helpers/auth.js';
import { makeTestApp } from '../helpers/testApp.js';

async function setup() {
  const t = await makeTestApp();
  const owner = await signupUser(t, { name: 'Olive Owner' });
  const member = await signupUser(t, { name: 'Mia Member' });
  const outsider = await signupUser(t);
  const admin = await signupUser(t, { role: 'admin' });
  const { project } = (
    await request(t.app).post('/api/projects').set(owner.auth).send({ name: 'Website Redesign' })
  ).body;
  await request(t.app)
    .post(`/api/projects/${project.id}/invites`)
    .set(owner.auth)
    .send({ email: member.email });
  const bug = (
    await request(t.app)
      .post(`/api/projects/${project.id}/labels`)
      .set(owner.auth)
      .send({ name: 'bug', color: '#DC2626' })
  ).body.label;
  const base = `/api/projects/${project.id}/tasks`;
  const create = async (body: object, as = owner) =>
    (await request(t.app).post(base).set(as.auth).send(body)).body.task;
  return { t, owner, member, outsider, admin, project, bug, base, create };
}

describe('task creation', () => {
  it('creates a task with defaults, key, and a "created" activity entry', async () => {
    const { create } = await setup();
    const task = await create({ title: 'Audit landing page copy' });
    expect(task).toMatchObject({
      key: 'WR-1',
      number: 1,
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      assignee: null,
      labels: [],
      commentCount: 0,
      completedAt: null,
    });
    expect(task.activity.map((a: { type: string }) => a.type)).toEqual(['created']);
  });

  it('numbers tasks per project and places new tasks at the end of their column', async () => {
    const { create, t, owner, base } = await setup();
    const a = await create({ title: 'A' });
    const b = await create({ title: 'B' });
    const c = await create({ title: 'C', status: 'done' });
    expect([a.number, b.number, c.number]).toEqual([1, 2, 3]);
    expect(b.position).toBeGreaterThan(a.position);
    expect(c.completedAt).not.toBeNull();
    const other = (
      await request(t.app).post('/api/projects').set(owner.auth).send({ name: 'Other' })
    ).body.project;
    const first = (
      await request(t.app)
        .post(`/api/projects/${other.id}/tasks`)
        .set(owner.auth)
        .send({ title: 'First' })
    ).body.task;
    expect(first.number).toBe(1);
    expect((await request(t.app).get(base).set(owner.auth)).body.tasks).toHaveLength(3);
  });

  it('accepts all optional fields, labels and an assignee who is a member', async () => {
    const { create, member, bug } = await setup();
    const task = await create({
      title: 'Fix checkout button',
      description: '## Steps\n1. open checkout',
      priority: 'urgent',
      dueDate: '2030-01-31',
      assigneeId: member.id,
      labelIds: [bug.id],
    });
    expect(task.assignee).toMatchObject({ id: member.id, name: 'Mia Member' });
    expect(task.labels).toEqual([{ id: bug.id, name: 'bug', color: '#DC2626' }]);
    expect(task.description).toContain('Steps');
  });

  it.each([
    [{}, 'title'],
    [{ title: '' }, 'title'],
    [{ title: 'x'.repeat(201) }, 'title'],
    [{ title: 'ok', status: 'blocked' }, 'status'],
    [{ title: 'ok', priority: 'critical' }, 'priority'],
    [{ title: 'ok', dueDate: '31/01/2030' }, 'dueDate'],
    [{ title: 'ok', dueDate: '2030-13-45' }, 'dueDate'],
    [{ title: 'ok', labelIds: 'bug' }, 'labelIds'],
  ])('rejects invalid create %j', async (body, field) => {
    const { t, owner, base } = await setup();
    const res = await request(t.app).post(base).set(owner.auth).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toContain(field);
  });

  it('rejects an assignee outside the project and unknown labels', async () => {
    const { t, owner, outsider, base } = await setup();
    const a = await request(t.app)
      .post(base)
      .set(owner.auth)
      .send({ title: 'x', assigneeId: outsider.id });
    expect(a.status).toBe(400);
    expect(a.body.error.details[0].path).toBe('assigneeId');
    const l = await request(t.app)
      .post(base)
      .set(owner.auth)
      .send({ title: 'x', labelIds: ['nope'] });
    expect(l.status).toBe(400);
  });

  it('enforces authentication and project access (401 / 403 / 404)', async () => {
    const { t, outsider, admin, base } = await setup();
    expect((await request(t.app).post(base).send({ title: 'x' })).status).toBe(401);
    expect((await request(t.app).get(base)).status).toBe(401);
    expect((await request(t.app).post(base).set(outsider.auth).send({ title: 'x' })).status).toBe(
      403,
    );
    expect((await request(t.app).get(base).set(outsider.auth)).status).toBe(403);
    expect((await request(t.app).get('/api/projects/missing/tasks').set(admin.auth)).status).toBe(
      404,
    );
    expect(
      (await request(t.app).post(base).set(admin.auth).send({ title: 'by admin' })).status,
    ).toBe(201);
  });
});

describe('task filters, search and sorting', () => {
  async function seeded() {
    const s = await setup();
    const today = addDaysUtc(0);
    await s.create({
      title: 'Alpha design',
      priority: 'low',
      dueDate: addDaysUtc(-3),
      assigneeId: s.member.id,
    });
    await s.create({
      title: 'Bravo build',
      priority: 'urgent',
      status: 'in_progress',
      dueDate: addDaysUtc(2),
    });
    await s.create({
      title: 'Charlie 100% done_ok',
      priority: 'high',
      status: 'done',
      dueDate: addDaysUtc(-9),
      labelIds: [s.bug.id],
    });
    await s.create({
      title: 'Delta',
      priority: 'medium',
      description: 'mentions ALPHA inside',
      assigneeId: s.member.id,
    });
    await s.create({ title: 'Echo due today', dueDate: today });
    const list = async (qs: string, as = s.owner) =>
      (await request(s.t.app).get(`${s.base}?${qs}`).set(as.auth)).body.tasks as {
        title: string;
      }[];
    const titles = async (qs: string, as = s.owner) => (await list(qs, as)).map((x) => x.title);
    return { ...s, titles, list };
  }

  it('filters by status and priority', async () => {
    const { titles } = await seeded();
    expect(await titles('status=in_progress')).toEqual(['Bravo build']);
    expect(await titles('priority=high')).toEqual(['Charlie 100% done_ok']);
    expect(await titles('status=todo&priority=low')).toEqual(['Alpha design']);
  });

  it('filters by assignee: id, me, none', async () => {
    const { titles, member } = await seeded();
    expect(await titles(`assignee=${member.id}`)).toEqual(['Alpha design', 'Delta']);
    expect(await titles('assignee=me', member)).toEqual(['Alpha design', 'Delta']);
    expect(await titles('assignee=none')).toEqual([
      'Bravo build',
      'Charlie 100% done_ok',
      'Echo due today',
    ]);
  });

  it('filters by label', async () => {
    const { titles, bug } = await seeded();
    expect(await titles(`label=${bug.id}`)).toEqual(['Charlie 100% done_ok']);
  });

  it('searches title and description case-insensitively and escapes wildcards', async () => {
    const { titles } = await seeded();
    expect(await titles('q=alpha')).toEqual(['Alpha design', 'Delta']);
    expect(await titles('q=100%25')).toEqual(['Charlie 100% done_ok']);
    expect(await titles('q=done_ok')).toEqual(['Charlie 100% done_ok']);
    expect(await titles('q=%25')).toEqual(['Charlie 100% done_ok']);
    expect(await titles('q=nothing-matches')).toEqual([]);
  });

  it('overdue means due before today and not done', async () => {
    const { titles } = await seeded();
    expect(await titles('overdue=true')).toEqual(['Alpha design']);
    expect((await titles('overdue=false')).length).toBe(5);
  });

  it('sorts by due date with empty dates last, in both directions', async () => {
    const { titles } = await seeded();
    expect(await titles('sort=dueDate')).toEqual([
      'Charlie 100% done_ok',
      'Alpha design',
      'Echo due today',
      'Bravo build',
      'Delta',
    ]);
    expect(await titles('sort=dueDate&order=desc')).toEqual([
      'Bravo build',
      'Echo due today',
      'Alpha design',
      'Charlie 100% done_ok',
      'Delta',
    ]);
  });

  it('sorts by priority, title and creation time', async () => {
    const { titles } = await seeded();
    expect(await titles('sort=priority&order=desc')).toEqual([
      'Bravo build',
      'Charlie 100% done_ok',
      'Delta',
      'Echo due today',
      'Alpha design',
    ]);
    expect((await titles('sort=title'))[0]).toBe('Alpha design');
    expect((await titles('sort=title&order=desc'))[0]).toBe('Echo due today');
    expect((await titles('sort=createdAt&order=desc'))[0]).toBe('Echo due today');
  });

  it('sorts by workflow status, then board position', async () => {
    const { titles } = await seeded();
    expect(await titles('sort=status')).toEqual([
      'Alpha design',
      'Delta',
      'Echo due today',
      'Bravo build',
      'Charlie 100% done_ok',
    ]);
    expect(await titles('sort=status&order=desc')).toEqual([
      'Charlie 100% done_ok',
      'Bravo build',
      'Alpha design',
      'Delta',
      'Echo due today',
    ]);
  });

  it('defaults to board position order', async () => {
    const { titles } = await seeded();
    expect((await titles('')).length).toBe(5);
  });

  it.each(['status=blocked', 'priority=x', 'sort=colour', 'order=up', 'overdue=maybe'])(
    'rejects invalid query %s',
    async (qs) => {
      const { t, owner, base } = await setup();
      const res = await request(t.app).get(`${base}?${qs}`).set(owner.auth);
      expect(res.status).toBe(400);
    },
  );

  it('GET /api/tasks returns only tasks from visible projects', async () => {
    const { t, owner, member, outsider, admin, create } = await seeded();
    const mine = await request(t.app).get('/api/tasks').set(owner.auth);
    expect(mine.body.tasks).toHaveLength(5);
    expect((await request(t.app).get('/api/tasks').set(member.auth)).body.tasks).toHaveLength(5);
    expect((await request(t.app).get('/api/tasks').set(outsider.auth)).body.tasks).toHaveLength(0);
    expect((await request(t.app).get('/api/tasks').set(admin.auth)).body.tasks).toHaveLength(5);
    await create({ title: 'extra' });
    const assigned = await request(t.app).get('/api/tasks?assignee=me').set(member.auth);
    expect(assigned.body.tasks).toHaveLength(2);
  });
});

describe('task updates', () => {
  it('updates fields and records activity entries', async () => {
    const { t, create, member, owner } = await setup();
    const task = await create({ title: 'Original' });
    const res = await request(t.app).patch(`/api/tasks/${task.id}`).set(member.auth).send({
      title: 'Renamed',
      priority: 'high',
      dueDate: '2030-05-05',
      assigneeId: owner.id,
      description: 'More detail',
    });
    expect(res.status).toBe(200);
    const types = res.body.task.activity.map((a: { type: string }) => a.type);
    expect(types).toEqual(
      expect.arrayContaining(['created', 'renamed', 'priority_changed', 'due_changed', 'assigned']),
    );
    const assigned = res.body.task.activity.find((a: { type: string }) => a.type === 'assigned');
    expect(assigned.data).toEqual({ from: null, to: 'Olive Owner' });
    expect(assigned.actor.id).toBe(member.id);
    expect(res.body.task.description).toBe('More detail');
  });

  it('does not log activity or bump updatedAt when nothing changes', async () => {
    const { t, create, owner } = await setup();
    const task = await create({ title: 'Same' });
    const res = await request(t.app)
      .patch(`/api/tasks/${task.id}`)
      .set(owner.auth)
      .send({ title: 'Same' });
    expect(res.body.task.activity).toHaveLength(1);
    expect(res.body.task.updatedAt).toBe(task.updatedAt);
  });

  it('sets and clears completedAt when status changes and moves the task to the column end', async () => {
    const { t, create, owner } = await setup();
    const a = await create({ title: 'A', status: 'done' });
    const b = await create({ title: 'B' });
    const done = await request(t.app)
      .patch(`/api/tasks/${b.id}`)
      .set(owner.auth)
      .send({ status: 'done' });
    expect(done.body.task.completedAt).not.toBeNull();
    expect(done.body.task.position).toBeGreaterThan(a.position);
    const reopened = await request(t.app)
      .patch(`/api/tasks/${b.id}`)
      .set(owner.auth)
      .send({ status: 'todo' });
    expect(reopened.body.task.completedAt).toBeNull();
    const log = reopened.body.task.activity.filter(
      (x: { type: string }) => x.type === 'status_changed',
    );
    expect(log).toHaveLength(2);
    expect(log[0].data).toEqual({ from: 'done', to: 'todo' });
  });

  it('honours an explicit position when moving between columns', async () => {
    const { t, create, owner } = await setup();
    const a = await create({ title: 'A', status: 'in_progress' });
    const b = await create({ title: 'B' });
    const res = await request(t.app)
      .patch(`/api/tasks/${b.id}`)
      .set(owner.auth)
      .send({ status: 'in_progress', position: a.position - 10 });
    expect(res.body.task.position).toBe(a.position - 10);
    const list = (
      await request(t.app)
        .get(`/api/projects/${a.projectId}/tasks?status=in_progress`)
        .set(owner.auth)
    ).body.tasks;
    expect(list.map((x: { title: string }) => x.title)).toEqual(['B', 'A']);
  });

  it('replaces labels, clears assignee and due date', async () => {
    const { t, create, owner, member, bug } = await setup();
    const task = await create({
      title: 'T',
      assigneeId: member.id,
      dueDate: '2030-01-01',
      labelIds: [bug.id],
    });
    const res = await request(t.app)
      .patch(`/api/tasks/${task.id}`)
      .set(owner.auth)
      .send({ assigneeId: null, dueDate: null, labelIds: [] });
    expect(res.body.task).toMatchObject({ assignee: null, dueDate: null, labels: [] });
  });

  it('validates updates and enforces access', async () => {
    const { t, create, owner, outsider, admin, member } = await setup();
    const task = await create({ title: 'T' });
    const url = `/api/tasks/${task.id}`;
    expect((await request(t.app).patch(url).set(owner.auth).send({})).status).toBe(400);
    expect((await request(t.app).patch(url).set(owner.auth).send({ status: 'x' })).status).toBe(
      400,
    );
    expect(
      (await request(t.app).patch(url).set(owner.auth).send({ assigneeId: outsider.id })).status,
    ).toBe(400);
    expect((await request(t.app).patch(url).send({ title: 'x' })).status).toBe(401);
    expect((await request(t.app).patch(url).set(outsider.auth).send({ title: 'x' })).status).toBe(
      403,
    );
    expect(
      (await request(t.app).patch('/api/tasks/missing').set(owner.auth).send({ title: 'x' }))
        .status,
    ).toBe(404);
    expect((await request(t.app).patch(url).set(admin.auth).send({ title: 'admin' })).status).toBe(
      200,
    );
    expect(
      (await request(t.app).patch(url).set(member.auth).send({ title: 'member' })).status,
    ).toBe(200);
  });

  it('fetches and deletes a task', async () => {
    const { t, create, owner, outsider } = await setup();
    const task = await create({ title: 'T' });
    const url = `/api/tasks/${task.id}`;
    expect((await request(t.app).get(url).set(owner.auth)).body.task.id).toBe(task.id);
    expect((await request(t.app).get(url).set(outsider.auth)).status).toBe(403);
    expect((await request(t.app).get('/api/tasks/missing').set(owner.auth)).status).toBe(404);
    expect((await request(t.app).delete(url).set(outsider.auth)).status).toBe(403);
    expect((await request(t.app).delete(url).set(owner.auth)).status).toBe(204);
    expect((await request(t.app).get(url).set(owner.auth)).status).toBe(404);
  });
});

describe('comments', () => {
  it('adds comments, counts them, logs activity and orders oldest first', async () => {
    const { t, create, owner, member } = await setup();
    const task = await create({ title: 'T' });
    const url = `/api/tasks/${task.id}/comments`;
    const c1 = await request(t.app).post(url).set(owner.auth).send({ body: 'First' });
    expect(c1.status).toBe(201);
    await request(t.app).post(url).set(member.auth).send({ body: 'Second' });
    const detail = (await request(t.app).get(`/api/tasks/${task.id}`).set(owner.auth)).body.task;
    expect(detail.commentCount).toBe(2);
    expect(detail.comments.map((c: { body: string }) => c.body)).toEqual(['First', 'Second']);
    expect(detail.activity.filter((a: { type: string }) => a.type === 'commented')).toHaveLength(2);
  });

  it('validates the body and requires access', async () => {
    const { t, create, owner, outsider } = await setup();
    const task = await create({ title: 'T' });
    const url = `/api/tasks/${task.id}/comments`;
    expect((await request(t.app).post(url).set(owner.auth).send({ body: '  ' })).status).toBe(400);
    expect((await request(t.app).post(url).set(owner.auth).send({})).status).toBe(400);
    expect((await request(t.app).post(url).set(outsider.auth).send({ body: 'hi' })).status).toBe(
      403,
    );
    expect((await request(t.app).post(url).send({ body: 'hi' })).status).toBe(401);
  });

  it('lets the author or an admin delete a comment, not other members', async () => {
    const { t, create, owner, member, admin } = await setup();
    const task = await create({ title: 'T' });
    const post = async (as: typeof owner) =>
      (await request(t.app).post(`/api/tasks/${task.id}/comments`).set(as.auth).send({ body: 'x' }))
        .body.comment.id;
    const own = await post(member);
    expect((await request(t.app).delete(`/api/comments/${own}`).set(owner.auth)).status).toBe(403);
    expect((await request(t.app).delete(`/api/comments/${own}`).set(member.auth)).status).toBe(204);
    const other = await post(member);
    expect((await request(t.app).delete(`/api/comments/${other}`).set(admin.auth)).status).toBe(
      204,
    );
    expect((await request(t.app).delete('/api/comments/missing').set(owner.auth)).status).toBe(404);
  });
});
