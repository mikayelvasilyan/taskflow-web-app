import { CheckCircle2, Circle, CircleDashed, OctagonAlert, type LucideIcon } from 'lucide-react';
import type { Label, Priority, Status } from '@/api/client';
import { cn } from '@/lib/cn';
import { relativeDue, formatLongDate } from '@/lib/dates';

export const STATUSES: Status[] = ['todo', 'in_progress', 'done'];
export const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low'];

export const STATUS_META: Record<Status, { label: string; icon: LucideIcon; text: string }> = {
  todo: { label: 'To do', icon: Circle, text: 'text-fg-muted' },
  in_progress: { label: 'In progress', icon: CircleDashed, text: 'text-accent-fg' },
  done: { label: 'Done', icon: CheckCircle2, text: 'text-success' },
};

export const PRIORITY_META: Record<
  Priority,
  { label: string; text: string; soft: string; bars: number }
> = {
  urgent: { label: 'Urgent', text: 'text-danger', soft: 'bg-danger-soft', bars: 3 },
  high: { label: 'High', text: 'text-warning', soft: 'bg-warning-soft', bars: 3 },
  medium: { label: 'Medium', text: 'text-accent-fg', soft: 'bg-accent-soft', bars: 2 },
  low: { label: 'Low', text: 'text-fg-muted', soft: 'bg-surface-2', bars: 1 },
};

export function StatusIcon({ status, className }: { status: Status; className?: string }) {
  const m = STATUS_META[status];
  return <m.icon aria-hidden className={cn('size-4 shrink-0', m.text, className)} />;
}

/** Three rising bars (1 = low, 2 = medium, 3 = high); urgent uses the alert octagon. Never colour-only: text always travels with it. */
export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  const m = PRIORITY_META[priority];
  if (priority === 'urgent') {
    return <OctagonAlert aria-hidden className={cn('size-4 shrink-0', m.text, className)} />;
  }
  const heights = [5, 9, 13];
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={cn('size-4 shrink-0', m.text, className)}>
      {heights.map((h, i) => (
        <rect
          key={i}
          x={1.5 + i * 5}
          y={15 - h}
          width="3"
          height={h}
          rx="1"
          fill={i < m.bars ? 'currentColor' : 'var(--border-strong)'}
        />
      ))}
    </svg>
  );
}

/** Colour is never the only signal: icon + text label always travel together. */
export function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', m.text)}>
      <m.icon aria-hidden className="size-4" />
      {m.label}
    </span>
  );
}

export function PriorityBadge({ priority, iconOnly }: { priority: Priority; iconOnly?: boolean }) {
  const m = PRIORITY_META[priority];
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-sm font-medium', m.text)}
      title={`${m.label} priority`}
    >
      <PriorityIcon priority={priority} />
      {iconOnly ? <span className="sr-only">{m.label} priority</span> : m.label}
    </span>
  );
}

const dueTone = {
  overdue: 'text-danger font-medium',
  today: 'text-warning font-medium',
  soon: 'text-fg-muted',
  normal: 'text-fg-muted',
  done: 'text-fg-subtle',
} as const;

export function DueDate({
  date,
  status,
  className,
}: {
  date: string | null;
  status: Status;
  className?: string;
}) {
  if (!date) return null;
  const { label, tone } = relativeDue(date, status);
  return (
    <time
      dateTime={date}
      title={formatLongDate(date)}
      className={cn('tabular text-xs', dueTone[tone], className)}
    >
      {label}
    </time>
  );
}

export function LabelChip({ label }: { label: Pick<Label, 'name' | 'color'> }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-fg-muted">
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ backgroundColor: label.color }}
      />
      {label.name}
    </span>
  );
}
