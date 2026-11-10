import { useProjectTasks } from '@/api/queries/tasks';
import { EmptyState, ErrorState } from '@/components/common/states';
import { FilterBar } from '@/components/list/FilterBar';
import { TaskTable } from '@/components/list/TaskTable';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/misc';
import { useShell } from '@/hooks/useShell';
import { useTaskFilters } from '@/hooks/useTaskFilters';
import { tid } from '@/lib/testids';
import { useProjectContext } from './ProjectLayout';

export default function ProjectList() {
  const { project } = useProjectContext();
  const { filters, update, openTask, activeCount, clear } = useTaskFilters();
  const tasks = useProjectTasks(project.id, { ...filters, sort: filters.sort ?? 'status' });
  const { openNewTask } = useShell();

  // Clicking a header cycles asc -> desc -> default order.
  const onSort = (field: NonNullable<typeof filters.sort>) => {
    if (filters.sort !== field) update({ sort: field, order: 'asc' });
    else if (filters.order !== 'desc') update({ sort: field, order: 'desc' });
    else update({ sort: undefined, order: undefined });
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="px-4 md:px-6">
        <FilterBar members={project.members} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 md:px-6">
        {tasks.isLoading ? (
          <div data-testid={tid.skeleton('list')} className="flex flex-col gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : tasks.isError ? (
          <ErrorState name="list" onRetry={() => tasks.refetch()} />
        ) : tasks.data && tasks.data.length === 0 ? (
          activeCount > 0 ? (
            <EmptyState
              name="list-filtered"
              art="search"
              title="No tasks match these filters"
              description="Try a different search or clear the filters."
              action={<Button onClick={clear}>Clear filters</Button>}
            />
          ) : (
            <EmptyState
              name="list"
              title="No tasks yet"
              description="Create the first task for this project."
              action={
                <Button variant="primary" onClick={() => openNewTask('todo')}>
                  New task
                </Button>
              }
            />
          )
        ) : (
          <TaskTable
            tasks={tasks.data ?? []}
            sort={filters.sort}
            order={filters.order}
            onSort={onSort}
            onOpen={openTask}
          />
        )}
      </div>
    </div>
  );
}
