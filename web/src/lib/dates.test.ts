import { describe, expect, it } from 'vitest';
import { daysUntil, isOverdue, relativeDue, todayUtc } from './dates';

const now = new Date('2026-03-10T23:30:00Z');

describe('relativeDue', () => {
  it.each([
    ['2026-03-10', 'todo', 'Today', 'today'],
    ['2026-03-11', 'todo', 'Tomorrow', 'soon'],
    ['2026-03-09', 'todo', 'Yesterday', 'overdue'],
    ['2026-03-08', 'todo', '2 days overdue', 'overdue'],
    ['2026-03-15', 'in_progress', 'in 5 days', 'soon'],
    ['2026-03-30', 'todo', 'Mar 30', 'normal'],
  ])('%s (%s) -> %s', (date, status, label, tone) => {
    expect(relativeDue(date, status, now)).toEqual({ label, tone });
  });

  it('never marks completed tasks as overdue', () => {
    expect(relativeDue('2026-03-01', 'done', now)).toEqual({ label: 'Mar 1', tone: 'done' });
    expect(isOverdue('2026-03-01', 'done', now)).toBe(false);
  });
});

describe('UTC day math', () => {
  it('uses the UTC date for "today"', () => {
    expect(todayUtc(now)).toBe('2026-03-10');
    expect(daysUntil('2026-03-13', now)).toBe(3);
    expect(daysUntil('2026-02-28', now)).toBe(-10);
  });
});
