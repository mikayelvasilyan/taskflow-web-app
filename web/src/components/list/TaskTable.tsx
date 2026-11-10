import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { TaskListItem } from '@/api/client';
import type { TaskFilters } from '@/api/queries/tasks';
import { Avatar } from '@/components/common/Avatar';
import { DueDate, LabelChip, PriorityBadge, StatusBadge } from '@/components/tasks/badges';
import { cn } from '@/lib/cn';
import { isOverdue } from '@/lib/dates';
import { tid } from '@/lib/testids';

type SortField = NonNullable<TaskFilters['sort']>;

function SortHeader({
  field,
  label,
  sort,
  order,
  onSort,
  className,
}: {
  field: SortField;
  label: string;
  sort: TaskFilters['sort'];
  order: TaskFilters['order'];
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const active = sort === field;
  const Icon = !active ? ChevronsUpDown : order === 'desc' ? ArrowDown : ArrowUp;
  return (
    <th
      scope="col"
      aria-sort={active ? (order === 'desc' ? 'descending' : 'ascending') : 'none'}
      className={cn('px-3 py-2 text-left text-xs font-medium text-fg-muted', className)}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        data-testid={tid.sortHeader(field)}
        className="inline-flex items-center gap-1 rounded hover:text-fg"
      >
        {label}
        <Icon
          className={cn('size-3.5', active ? 'text-accent-fg' : 'text-fg-subtle')}
          aria-hidden
        />
      </button>
    </th>
  );
}

/**
 * Sortable task table on desktop; stacked rows on phones (same markup, restyled with CSS).
 */
export function TaskTable({
  tasks,
  sort,
  order,
  onSort,
  onOpen,
}: {
  tasks: TaskListItem[];
  sort: TaskFilters['sort'];
  order: TaskFilters['order'];
  onSort: (field: SortField) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
      <table data-testid={tid.listView} className="w-full border-collapse text-base max-md:block">
        <thead className="border-b border-border bg-surface-2 max-md:hidden">
          <tr>
            <th scope="col" className="w-24 px-3 py-2 text-left text-xs font-medium text-fg-muted">
              Key
            </th>
            <SortHeader field="title" label="Title" sort={sort} order={order} onSort={onSort} />
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-fg-muted">
              Status
            </th>
            <SortHeader
              field="priority"
              label="Priority"
              sort={sort}
              order={order}
              onSort={onSort}
            />
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-fg-muted">
              Assignee
            </th>
            <SortHeader field="dueDate" label="Due" sort={sort} order={order} onSort={onSort} />
          </tr>
        </thead>
        <tbody className="max-md:block max-md:divide-y max-md:divide-border">
          {tasks.map((t) => (
            <tr
              key={t.id}
              data-testid={tid.taskRow(t.id)}
              data-status={t.status}
              data-priority={t.priority}
              data-overdue={isOverdue(t.dueDate, t.status)}
              onClick={() => onOpen(t.id)}
              className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2 max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-3 max-md:gap-y-2 max-md:border-0 max-md:px-4 max-md:py-3"
            >
              <td className="tabular w-24 px-3 py-2.5 align-middle text-xs font-medium text-fg-subtle max-md:order-1 max-md:w-auto max-md:flex-1 max-md:p-0">
                {t.key}
              </td>
              <td className="px-3 py-2.5 align-middle max-md:order-3 max-md:basis-full max-md:p-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(t.id);
                  }}
                  data-testid={tid.taskLink(t.id)}
                  className="text-left font-medium text-fg hover:underline"
                >
                  {t.title}
                </button>
                {t.labels.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1 max-md:hidden">
                    {t.labels.slice(0, 2).map((l) => (
                      <LabelChip key={l.id} label={l} />
                    ))}
                    {t.labels.length > 2 && (
                      <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-fg-muted">
                        +{t.labels.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </td>
              <td className="px-3 py-2.5 align-middle max-md:order-4 max-md:p-0">
                <StatusBadge status={t.status} />
              </td>
              <td className="px-3 py-2.5 align-middle max-md:order-5 max-md:p-0">
                <PriorityBadge priority={t.priority} />
              </td>
              <td className="px-3 py-2.5 align-middle max-md:order-6 max-md:ml-auto max-md:p-0">
                {t.assignee ? (
                  <span className="inline-flex items-center gap-2">
                    <Avatar person={t.assignee} size="sm" className="ring-0" />
                    <span className="text-sm text-fg-muted max-lg:sr-only">{t.assignee.name}</span>
                  </span>
                ) : (
                  <span className="text-sm text-fg-subtle max-md:hidden">Unassigned</span>
                )}
              </td>
              <td className="px-3 py-2.5 align-middle max-md:order-2 max-md:p-0 max-md:text-right">
                {t.dueDate ? (
                  <DueDate date={t.dueDate} status={t.status} className="text-sm" />
                ) : (
                  <span className="text-sm text-fg-subtle">No date</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
