import { formatDistanceToNowStrict } from 'date-fns';

/** "Today" is the UTC date everywhere (same rule as the API). */
export const todayUtc = (now: Date = new Date()): string => now.toISOString().slice(0, 10);

const DAY = 86_400_000;

/** Whole days from today (UTC) to a YYYY-MM-DD date. Negative = in the past. */
export function daysUntil(date: string, now: Date = new Date()): number {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${todayUtc(now)}T00:00:00Z`)) / DAY,
  );
}

export function formatShortDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const sameYear = d.getUTCFullYear() === new Date().getUTCFullYear();
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
    timeZone: 'UTC',
  });
}

export function formatLongDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export type DueTone = 'overdue' | 'today' | 'soon' | 'normal' | 'done';

/** Friendly due-date label and urgency, e.g. "Tomorrow", "2 days overdue", "Mar 14". */
export function relativeDue(
  date: string,
  status: string,
  now: Date = new Date(),
): { label: string; tone: DueTone } {
  const n = daysUntil(date, now);
  if (status === 'done') return { label: formatShortDate(date), tone: 'done' };
  if (n < -1) return { label: `${-n} days overdue`, tone: 'overdue' };
  if (n === -1) return { label: 'Yesterday', tone: 'overdue' };
  if (n === 0) return { label: 'Today', tone: 'today' };
  if (n === 1) return { label: 'Tomorrow', tone: 'soon' };
  if (n <= 7) return { label: `in ${n} days`, tone: 'soon' };
  return { label: formatShortDate(date), tone: 'normal' };
}

export const isOverdue = (date: string | null, status: string, now: Date = new Date()) =>
  !!date && status !== 'done' && daysUntil(date, now) < 0;

export function timeAgo(iso: string): string {
  return `${formatDistanceToNowStrict(new Date(iso))} ago`;
}
