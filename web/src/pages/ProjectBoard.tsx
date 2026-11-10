import { useMoveTask, useProjectTasks } from '@/api/queries/tasks';
import { isApiError } from '@/api/client';
import { Board } from '@/components/board/Board';
import { EmptyState, ErrorState } from '@/components/common/states';
import { notify } from '@/components/common/toast';
import { FilterBar } from '@/components/list/FilterBar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/misc';
import { useShell } from '@/hooks/useShell';
import { useTaskFilters } from '@/hooks/useTaskFilters';
import { tid } from '@/lib/testids';
import { useProjectContext } from './ProjectLayout';

export default function ProjectBoard() {
  const { project } = useProjectContext();
  const { filters, openTask, activeCount, clear } = useTaskFilters();
  const tasks = useProjectTasks(project.id, filters);
  const move = useMoveTask();
  const { openNewTask } = useShell();

  const onMove = async (m: Parameters<typeof move.mutateAsync>[0]) => {
    try {
      await move.mutateAsync(m);
    } catch (err) {
      notify.error(isApiError(err) ? err.message : 'Could not move the task. It was put back.');
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="px-4 md:px-6">
        <FilterBar members={project.members} />
      </div>
      <div className="min-h-0 flex-1">
        {tasks.isLoading ? (
          <div data-testid={tid.skeleton('board')} className="flex gap-3 px-4 md:px-6">
            {[0, 1, 2].map((c) => (
              <div
                key={c}
                className="flex flex-1 flex-col gap-2 rounded-lg bg-surface-2 p-2 max-md:min-w-[86%]"
              >
                <Skeleton className="h-6 w-28" />
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 bg-surface" />
                ))}
              </div>
            ))}
          </div>
        ) : tasks.isError ? (
          <ErrorState name="board" onRetry={() => tasks.refetch()} />
        ) : tasks.data && tasks.data.length === 0 ? (
          activeCount > 0 ? (
            <EmptyState
              name="board-filtered"
              art="search"
              title="No tasks match these filters"
              description="Try a different search or clear the filters."
              action={<Button onClick={clear}>Clear filters</Button>}
            />
          ) : (
            <EmptyState
              name="board"
              title="No tasks yet"
              description="Create the first task to start filling the board."
              action={
                <Button variant="primary" onClick={() => openNewTask('todo')}>
                  New task
                </Button>
              }
            />
          )
        ) : (
          <Board tasks={tasks.data ?? []} onOpen={openTask} onMove={onMove} onAdd={openNewTask} />
        )}
      </div>
    </div>
  );
}
