import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { projectMembers, projects } from '../db/schema.js';
import { forbidden, notFound } from '../lib/errors.js';
import type { AuthUser } from '../types/express.js';

type ProjectRow = typeof projects.$inferSelect;

export const isAdmin = (user: AuthUser) => user.role === 'admin';

/** Owner or admin may rename/delete a project and manage its members. */
export const canManageProject = (user: AuthUser, project: Pick<ProjectRow, 'ownerId'>) =>
  isAdmin(user) || project.ownerId === user.id;

export async function isProjectMember(db: Db, projectId: string, userId: string) {
  const [row] = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
  return !!row;
}

export async function getProjectOrThrow(db: Db, projectId: string): Promise<ProjectRow> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) throw notFound('Project');
  return project;
}

/** 404 if the project does not exist, 403 if the user may not see it. */
export async function requireProjectAccess(db: Db, user: AuthUser, projectId: string) {
  const project = await getProjectOrThrow(db, projectId);
  if (!isAdmin(user) && !(await isProjectMember(db, projectId, user.id))) {
    throw forbidden('You are not a member of this project');
  }
  return project;
}

export async function requireProjectManage(db: Db, user: AuthUser, projectId: string) {
  const project = await requireProjectAccess(db, user, projectId);
  if (!canManageProject(user, project)) {
    throw forbidden('Only the project owner or an admin can do this');
  }
  return project;
}

/** Ids of projects the user can see; `null` means all (admin). */
export async function visibleProjectIds(db: Db, user: AuthUser): Promise<string[] | null> {
  if (isAdmin(user)) return null;
  const rows = await db
    .select({ id: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, user.id));
  return rows.map((r) => r.id);
}
