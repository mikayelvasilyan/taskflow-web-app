import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { TaskFilters } from '@/api/queries/tasks';
import type { Priority, Status } from '@/api/client';

const STATUS: Status[] = ['todo', 'in_progress', 'done'];
const PRIORITY: Priority[] = ['low', 'medium', 'high', 'urgent'];
const SORT = ['position', 'dueDate', 'priority', 'createdAt', 'title'] as const;

type Patch = Partial<
  Record<
    'status' | 'priority' | 'assignee' | 'overdue' | 'q' | 'sort' | 'order' | 'task',
    string | boolean | undefined
  >
>;

/** Filters, sort and the open task all live in the URL so views are shareable and back/forward work. */
export function useTaskFilters() {
  const [sp, setSp] = useSearchParams();

  const filters = useMemo<TaskFilters>(() => {
    const status = sp.get('status') as Status | null;
    const priority = sp.get('priority') as Priority | null;
    const sort = sp.get('sort') as (typeof SORT)[number] | null;
    const order = sp.get('order');
    return {
      ...(status && STATUS.includes(status) && { status }),
      ...(priority && PRIORITY.includes(priority) && { priority }),
      ...(sp.get('assignee') && { assignee: sp.get('assignee') as string }),
      ...(sp.get('overdue') === 'true' && { overdue: true }),
      ...(sp.get('q') && { q: sp.get('q') as string }),
      ...(sort && SORT.includes(sort) && { sort }),
      ...((order === 'asc' || order === 'desc') && { order }),
    };
  }, [sp]);

  const taskId = sp.get('task');

  const update = useCallback(
    (patch: Patch, opts?: { replace?: boolean }) => {
      const next = new URLSearchParams(sp);
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === '' || v === false) next.delete(k);
        else next.set(k, String(v));
      }
      setSp(next, { replace: opts?.replace ?? true });
    },
    [sp, setSp],
  );

  const clear = useCallback(() => {
    const next = new URLSearchParams();
    const task = sp.get('task');
    if (task) next.set('task', task);
    setSp(next, { replace: true });
  }, [sp, setSp]);

  const activeCount = ['status', 'priority', 'assignee', 'overdue', 'q'].filter((k) =>
    sp.get(k),
  ).length;

  return {
    filters,
    taskId,
    activeCount,
    update,
    clear,
    // Opening a task is a real navigation step, so the browser Back button closes the panel.
    openTask: (id: string) => update({ task: id }, { replace: false }),
    closeTask: () => update({ task: undefined }, { replace: false }),
  };
}
