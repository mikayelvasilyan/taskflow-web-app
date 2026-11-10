import {
  CheckCircle2,
  Circle,
  CircleDashed,
  OctagonAlert,
  SignalHigh,
  SignalLow,
  SignalMedium,
  type LucideIcon,
} from 'lucide-react';
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
  { label: string; icon: LucideIcon; text: string; soft: string }
> = {
  urgent: { label: 'Urgent', icon: OctagonAlert, text: 'text-danger', soft: 'bg-danger-soft' },
  high: { label: 'High', icon: SignalHigh, text: 'text-warning', soft: 'bg-warning-soft' },
  medium: { label: 'Medium', icon: SignalMedium, text: 'text-accent-fg', soft: 'bg-accent-soft' },
  low: { label: 'Low', icon: SignalLow, text: 'text-fg-muted', soft: 'bg-surface-2' },
};

export function StatusIcon({ status, className }: { status: Status; className?: string }) {
  const m = STATUS_META[status];
  return <m.icon aria-hidden className={cn('size-4 shrink-0', m.text, className)} />;
}

export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  const m = PRIORITY_META[priority];
  return <m.icon aria-hidden className={cn('size-4 shrink-0', m.text, className)} />;
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
      <m.icon aria-hidden className="size-4" />
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
