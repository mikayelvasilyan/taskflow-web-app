import { z } from 'zod';
import { PRIORITIES, STATUSES } from '../db/schema.js';
import { dateOnly, reqString } from './common.js';

const title = reqString('Title')
  .trim()
  .min(1, 'Title is required')
  .max(200, 'Title must be at most 200 characters');
const description = z.string().max(10_000, 'Description must be at most 10,000 characters');
const status = z.enum(STATUSES, 'Status must be todo, in_progress or done');
const priority = z.enum(PRIORITIES, 'Priority must be low, medium, high or urgent');

export const createTaskBody = z.object({
  title,
  description: description.optional(),
  status: status.optional(),
  priority: priority.optional(),
  dueDate: dateOnly.nullable().optional(),
  assigneeId: z.string().min(1).nullable().optional(),
  labelIds: z.array(z.string().min(1)).max(20).optional(),
});

export const updateTaskBody = z
  .object({
    title: title.optional(),
    description: description.optional(),
    status: status.optional(),
    priority: priority.optional(),
    dueDate: dateOnly.nullable().optional(),
    assigneeId: z.string().min(1).nullable().optional(),
    labelIds: z.array(z.string().min(1)).max(20).optional(),
    position: z.number().finite().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');

export const SORT_FIELDS = [
  'position',
  'dueDate',
  'priority',
  'status',
  'createdAt',
  'title',
] as const;

export const taskQuery = z.object({
  status: status.optional(),
  priority: priority.optional(),
  assignee: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  q: z.string().trim().max(100).optional(),
  overdue: z.enum(['true', 'false']).optional(),
  sort: z.enum(SORT_FIELDS, `Sort must be one of ${SORT_FIELDS.join(', ')}`).optional(),
  order: z.enum(['asc', 'desc'], 'Order must be asc or desc').optional(),
});

export const commentBody = z.object({
  body: reqString('Comment')
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be at most 2000 characters'),
});

export type TaskQuery = z.infer<typeof taskQuery>;
export type CreateTaskInput = z.infer<typeof createTaskBody>;
export type UpdateTaskInput = z.infer<typeof updateTaskBody>;
