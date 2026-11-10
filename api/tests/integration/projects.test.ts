import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { keyCandidates } from '../../src/services/projects.js';
import { signupUser } from '../helpers/auth.js';
import { makeTestApp } from '../helpers/testApp.js';

async function setup() {
  const t = await makeTestApp();
  const owner = await signupUser(t);
  const member = await signupUser(t);
  const outsider = await signupUser(t);
  const admin = await signupUser(t, { role: 'admin' });
  const created = await request(t.app)
    .post('/api/projects')
    .set(owner.auth)
    .send({ name: 'Website Redesign' });
  const project = created.body.project as { id: string; key: string; ownerId: string };
  await request(t.app)
    .post(`/api/projects/${project.id}/invites`)
    .set(owner.auth)
    .send({ email: member.email });
  return { t, owner, member, outsider, admin, project };
}

describe('projects', () => {
  it('creates a project with a derived key and the creator as member', async () => {
    const { t, owner, project } = await setup();
    expect(project.key).toBe('WR');
    expect(project.ownerId).toBe(owner.id);
    const res = await request(t.app).get(`/api/projects/${project.id}`).set(owner.auth);
    expect(res.body.project.members.map((m: { id: string }) => m.id)).toContain(owner.id);
  });

  it('generates unique keys for similar names', async () => {
    const { t, owner } = await setup();
    const keys = new Set<string>();
    for (const name of ['Website Redesign', 'Website Redesign', 'Web Review', 'Wild Roses']) {
      const res = await request(t.app).post('/api/projects').set(owner.auth).send({ name });
      expect(res.status).toBe(201);
      expect(res.body.project.key).toMatch(/^[A-Z]{2,4}$/);
      keys.add(res.body.project.key);
    }
    expect(keys.size).toBe(4);
  });

  it('derives sensible key candidates', () => {
    expect(keyCandidates('Mobile App Launch')[0]).toBe('MAL');
    expect(keyCandidates('Q1 Marketing Campaign')[0]).toBe('QMC');
    expect(keyCandidates('Hello')[0]).toBe('HEL');
    expect(keyCandidates('12345')[0]).toHaveLength(2);
  });

  it.each([
    [{}, 'name'],
    [{ name: '' }, 'name'],
    [{ name: 'x'.repeat(61) }, 'name'],
    [{ name: 'OK', color: 'red' }, 'color'],
    [{ name: 'OK', description: 'x'.repeat(501) }, 'description'],
  ])('rejects invalid create %j', async (body, field) => {
    const { t, owner } = await setup();
    const res = await request(t.app).post('/api/projects').set(owner.auth).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toContain(field);
  });

  it('requires authentication', async () => {
    const { t, project } = await setup();
    expect((await request(t.app).get('/api/projects')).status).toBe(401);
    expect((await request(t.app).get(`/api/projects/${project.id}`)).status).toBe(401);
  });

  it('scopes the list: members see theirs, outsiders none, admins all', async () => {
    const { t, owner, member, outsider, admin } = await setup();
    const names = async (u: { auth: Record<string, string> }) =>
      (await request(t.app).get('/api/projects').set(u.auth)).body.projects.length;
    expect(await names(owner)).toBe(1);
    expect(await names(member)).toBe(1);
    expect(await names(outsider)).toBe(0);
    expect(await names(admin)).toBe(1);
    const list = await request(t.app).get('/api/projects').set(owner.auth);
    expect(list.body.projects[0]).toMatchObject({
      memberCount: 2,
      taskCounts: { todo: 0, in_progress: 0, done: 0 },
    });
  });

  it('403 for outsiders, 404 for unknown, 200 for members and admins', async () => {
    const { t, member, outsider, admin, project } = await setup();
    expect(
      (await request(t.app).get(`/api/projects/${project.id}`).set(outsider.auth)).status,
    ).toBe(403);
    expect((await request(t.app).get('/api/projects/missing').set(admin.auth)).status).toBe(404);
    expect((await request(t.app).get(`/api/projects/${project.id}`).set(member.auth)).status).toBe(
      200,
    );
    expect((await request(t.app).get(`/api/projects/${project.id}`).set(admin.auth)).status).toBe(
      200,
    );
  });

  it('lets only the owner or an admin rename and delete', async () => {
    const { t, owner, member, admin, project } = await setup();
    const url = `/api/projects/${project.id}`;
    expect((await request(t.app).patch(url).set(member.auth).send({ name: 'Nope' })).status).toBe(
      403,
    );
    expect((await request(t.app).delete(url).set(member.auth)).status).toBe(403);
    expect((await request(t.app).patch(url).set(owner.auth).send({})).status).toBe(400);

    const renamed = await request(t.app).patch(url).set(owner.auth).send({ name: 'Renamed' });
    expect(renamed.body.project.name).toBe('Renamed');
    expect(
      (await request(t.app).patch(url).set(admin.auth).send({ description: 'By admin' })).status,
    ).toBe(200);

    expect((await request(t.app).delete(url).set(admin.auth)).status).toBe(204);
    expect((await request(t.app).get(url).set(owner.auth)).status).toBe(404);
  });
});

describe('members and invites', () => {
  it('adds an existing user immediately and stores an invite for unknown emails', async () => {
    const { t, owner, project } = await setup();
    const base = `/api/projects/${project.id}`;
    const other = await signupUser(t);
    const added = await request(t.app)
      .post(`${base}/invites`)
      .set(owner.auth)
      .send({ email: other.email });
    expect(added.status).toBe(201);
    expect(added.body.member.id).toBe(other.id);

    const invited = await request(t.app)
      .post(`${base}/invites`)
      .set(owner.auth)
      .send({ email: 'Future@Person.dev' });
    expect(invited.status).toBe(201);
    expect(invited.body.invite.email).toBe('future@person.dev');

    const list = await request(t.app).get(`${base}/members`).set(owner.auth);
    expect(list.body.members).toHaveLength(3);
    expect(list.body.invites).toHaveLength(1);
  });

  it('rejects duplicate invites and duplicate members with 409', async () => {
    const { t, owner, member, project } = await setup();
    const url = `/api/projects/${project.id}/invites`;
    expect(
      (await request(t.app).post(url).set(owner.auth).send({ email: member.email })).status,
    ).toBe(409);
    await request(t.app).post(url).set(owner.auth).send({ email: 'x@y.dev' });
    expect((await request(t.app).post(url).set(owner.auth).send({ email: 'x@y.dev' })).status).toBe(
      409,
    );
    expect((await request(t.app).post(url).set(owner.auth).send({ email: 'bad' })).status).toBe(
      400,
    );
  });

  it('applies a pending invite when the invited person signs up', async () => {
    const { t, owner, project } = await setup();
    await request(t.app)
      .post(`/api/projects/${project.id}/invites`)
      .set(owner.auth)
      .send({ email: 'newbie@test.dev' });
    const newbie = await signupUser(t, { email: 'newbie@test.dev' });
    const res = await request(t.app).get(`/api/projects/${project.id}`).set(newbie.auth);
    expect(res.status).toBe(200);
    const members = await request(t.app).get(`/api/projects/${project.id}/members`).set(owner.auth);
    expect(members.body.invites).toHaveLength(0);
  });

  it('only owner/admin can invite, remove, or revoke; members can view', async () => {
    const { t, owner, member, outsider, project } = await setup();
    const base = `/api/projects/${project.id}`;
    expect(
      (await request(t.app).post(`${base}/invites`).set(member.auth).send({ email: 'a@b.dev' }))
        .status,
    ).toBe(403);
    expect(
      (await request(t.app).delete(`${base}/members/${owner.id}`).set(member.auth)).status,
    ).toBe(403);
    expect((await request(t.app).get(`${base}/members`).set(member.auth)).status).toBe(200);
    expect((await request(t.app).get(`${base}/members`).set(outsider.auth)).status).toBe(403);

    const inv = await request(t.app)
      .post(`${base}/invites`)
      .set(owner.auth)
      .send({ email: 'a@b.dev' });
    const id = inv.body.invite.id;
    expect((await request(t.app).delete(`${base}/invites/${id}`).set(member.auth)).status).toBe(
      403,
    );
    expect((await request(t.app).delete(`${base}/invites/${id}`).set(owner.auth)).status).toBe(204);
    expect((await request(t.app).delete(`${base}/invites/${id}`).set(owner.auth)).status).toBe(404);
  });

  it('removes a member (not the owner) and unassigns their tasks', async () => {
    const { t, owner, member, project } = await setup();
    const base = `/api/projects/${project.id}`;
    expect(
      (await request(t.app).delete(`${base}/members/${owner.id}`).set(owner.auth)).status,
    ).toBe(400);
    expect((await request(t.app).delete(`${base}/members/nope`).set(owner.auth)).status).toBe(404);
    expect(
      (await request(t.app).delete(`${base}/members/${member.id}`).set(owner.auth)).status,
    ).toBe(204);
    expect((await request(t.app).get(base).set(member.auth)).status).toBe(403);
  });

  it('manages project labels', async () => {
    const { t, owner, outsider, project } = await setup();
    const url = `/api/projects/${project.id}/labels`;
    const created = await request(t.app)
      .post(url)
      .set(owner.auth)
      .send({ name: 'bug', color: '#DC2626' });
    expect(created.status).toBe(201);
    expect(
      (await request(t.app).post(url).set(owner.auth).send({ name: 'BUG', color: '#DC2626' }))
        .status,
    ).toBe(409);
    expect(
      (await request(t.app).post(url).set(owner.auth).send({ name: '', color: 'x' })).status,
    ).toBe(400);
    expect((await request(t.app).get(url).set(owner.auth)).body.labels).toHaveLength(1);
    expect((await request(t.app).get(url).set(outsider.auth)).status).toBe(403);
  });
});
