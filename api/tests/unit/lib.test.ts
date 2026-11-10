import { describe, expect, it } from 'vitest';
import { addDaysUtc, isOverdue, todayUtc } from '../../src/lib/dates.js';
import { positionBetween } from '../../src/lib/position.js';

describe('dates (UTC)', () => {
  const now = new Date('2026-03-10T23:59:59Z');
  it('computes today in UTC', () => expect(todayUtc(now)).toBe('2026-03-10'));
  it('adds days across month ends', () => expect(addDaysUtc(25, now)).toBe('2026-04-04'));
  it('flags overdue only when not done', () => {
    expect(isOverdue('2026-03-09', 'todo', now)).toBe(true);
    expect(isOverdue('2026-03-09', 'done', now)).toBe(false);
    expect(isOverdue('2026-03-10', 'todo', now)).toBe(false);
    expect(isOverdue(null, 'todo', now)).toBe(false);
  });
});

describe('positionBetween', () => {
  it('handles empty, ends and middle', () => {
    expect(positionBetween(null, null)).toBe(1024);
    expect(positionBetween(null, 1024)).toBe(0);
    expect(positionBetween(2048, null)).toBe(3072);
    expect(positionBetween(1024, 2048)).toBe(1536);
  });
});
