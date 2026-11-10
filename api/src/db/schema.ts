import { sqliteTable, text, integer, real, primaryKey, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const ROLES = ['admin', 'member'] as const;
export const STATUSES = ['todo', 'in_progress', 'done'] as const;
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const ACTIVITY_TYPES = [
  'created',
  'status_changed',
  'priority_changed',
  'assigned',
  'due_changed',
  'renamed',
  'commented',
] as const;

export type Role = (typeof ROLES)[number];
export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ROLES }).notNull().default('member'),
  avatarColor: text('avatar_color').notNull(),
  isProtected: integer('is_protected', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    key: text('key').notNull(),
    description: text('description').notNull().default(''),
    color: text('color').notNull(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [uniqueIndex('projects_key_idx').on(t.key)],
);

export const projectMembers = sqliteTable(
  'project_members',
  {
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);

export const invites = sqliteTable(
  'invites',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    invitedById: text('invited_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
  },
  (t) => [uniqueIndex('invites_project_email_idx').on(t.projectId, t.email)],
);

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    status: text('status', { enum: STATUSES }).notNull().default('todo'),
    priority: text('priority', { enum: PRIORITIES }).notNull().default('medium'),
    dueDate: text('due_date'),
    assigneeId: text('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    position: real('position').notNull(),
    createdById: text('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    completedAt: text('completed_at'),
  },
  (t) => [
    uniqueIndex('tasks_project_number_idx').on(t.projectId, t.number),
    index('tasks_project_status_idx').on(t.projectId, t.status),
    index('tasks_assignee_idx').on(t.assigneeId),
  ],
);

export const labels = sqliteTable('labels', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull(),
});

export const taskLabels = sqliteTable(
  'task_labels',
  {
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    labelId: text('label_id')
      .notNull()
      .references(() => labels.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.labelId] })],
);

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  createdAt: text('created_at').notNull(),
});

export const activity = sqliteTable('activity', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  actorId: text('actor_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ACTIVITY_TYPES }).notNull(),
  data: text('data', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').notNull(),
});
