import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Dashboard, type Role, type TaskListItem, type User } from '../client';
import { qk } from './keys';

export function useDashboard() {
  return useQuery({ queryKey: qk.dashboard, queryFn: () => api.get<Dashboard>('/dashboard') });
}

export interface SearchResults {
  projects: { id: string; name: string; key: string; color: string }[];
  tasks: TaskListItem[];
}

export function useSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: qk.search(term),
    enabled: term.length > 0,
    queryFn: () => api.get<SearchResults>(`/search?q=${encodeURIComponent(term)}`),
    placeholderData: keepPreviousData,
    staleTime: 5_000,
  });
}

export type AdminUser = User & { createdAt: string; projectCount: number };

export function useUsers(enabled = true) {
  return useQuery({
    queryKey: qk.users,
    enabled,
    queryFn: async () => (await api.get<{ users: AdminUser[] }>('/users')).users,
  });
}

export function useSetUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => api.patch(`/users/${id}`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.users }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: qk.users }),
        qc.invalidateQueries({ queryKey: qk.projects }),
        qc.invalidateQueries({ queryKey: qk.tasksRoot }),
        qc.invalidateQueries({ queryKey: qk.dashboard }),
      ]),
  });
}
