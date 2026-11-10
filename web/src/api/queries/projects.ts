import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  type Invite,
  type Label,
  type Member,
  type Project,
  type ProjectDetail,
  type ProjectSummary,
} from '../client';
import { qk } from './keys';

export function useProjects() {
  return useQuery({
    queryKey: qk.projects,
    queryFn: async () => (await api.get<{ projects: ProjectSummary[] }>('/projects')).projects,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: qk.project(id),
    queryFn: async () => (await api.get<{ project: ProjectDetail }>(`/projects/${id}`)).project,
    retry: false,
  });
}

export function useMembers(id: string) {
  return useQuery({
    queryKey: qk.members(id),
    queryFn: () => api.get<{ members: Member[]; invites: Invite[] }>(`/projects/${id}/members`),
  });
}

function useInvalidateProject(id?: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.projects }),
      id ? qc.invalidateQueries({ queryKey: qk.project(id) }) : Promise.resolve(),
      id ? qc.invalidateQueries({ queryKey: qk.members(id) }) : Promise.resolve(),
    ]);
}

export function useCreateProject() {
  const invalidate = useInvalidateProject();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) =>
      (await api.post<{ project: Project }>('/projects', input)).project,
    onSuccess: () => invalidate(),
  });
}

export function useUpdateProject(id: string) {
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: async (patch: { name?: string; description?: string; color?: string }) =>
      (await api.patch<{ project: Project }>(`/projects/${id}`, patch)).project,
    onSuccess: () => invalidate(),
  });
}

export function useDeleteProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/projects/${id}`),
    onSuccess: async () => {
      qc.removeQueries({ queryKey: qk.project(id) });
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.projects }),
        qc.invalidateQueries({ queryKey: qk.tasksRoot }),
        qc.invalidateQueries({ queryKey: qk.dashboard }),
      ]);
    },
  });
}

export function useInvite(id: string) {
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (email: string) =>
      api.post<{ member?: Member; invite?: Invite }>(`/projects/${id}/invites`, { email }),
    onSuccess: () => invalidate(),
  });
}

export function useRevokeInvite(id: string) {
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (inviteId: string) => api.delete(`/projects/${id}/invites/${inviteId}`),
    onSuccess: () => invalidate(),
  });
}

export function useRemoveMember(id: string) {
  const invalidate = useInvalidateProject(id);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/projects/${id}/members/${userId}`),
    onSuccess: async () => {
      await invalidate();
      await qc.invalidateQueries({ queryKey: qk.tasksRoot });
    },
  });
}

export function useCreateLabel(id: string) {
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: async (input: { name: string; color: string }) =>
      (await api.post<{ label: Label & { projectId: string } }>(`/projects/${id}/labels`, input))
        .label,
    onSuccess: () => invalidate(),
  });
}
