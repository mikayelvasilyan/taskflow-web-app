import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z, type ZodType } from 'zod';
import { PRIORITIES, ROLES, STATUSES } from './db/schema.js';
import { loginBody, signupBody, updateMeBody } from './schemas/auth.js';
import {
  createLabelBody,
  createProjectBody,
  inviteBody,
  updateProjectBody,
} from './schemas/projects.js';
import { commentBody, createTaskBody, taskQuery, updateTaskBody } from './schemas/tasks.js';

extendZodWithOpenApi(z);

// ---------- Shared response schemas ----------
const Person = z
  .object({ id: z.string(), name: z.string(), avatarColor: z.string() })
  .openapi('Person');
const Label = z.object({ id: z.string(), name: z.string(), color: z.string() }).openapi('Label');
const User = z
  .object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.enum(ROLES),
    avatarColor: z.string(),
    isProtected: z.boolean(),
  })
  .openapi('User');
const Status = z.enum(STATUSES);
const Priority = z.enum(PRIORITIES);

const TaskListItem = z
  .object({
    id: z.string(),
    key: z.string().openapi({ example: 'WEB-12' }),
    number: z.number().int(),
    projectId: z.string(),
    title: z.string(),
    status: Status,
    priority: Priority,
    dueDate: z.string().nullable().openapi({ example: '2026-03-14' }),
    position: z.number(),
    assignee: Person.nullable(),
    labels: z.array(Label),
    commentCount: z.number().int(),
    createdAt: z.string(),
    updatedAt: z.string(),
    completedAt: z.string().nullable(),
  })
  .openapi('TaskListItem');

const TaskDetail = TaskListItem.extend({
  description: z.string(),
  createdById: z.string(),
  comments: z.array(
    z.object({
      id: z.string(),
      body: z.string(),
      createdAt: z.string(),
      author: Person.nullable(),
    }),
  ),
  activity: z.array(
    z.object({
      id: z.string(),
      type: z.enum([
        'created',
        'status_changed',
        'priority_changed',
        'assigned',
        'due_changed',
        'renamed',
        'commented',
      ]),
      data: z.record(z.string(), z.unknown()).nullable(),
      createdAt: z.string(),
      actor: Person.nullable(),
    }),
  ),
}).openapi('TaskDetail');

const Project = z
  .object({
    id: z.string(),
    name: z.string(),
    key: z.string().openapi({ example: 'WEB' }),
    description: z.string(),
    color: z.string(),
    ownerId: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('Project');
const Member = User.extend({ joinedAt: z.string() }).openapi('Member');
const Invite = z
  .object({
    id: z.string(),
    projectId: z.string(),
    email: z.string(),
    invitedById: z.string(),
    createdAt: z.string(),
  })
  .openapi('Invite');

const ErrorResponse = z
  .object({
    error: z.object({
      code: z.enum([
        'VALIDATION_ERROR',
        'UNAUTHENTICATED',
        'FORBIDDEN',
        'NOT_FOUND',
        'CONFLICT',
        'RATE_LIMITED',
        'INTERNAL',
      ]),
      message: z.string(),
      details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    }),
  })
  .openapi('ErrorResponse');

// ---------- Registry ----------
export const registry = new OpenAPIRegistry();
registry.registerComponent('securitySchemes', 'bearerAuth', { type: 'http', scheme: 'bearer' });
registry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'tf_token',
});

type Method = 'get' | 'post' | 'patch' | 'delete';
interface RouteDoc {
  method: Method;
  path: string;
  tag: string;
  summary: string;
  auth?: boolean;
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
  /** Success status and optional payload schema. */
  ok: [status: number, schema?: ZodType, description?: string];
  errors?: (400 | 401 | 403 | 404 | 409 | 429)[];
}

const ERROR_TEXT: Record<number, string> = {
  400: 'Validation error',
  401: 'Missing or invalid credentials',
  403: 'Not allowed',
  404: 'Not found',
  409: 'Conflict',
  429: 'Too many attempts',
};

function route(doc: RouteDoc) {
  const auth = doc.auth ?? true;
  const errors = new Set(doc.errors ?? []);
  if (doc.body || doc.query) errors.add(400);
  if (auth) errors.add(401);
  const [status, schema, description] = doc.ok;
  const responses: Record<string, object> = {
    [status]: schema
      ? { description: description ?? 'Success', content: { 'application/json': { schema } } }
      : { description: description ?? 'Success (no content)' },
  };
  for (const code of [...errors].sort()) {
    responses[code] = {
      description: ERROR_TEXT[code],
      content: { 'application/json': { schema: ErrorResponse } },
    };
  }
  registry.registerPath({
    method: doc.method,
    path: doc.path,
    tags: [doc.tag],
    summary: doc.summary,
    security: auth ? [{ bearerAuth: [] }, { cookieAuth: [] }] : [],
    request: {
      ...(doc.params && { params: doc.params as never }),
      ...(doc.query && { query: doc.query as never }),
      ...(doc.body && {
        body: { required: true, content: { 'application/json': { schema: doc.body } } },
      }),
    },
    responses: responses as never,
  });
}

const idParams = z.object({ id: z.string() });
const AuthResult = z.object({ user: User, token: z.string() });

// Health
route({
  method: 'get',
  path: '/api/health',
  tag: 'System',
  summary: 'Health check',
  auth: false,
  ok: [
    200,
    z.object({ status: z.string(), version: z.string(), uptime: z.number(), db: z.string() }),
  ],
});

// Auth
route({
  method: 'post',
  path: '/api/auth/signup',
  tag: 'Auth',
  summary: 'Create an account (sets httpOnly cookie)',
  auth: false,
  body: signupBody,
  ok: [201, AuthResult],
  errors: [409, 429],
});
route({
  method: 'post',
  path: '/api/auth/login',
  tag: 'Auth',
  summary: 'Log in (sets httpOnly cookie)',
  auth: false,
  body: loginBody,
  ok: [200, AuthResult],
  errors: [401, 429],
});
route({
  method: 'post',
  path: '/api/auth/logout',
  tag: 'Auth',
  summary: 'Log out (clears the cookie)',
  auth: false,
  ok: [204],
});
route({
  method: 'get',
  path: '/api/auth/me',
  tag: 'Auth',
  summary: 'Current user',
  ok: [200, z.object({ user: User })],
});
route({
  method: 'patch',
  path: '/api/auth/me',
  tag: 'Auth',
  summary: 'Update profile or password',
  body: updateMeBody,
  ok: [200, z.object({ user: User })],
  errors: [403],
});

// Users (admin)
route({
  method: 'get',
  path: '/api/users',
  tag: 'Users',
  summary: 'List all users (admin)',
  ok: [
    200,
    z.object({
      users: z.array(User.extend({ createdAt: z.string(), projectCount: z.number().int() })),
    }),
  ],
  errors: [403],
});
route({
  method: 'patch',
  path: '/api/users/{id}',
  tag: 'Users',
  summary: 'Change a user role (admin)',
  params: idParams,
  body: z.object({ role: z.enum(ROLES) }),
  ok: [200, z.object({ user: User })],
  errors: [403, 404],
});
route({
  method: 'delete',
  path: '/api/users/{id}',
  tag: 'Users',
  summary: 'Remove a user (admin; not self or protected accounts)',
  params: idParams,
  ok: [204],
  errors: [400, 403, 404],
});

// Projects
route({
  method: 'get',
  path: '/api/projects',
  tag: 'Projects',
  summary: 'List visible projects with counts',
  ok: [
    200,
    z.object({
      projects: z.array(
        Project.extend({
          taskCounts: z.object({ todo: z.number(), in_progress: z.number(), done: z.number() }),
          memberCount: z.number().int(),
        }),
      ),
    }),
  ],
});
route({
  method: 'post',
  path: '/api/projects',
  tag: 'Projects',
  summary: 'Create a project',
  body: createProjectBody,
  ok: [201, z.object({ project: Project })],
});
route({
  method: 'get',
  path: '/api/projects/{id}',
  tag: 'Projects',
  summary: 'Project with members and labels',
  params: idParams,
  ok: [
    200,
    z.object({
      project: Project.extend({
        members: z.array(Member),
        labels: z.array(Label.extend({ projectId: z.string() })),
      }),
    }),
  ],
  errors: [403, 404],
});
route({
  method: 'patch',
  path: '/api/projects/{id}',
  tag: 'Projects',
  summary: 'Rename or edit a project (owner/admin)',
  params: idParams,
  body: updateProjectBody,
  ok: [200, z.object({ project: Project })],
  errors: [403, 404],
});
route({
  method: 'delete',
  path: '/api/projects/{id}',
  tag: 'Projects',
  summary: 'Delete a project (owner/admin)',
  params: idParams,
  ok: [204],
  errors: [403, 404],
});
route({
  method: 'get',
  path: '/api/projects/{id}/members',
  tag: 'Projects',
  summary: 'Members and pending invites',
  params: idParams,
  ok: [200, z.object({ members: z.array(Member), invites: z.array(Invite) })],
  errors: [403, 404],
});
route({
  method: 'post',
  path: '/api/projects/{id}/invites',
  tag: 'Projects',
  summary: 'Invite by email (existing users are added immediately; nothing is emailed)',
  params: idParams,
  body: inviteBody,
  ok: [201, z.object({ member: Member.optional(), invite: Invite.optional() })],
  errors: [403, 404, 409],
});
route({
  method: 'delete',
  path: '/api/projects/{id}/invites/{inviteId}',
  tag: 'Projects',
  summary: 'Revoke a pending invite (owner/admin)',
  params: z.object({ id: z.string(), inviteId: z.string() }),
  ok: [204],
  errors: [403, 404],
});
route({
  method: 'delete',
  path: '/api/projects/{id}/members/{userId}',
  tag: 'Projects',
  summary: 'Remove a member (owner/admin; unassigns their tasks)',
  params: z.object({ id: z.string(), userId: z.string() }),
  ok: [204],
  errors: [400, 403, 404],
});
route({
  method: 'get',
  path: '/api/projects/{id}/labels',
  tag: 'Projects',
  summary: 'List labels',
  params: idParams,
  ok: [200, z.object({ labels: z.array(Label.extend({ projectId: z.string() })) })],
  errors: [403, 404],
});
route({
  method: 'post',
  path: '/api/projects/{id}/labels',
  tag: 'Projects',
  summary: 'Create a label',
  params: idParams,
  body: createLabelBody,
  ok: [201, z.object({ label: Label.extend({ projectId: z.string() }) })],
  errors: [403, 404, 409],
});

// Tasks
route({
  method: 'get',
  path: '/api/projects/{id}/tasks',
  tag: 'Tasks',
  summary: 'List tasks in a project (filter, search, sort)',
  params: idParams,
  query: taskQuery,
  ok: [200, z.object({ tasks: z.array(TaskListItem) })],
  errors: [403, 404],
});
route({
  method: 'post',
  path: '/api/projects/{id}/tasks',
  tag: 'Tasks',
  summary: 'Create a task',
  params: idParams,
  body: createTaskBody,
  ok: [201, z.object({ task: TaskDetail })],
  errors: [403, 404],
});
route({
  method: 'get',
  path: '/api/tasks',
  tag: 'Tasks',
  summary: 'List tasks across visible projects (use assignee=me for My tasks)',
  query: taskQuery,
  ok: [200, z.object({ tasks: z.array(TaskListItem) })],
});
route({
  method: 'get',
  path: '/api/tasks/{id}',
  tag: 'Tasks',
  summary: 'Task with comments and activity',
  params: idParams,
  ok: [200, z.object({ task: TaskDetail })],
  errors: [403, 404],
});
route({
  method: 'patch',
  path: '/api/tasks/{id}',
  tag: 'Tasks',
  summary: 'Update a task (also used for drag-and-drop moves)',
  params: idParams,
  body: updateTaskBody,
  ok: [200, z.object({ task: TaskDetail })],
  errors: [403, 404],
});
route({
  method: 'delete',
  path: '/api/tasks/{id}',
  tag: 'Tasks',
  summary: 'Delete a task',
  params: idParams,
  ok: [204],
  errors: [403, 404],
});
route({
  method: 'post',
  path: '/api/tasks/{id}/comments',
  tag: 'Tasks',
  summary: 'Add a comment',
  params: idParams,
  body: commentBody,
  ok: [
    201,
    z.object({
      comment: z.object({
        id: z.string(),
        body: z.string(),
        createdAt: z.string(),
        author: Person,
      }),
    }),
  ],
  errors: [403, 404],
});
route({
  method: 'delete',
  path: '/api/comments/{id}',
  tag: 'Tasks',
  summary: 'Delete a comment (author or admin)',
  params: idParams,
  ok: [204],
  errors: [403, 404],
});

// Dashboard & search
route({
  method: 'get',
  path: '/api/dashboard',
  tag: 'Dashboard',
  summary: 'Counts, charts data, overdue and my tasks',
  ok: [
    200,
    z.object({
      counts: z.object({
        todo: z.number(),
        in_progress: z.number(),
        done: z.number(),
        overdue: z.number(),
      }),
      byPriority: z.object({
        low: z.number(),
        medium: z.number(),
        high: z.number(),
        urgent: z.number(),
      }),
      completedByDay: z.array(z.object({ date: z.string(), count: z.number() })),
      insights: z.object({
        projectCount: z.number(),
        dueThisWeek: z.number(),
        completedLast7Days: z.number(),
        oldestOverdueDays: z.number().nullable(),
      }),
      overdue: z.array(TaskListItem),
      myTasks: z.array(TaskListItem),
    }),
  ],
});
route({
  method: 'get',
  path: '/api/search',
  tag: 'Dashboard',
  summary: 'Search projects and tasks (command palette)',
  query: z.object({ q: z.string().optional() }),
  ok: [
    200,
    z.object({
      projects: z.array(
        z.object({ id: z.string(), name: z.string(), key: z.string(), color: z.string() }),
      ),
      tasks: z.array(TaskListItem),
    }),
  ],
});

let cached: ReturnType<OpenApiGeneratorV31['generateDocument']> | undefined;

export function buildOpenApiDocument() {
  cached ??= new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'TaskFlow API',
      version: '1.0.0',
      description:
        'REST API for TaskFlow, a task and project tracker (personal portfolio project). ' +
        'Authenticate with the httpOnly `tf_token` cookie or an `Authorization: Bearer <token>` header. ' +
        'Test-only endpoints under `/api/test/*` exist only when `NODE_ENV=test` and are not documented here.',
    },
    servers: [{ url: '/' }],
    tags: ['System', 'Auth', 'Users', 'Projects', 'Tasks', 'Dashboard'].map((name) => ({ name })),
  });
  return cached;
}
