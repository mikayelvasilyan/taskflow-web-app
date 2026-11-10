import { Link } from 'react-router-dom';
import type { TaskListItem } from '@/api/client';
import { Avatar } from '@/components/common/Avatar';
import { tid } from '@/lib/testids';
import { DueDate, PriorityIcon } from './badges';

/** Compact row used on the dashboard and "My tasks"; opens the task panel on its project board. */
export function TaskRowLink({
  task,
  showAssignee = false,
}: {
  task: TaskListItem;
  showAssignee?: boolean;
}) {
  return (
    <Link
      to={`/app/projects/${task.projectId}/board?task=${task.id}`}
      data-testid={tid.taskLink(task.id)}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-surface-2"
    >
      <PriorityIcon priority={task.priority} />
      <span className="sr-only">{task.priority} priority</span>
      <span className="tabular w-16 shrink-0 text-xs font-medium text-fg-subtle">{task.key}</span>
      <span className="min-w-0 flex-1 truncate text-base font-medium">{task.title}</span>
      <DueDate date={task.dueDate} status={task.status} className="shrink-0 text-sm" />
      {showAssignee && task.assignee && (
        <Avatar person={task.assignee} size="sm" className="ring-0" />
      )}
    </Link>
  );
}
