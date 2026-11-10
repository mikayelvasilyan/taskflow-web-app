import { useMemo } from 'react';
import type { TaskListItem } from '@/api/client';
import { useAllTasks } from '@/api/queries/tasks';
import { EmptyState, ErrorState } from '@/components/common/states';
import { Page, PageHeader } from '@/components/layout/PageHeader';
import { TaskRowLink } from '@/components/tasks/TaskRowLink';
import { Skeleton } from '@/components/ui/misc';
import { daysUntil } from '@/lib/dates';
import { tid } from '@/lib/testids';

const GROUPS = [
  {
    key: 'overdue',
    title: 'Overdue',
    test: (t: TaskListItem) => !!t.dueDate && daysUntil(t.dueDate) < 0,
  },
  {
    key: 'today',
    title: 'Today',
    test: (t: TaskListItem) => !!t.dueDate && daysUntil(t.dueDate) === 0,
  },
  {
    key: 'upcoming',
    title: 'Upcoming',
    test: (t: TaskListItem) => !!t.dueDate && daysUntil(t.dueDate) > 0,
  },
  { key: 'nodate', title: 'No date', test: (t: TaskListItem) => !t.dueDate },
] as const;

export default function MyTasks() {
  const q = useAllTasks({ assignee: 'me', sort: 'dueDate' });
  const open = useMemo(() => (q.data ?? []).filter((t) => t.status !== 'done'), [q.data]);

  return (
    <Page className="max-w-3xl">
      <div data-testid={tid.myTasksPage} className="flex flex-col gap-6">
        <PageHeader
          title="My tasks"
          description="Open tasks assigned to you, across all projects."
        />
        {q.isLoading ? (
          <div data-testid={tid.skeleton('my-tasks')} className="flex flex-col gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : q.isError ? (
          <ErrorState name="my-tasks" onRetry={() => q.refetch()} />
        ) : open.length === 0 ? (
          <EmptyState
            name="my-tasks"
            art="done"
            title="You are all caught up"
            description="No open tasks are assigned to you right now."
          />
        ) : (
          GROUPS.map((g) => {
            const items = open.filter(g.test);
            if (items.length === 0) return null;
            return (
              <section
                key={g.key}
                aria-labelledby={`group-${g.key}`}
                data-testid={tid.myTasksGroup(g.key)}
              >
                <h2
                  id={`group-${g.key}`}
                  className="mb-1 flex items-center gap-2 text-sm font-semibold text-fg-muted"
                >
                  {g.title}
                  <span className="tabular rounded-full bg-surface-2 px-2 text-xs">
                    {items.length}
                  </span>
                </h2>
                <ul className="rounded-lg border border-border bg-surface p-1 shadow-xs">
                  {items.map((t) => (
                    <li key={t.id}>
                      <TaskRowLink task={t} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </Page>
  );
}
