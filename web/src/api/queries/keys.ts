import type { TaskFilters } from './tasks';

/** One query-key factory per resource. */
export const qk = {
  me: ['me'] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  members: (id: string) => ['projects', id, 'members'] as const,
  tasksRoot: ['tasks'] as const,
  projectTasks: (id: string, f: TaskFilters) => ['tasks', 'project', id, f] as const,
  allTasks: (f: TaskFilters) => ['tasks', 'all', f] as const,
  task: (id: string) => ['task', id] as const,
  dashboard: ['dashboard'] as const,
  search: (q: string) => ['search', q] as const,
  users: ['users'] as const,
};
