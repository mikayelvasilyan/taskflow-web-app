import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { projects, users } from '../../src/db/schema.js';
import { makeTestApp } from '../helpers/testApp.js';

const now = new Date().toISOString();

describe('database', () => {
  it('applies migrations and enforces unique emails', async () => {
    const { db } = await makeTestApp();
    const row = {
      id: 'u1',
      email: 'a@x.dev',
      name: 'A',
      passwordHash: 'h',
      avatarColor: '#000',
      createdAt: now,
    };
    await db.insert(users).values(row);
    await expect(db.insert(users).values({ ...row, id: 'u2' })).rejects.toThrow();
  });

  it('cascades deletes from users to their projects', async () => {
    const { db } = await makeTestApp();
    await db.insert(users).values({
      id: 'u1',
      email: 'a@x.dev',
      name: 'A',
      passwordHash: 'h',
      avatarColor: '#000',
      createdAt: now,
    });
    await db.insert(projects).values({
      id: 'p1',
      name: 'P',
      key: 'PRJ',
      color: '#111',
      ownerId: 'u1',
      createdAt: now,
      updatedAt: now,
    });
    await db.delete(users).where(eq(users.id, 'u1'));
    expect(await db.select().from(projects)).toHaveLength(0);
  });
});
