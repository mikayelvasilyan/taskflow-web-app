import { MessageSquare } from 'lucide-react';
import { forwardRef, type HTMLAttributes } from 'react';
import type { TaskListItem } from '@/api/client';
import { Avatar } from '@/components/common/Avatar';
import { cn } from '@/lib/cn';
import { isOverdue } from '@/lib/dates';
import { tid } from '@/lib/testids';
import { DueDate, LabelChip, PriorityIcon } from './badges';

interface TaskCardProps extends HTMLAttributes<HTMLDivElement> {
  task: TaskListItem;
  /** Rendered inside the drag overlay: lifted look, no test id (the real card keeps it). */
  overlay?: boolean;
  dragging?: boolean;
  /** Optional trailing control (the "Move to..." menu). */
  menu?: React.ReactNode;
}

/** Presentational card. Drag behaviour is added by SortableTaskCard. */
export const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(
  ({ task, overlay, dragging, menu, className, ...props }, ref) => {
    const overdue = isOverdue(task.dueDate, task.status);
    return (
      <div
        ref={ref}
        data-testid={overlay ? undefined : tid.taskCard(task.id)}
        data-status={task.status}
        data-priority={task.priority}
        data-overdue={overdue}
        className={cn(
          'group relative flex touch-manipulation flex-col gap-2.5 rounded-md border border-border bg-surface p-3 text-left shadow-xs transition-shadow hover:shadow-sm',
          dragging && 'opacity-40',
          overlay &&
            'rotate-[1.5deg] scale-[1.02] cursor-grabbing shadow-drag motion-reduce:rotate-0 motion-reduce:scale-100',
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="tabular text-xs font-medium text-fg-subtle">{task.key}</span>
          {menu}
        </div>
        <p className="line-clamp-2 text-base font-medium leading-5 text-fg">{task.title}</p>
        {task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.labels.map((l) => (
              <LabelChip key={l.id} label={l} />
            ))}
          </div>
        )}
        <div className="flex items-center gap-2.5">
          <span title={`${task.priority} priority`} className="inline-flex">
            <PriorityIcon priority={task.priority} />
            <span className="sr-only">{task.priority} priority</span>
          </span>
          <DueDate date={task.dueDate} status={task.status} />
          <span className="ml-auto flex items-center gap-2">
            {task.commentCount > 0 && (
              <span className="tabular inline-flex items-center gap-1 text-xs text-fg-muted">
                <MessageSquare className="size-3.5" aria-hidden />
                {task.commentCount}
                <span className="sr-only">comments</span>
              </span>
            )}
            {task.assignee ? (
              <Avatar person={task.assignee} size="sm" className="ring-0" />
            ) : (
              <span
                aria-label="Unassigned"
                title="Unassigned"
                className="size-6 rounded-full border border-dashed border-border-strong"
              />
            )}
          </span>
        </div>
      </div>
    );
  },
);
TaskCard.displayName = 'TaskCard';
