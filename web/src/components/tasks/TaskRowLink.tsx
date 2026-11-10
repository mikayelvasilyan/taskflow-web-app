import { Link } from 'react-router-dom';
import type { TaskListItem } from '@/api/client';
import { useProjects } from '@/api/queries/projects';
import { Avatar } from '@/components/common/Avatar';
import { tid } from '@/lib/testids';
import { DueDate, PriorityIcon } from './badges';

/**
 * Compact row used on the dashboard and "My tasks"; opens the task panel on its project board.
 * Phones stack it (title on top, key / project / due underneath); wider screens use a single line.
 */
export function TaskRowLink({
  task,
  showAssignee = false,
}: {
  task: TaskListItem;
  showAssignee?: boolean;
}) {
  const projects = useProjects();
  const project = projects.data?.find((p) => p.id === task.projectId);

  return (
    <Link
      to={`/app/projects/${task.projectId}/board?task=${task.id}`}
      data-testid={tid.taskLink(task.id)}
      className="flex min-h-11 items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-surface-2 sm:items-center"
    >
      <PriorityIcon priority={task.priority} className="mt-0.5 sm:mt-0" />
      <span className="sr-only">{task.priority} priority</span>

      <span className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-3">
        <span className="line-clamp-2 text-base font-medium sm:order-2 sm:line-clamp-1 sm:flex-1">
          {task.title}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-subtle sm:order-1 sm:mt-0 sm:w-44 sm:shrink-0">
          <span className="tabular shrink-0 font-medium">{task.key}</span>
          {project && (
            <>
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <span className="truncate">{project.name}</span>
            </>
          )}
          <DueDate
            date={task.dueDate}
            status={task.status}
            className="ml-auto shrink-0 sm:hidden"
          />
        </span>
      </span>

      <DueDate
        date={task.dueDate}
        status={task.status}
        className="hidden shrink-0 text-sm sm:block"
      />
      {showAssignee && task.assignee && (
        <Avatar person={task.assignee} size="sm" className="hidden ring-0 sm:inline-flex" />
      )}
    </Link>
  );
}
