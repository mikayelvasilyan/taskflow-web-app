import { Router } from 'express';
import type { AppContext } from '../app.js';
import { authenticate } from '../middleware/auth.js';
import { idParam } from '../schemas/projects.js';
import { commentBody, createTaskBody, taskQuery, updateTaskBody } from '../schemas/tasks.js';
import { requireProjectAccess, visibleProjectIds } from '../services/permissions.js';
import * as tasks from '../services/tasks.js';

export function tasksRouter(ctx: AppContext) {
  const { db } = ctx;
  const r = Router();
  const auth = authenticate(ctx);
  r.use(['/tasks', '/comments', '/projects/:id/tasks'], auth);

  r.get('/projects/:id/tasks', async (req, res) => {
    const { id } = idParam.parse(req.params);
    const query = taskQuery.parse(req.query);
    await requireProjectAccess(db, req.user!, id);
    const list = await tasks.listTasks(db, { ...query, projectIds: [id], meId: req.user!.id });
    res.json({ tasks: list });
  });

  r.post('/projects/:id/tasks', async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = createTaskBody.parse(req.body);
    res.status(201).json({ task: await tasks.createTask(db, req.user!, id, body) });
  });

  r.get('/tasks', async (req, res) => {
    const query = taskQuery.parse(req.query);
    const projectIds = await visibleProjectIds(db, req.user!);
    const list = await tasks.listTasks(db, { ...query, projectIds, meId: req.user!.id });
    res.json({ tasks: list });
  });

  r.get('/tasks/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    await tasks.getTaskForUser(db, req.user!, id);
    res.json({ task: await tasks.getTaskDetail(db, id) });
  });

  r.patch('/tasks/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = updateTaskBody.parse(req.body);
    res.json({ task: await tasks.updateTask(db, req.user!, id, body) });
  });

  r.delete('/tasks/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    await tasks.deleteTask(db, req.user!, id);
    res.status(204).end();
  });

  r.post('/tasks/:id/comments', async (req, res) => {
    const { id } = idParam.parse(req.params);
    const { body } = commentBody.parse(req.body);
    res.status(201).json({ comment: await tasks.addComment(db, req.user!, id, body) });
  });

  r.delete('/comments/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    await tasks.deleteComment(db, req.user!, id);
    res.status(204).end();
  });

  return r;
}
