import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { signupUser } from '../helpers/auth.js';
import { makeTestApp } from '../helpers/testApp.js';

const paths = (res: request.Response) =>
  res.body.error.details.map((d: { path: string }) => d.path);

describe('auth', () => {
  it('signs up, sets an httpOnly cookie and returns a token', async () => {
    const t = await makeTestApp();
    const res = await request(t.app)
      .post('/api/auth/signup')
      .send({ name: 'Ada Lovelace', email: '  ADA@Example.com ', password: 'Passw0rd!' });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      role: 'member',
    });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(typeof res.body.token).toBe('string');
    const cookie = (res.headers['set-cookie'] as unknown as string[])[0]!;
    expect(cookie).toContain('tf_token=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it.each([
    [{ email: 'a@b.dev', password: 'Passw0rd!' }, 'name'],
    [{ name: 'A', password: 'Passw0rd!' }, 'email'],
    [{ name: 'A', email: 'not-an-email', password: 'Passw0rd!' }, 'email'],
    [{ name: 'A', email: 'a@b.dev', password: 'short1' }, 'password'],
    [{ name: 'A', email: 'a@b.dev', password: 'nodigitshere' }, 'password'],
    [{ name: 'A', email: 'a@b.dev', password: '12345678' }, 'password'],
    [{ name: '   ', email: 'a@b.dev', password: 'Passw0rd!' }, 'name'],
  ])('rejects invalid signup %j (field %s)', async (body, field) => {
    const t = await makeTestApp();
    const res = await request(t.app).post('/api/auth/signup').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(paths(res)).toContain(field);
  });

  it('rejects a duplicate email with 409', async () => {
    const t = await makeTestApp();
    await signupUser(t, { email: 'dup@test.dev' });
    const res = await request(t.app)
      .post('/api/auth/signup')
      .send({ name: 'X', email: 'DUP@test.dev', password: 'Passw0rd!' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('logs in with correct credentials', async () => {
    const t = await makeTestApp();
    const u = await signupUser(t);
    const res = await request(t.app)
      .post('/api/auth/login')
      .send({ email: u.email, password: u.password });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(u.id);
  });

  it('returns 401 for a wrong password and unknown email with the same message', async () => {
    const t = await makeTestApp();
    const u = await signupUser(t);
    const wrong = await request(t.app)
      .post('/api/auth/login')
      .send({ email: u.email, password: 'Wrong123!' });
    const unknown = await request(t.app)
      .post('/api/auth/login')
      .send({ email: 'no@one.dev', password: 'Wrong123!' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it('validates login input', async () => {
    const t = await makeTestApp();
    const res = await request(t.app).post('/api/auth/login').send({ email: 'bad', password: '' });
    expect(res.status).toBe(400);
    expect(paths(res)).toEqual(expect.arrayContaining(['email', 'password']));
  });

  it('authenticates with Bearer token and with cookie', async () => {
    const t = await makeTestApp();
    const u = await signupUser(t);
    const bearer = await request(t.app).get('/api/auth/me').set(u.auth);
    expect(bearer.status).toBe(200);
    expect(bearer.body.user.email).toBe(u.email);
    const cookie = await request(t.app).get('/api/auth/me').set('Cookie', `tf_token=${u.token}`);
    expect(cookie.status).toBe(200);
  });

  it('rejects missing, malformed and tampered tokens with 401', async () => {
    const t = await makeTestApp();
    const u = await signupUser(t);
    const me = (h?: string) => {
      const r = request(t.app).get('/api/auth/me');
      return h ? r.set('Authorization', h) : r;
    };
    expect((await me()).status).toBe(401);
    expect((await me('Bearer nope')).status).toBe(401);
    expect((await me(`Bearer ${u.token}x`)).status).toBe(401);
    expect((await me('Bearer ')).status).toBe(401);
  });

  it('rejects a valid token whose user no longer exists', async () => {
    const t = await makeTestApp();
    const u = await signupUser(t);
    await t.client.execute('delete from users');
    expect((await request(t.app).get('/api/auth/me').set(u.auth)).status).toBe(401);
  });

  it('logs out by clearing the cookie', async () => {
    const t = await makeTestApp();
    const res = await request(t.app).post('/api/auth/logout');
    expect(res.status).toBe(204);
    expect((res.headers['set-cookie'] as unknown as string[])[0]).toMatch(/tf_token=;/);
  });

  it('updates the profile name and password', async () => {
    const t = await makeTestApp();
    const u = await signupUser(t);
    const patch = (body: object) => request(t.app).patch('/api/auth/me').set(u.auth).send(body);

    expect((await patch({ name: 'New Name' })).body.user.name).toBe('New Name');
    expect((await patch({ currentPassword: 'Wrong123!', newPassword: 'Newpass123' })).status).toBe(
      400,
    );
    expect((await patch({ newPassword: 'Newpass123' })).status).toBe(400);
    expect((await patch({ currentPassword: u.password, newPassword: 'Newpass123' })).status).toBe(
      200,
    );

    const login = await request(t.app)
      .post('/api/auth/login')
      .send({ email: u.email, password: 'Newpass123' });
    expect(login.status).toBe(200);
  });

  it('rate limits login attempts outside the test environment', async () => {
    const t = await makeTestApp({ NODE_ENV: 'development' });
    let last = 0;
    for (let i = 0; i < 12; i++) {
      const res = await request(t.app)
        .post('/api/auth/login')
        .send({ email: 'a@b.dev', password: 'x' });
      last = res.status;
    }
    expect(last).toBe(429);
  });
});
