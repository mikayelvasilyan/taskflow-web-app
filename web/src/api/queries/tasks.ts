import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  toQueryString,
  type Priority,
  type Status,
  type TaskDetail,
  type TaskListItem,
} from '../client';
import { qk } from './keys';

export interface TaskFilters {
  status?: Status;
  priority?: Priority;
  assignee?: string;
  label?: string;
  q?: string;
  overdue?: boolean;
  sort?: 'position' | 'dueDate' | 'priority' | 'status' | 'createdAt' | 'title';
  order?: 'asc' | 'desc';
}

const query = (f: TaskFilters) =>
  toQueryString({ ...f, overdue: f.overdue ? 'true' : undefined } as Record<
    string,
    string | undefined
  >);

export function useProjectTasks(projectId: string, filters: TaskFilters = {}) {
  return useQuery({
    queryKey: qk.projectTasks(projectId, filters),
    queryFn: async () =>
      (await api.get<{ tasks: TaskListItem[] }>(`/projects/${projectId}/tasks${query(filters)}`))
        .tasks,
    placeholderData: keepPreviousData,
  });
}

export function useAllTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: qk.allTasks(filters),
    queryFn: async () =>
      (await api.get<{ tasks: TaskListItem[] }>(`/tasks${query(filters)}`)).tasks,
  });
}

export function useTask(id: string | null) {
  return useQuery({
    queryKey: qk.task(id ?? ''),
    enabled: !!id,
    queryFn: async () => (await api.get<{ task: TaskDetail }>(`/tasks/${id}`)).task,
  });
}

export interface TaskInput {
  title?: string;
  description?: string;
  status?: Status;
  priority?: Priority;
  dueDate?: string | null;
  assigneeId?: string | null;
  labelIds?: string[];
  position?: number;
}

/** Anything that changes a task also changes counts, the dashboard and other lists. */
function useInvalidateTaskData() {
  const qc = useQueryClient();
  return (taskId?: string) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.tasksRoot }),
      qc.invalidateQueries({ queryKey: qk.projects }),
      qc.invalidateQueries({ queryKey: qk.dashboard }),
      taskId ? qc.invalidateQueries({ queryKey: qk.task(taskId) }) : Promise.resolve(),
    ]);
}

export function useCreateTask(projectId: string) {
  const invalidate = useInvalidateTaskData();
  return useMutation({
    mutationFn: async (input: TaskInput & { title: string }) =>
      (await api.post<{ task: TaskDetail }>(`/projects/${projectId}/tasks`, input)).task,
    onSuccess: () => invalidate(),
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidateTaskData();
  return useMutation({
    mutationFn: async ({ id, ...patch }: TaskInput & { id: string }) =>
      (await api.patch<{ task: TaskDetail }>(`/tasks/${id}`, patch)).task,
    onSuccess: (task) => invalidate(task.id),
  });
}

type ListSnapshot = [readonly unknown[], TaskListItem[] | undefined][];

/** Board drag-and-drop: update every cached list immediately, roll back if the API rejects it. */
export function useMoveTask() {
  const qc = useQueryClient();
  const invalidate = useInvalidateTaskData();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      position,
    }: {
      id: string;
      status: Status;
      position: number;
    }) => (await api.patch<{ task: TaskDetail }>(`/tasks/${id}`, { status, position })).task,
    onMutate: async ({ id, status, position }) => {
      await qc.cancelQueries({ queryKey: qk.tasksRoot });
      const snapshot: ListSnapshot = qc.getQueriesData<TaskListItem[]>({ queryKey: qk.tasksRoot });
      for (const [key, data] of snapshot) {
        if (!data) continue;
        qc.setQueryData<TaskListItem[]>(
          key,
          data.map((t) => (t.id === id ? { ...t, status, position } : t)),
        );
      }
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      for (const [key, data] of ctx?.snapshot ?? []) qc.setQueryData(key, data);
    },
    onSettled: (_data, _err, vars) => invalidate(vars.id),
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateTaskData();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => invalidate(),
  });
}

export function useAddComment(taskId: string) {
  const invalidate = useInvalidateTaskData();
  return useMutation({
    mutationFn: (body: string) => api.post(`/tasks/${taskId}/comments`, { body }),
    onSuccess: () => invalidate(taskId),
  });
}

export function useDeleteComment(taskId: string) {
  const invalidate = useInvalidateTaskData();
  return useMutation({
    mutationFn: (commentId: string) => api.delete(`/comments/${commentId}`),
    onSuccess: () => invalidate(taskId),
  });
}
