import type { components } from './schema';

type S = components['schemas'];
export type User = S['User'];
export type Person = S['Person'];
export type Label = S['Label'];
export type Project = S['Project'];
export type Member = S['Member'];
export type Invite = S['Invite'];
export type TaskListItem = S['TaskListItem'];
export type TaskDetail = S['TaskDetail'];
export type Status = TaskListItem['status'];
export type Priority = TaskListItem['priority'];
export type Role = User['role'];

export type ProjectSummary = Project & {
  taskCounts: Record<Status, number>;
  memberCount: number;
};
export type ProjectDetail = Project & {
  members: Member[];
  labels: (Label & { projectId: string })[];
};
export type Dashboard = {
  counts: Record<Status | 'overdue', number>;
  byPriority: Record<Priority, number>;
  completedByDay: { date: string; count: number }[];
  overdue: TaskListItem[];
  myTasks: TaskListItem[];
};

export interface FieldIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: FieldIssue[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error?.code ?? 'UNKNOWN',
      data?.error?.message ?? res.statusText,
      data?.error?.details ?? [],
    );
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: (path: string) => request<void>('DELETE', path),
};

export function toQueryString(params: Record<string, string | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || v === false) continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;
