import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../app.js';
import { authenticate } from '../middleware/auth.js';
import {
  createLabelBody,
  createProjectBody,
  idParam,
  inviteBody,
  updateProjectBody,
} from '../schemas/projects.js';
import * as labelsSvc from '../services/labels.js';
import { requireProjectAccess, requireProjectManage } from '../services/permissions.js';
import * as projects from '../services/projects.js';

const memberParams = z.object({ id: z.string().min(1), userId: z.string().min(1) });
const inviteParams = z.object({ id: z.string().min(1), inviteId: z.string().min(1) });

export function projectsRouter(ctx: AppContext) {
  const { db } = ctx;
  const r = Router();
  r.use('/projects', authenticate(ctx));

  r.get('/projects', async (req, res) => {
    res.json({ projects: await projects.listProjects(db, req.user!) });
  });

  r.post('/projects', async (req, res) => {
    const body = createProjectBody.parse(req.body);
    res.status(201).json({ project: await projects.createProject(db, req.user!, body) });
  });

  r.get('/projects/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    await requireProjectAccess(db, req.user!, id);
    res.json({ project: await projects.getProjectDetail(db, id) });
  });

  r.patch('/projects/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = updateProjectBody.parse(req.body);
    await requireProjectManage(db, req.user!, id);
    res.json({ project: await projects.updateProject(db, id, body) });
  });

  r.delete('/projects/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    await requireProjectManage(db, req.user!, id);
    await projects.deleteProject(db, id);
    res.status(204).end();
  });

  r.get('/projects/:id/members', async (req, res) => {
    const { id } = idParam.parse(req.params);
    await requireProjectAccess(db, req.user!, id);
    res.json(await projects.listMembers(db, id));
  });

  r.post('/projects/:id/invites', async (req, res) => {
    const { id } = idParam.parse(req.params);
    const { email } = inviteBody.parse(req.body);
    await requireProjectManage(db, req.user!, id);
    res.status(201).json(await projects.inviteMember(db, req.user!, id, email));
  });

  r.delete('/projects/:id/invites/:inviteId', async (req, res) => {
    const { id, inviteId } = inviteParams.parse(req.params);
    await requireProjectManage(db, req.user!, id);
    await projects.deleteInvite(db, id, inviteId);
    res.status(204).end();
  });

  r.delete('/projects/:id/members/:userId', async (req, res) => {
    const { id, userId } = memberParams.parse(req.params);
    await requireProjectManage(db, req.user!, id);
    await projects.removeMember(db, id, userId);
    res.status(204).end();
  });

  r.get('/projects/:id/labels', async (req, res) => {
    const { id } = idParam.parse(req.params);
    await requireProjectAccess(db, req.user!, id);
    res.json({ labels: await labelsSvc.listLabels(db, id) });
  });

  r.post('/projects/:id/labels', async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = createLabelBody.parse(req.body);
    await requireProjectAccess(db, req.user!, id);
    res.status(201).json({ label: await labelsSvc.createLabel(db, id, body) });
  });

  return r;
}
