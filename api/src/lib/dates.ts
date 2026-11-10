/** All "today" logic is UTC, on both server and client. */
export const todayUtc = (now: Date = new Date()): string => now.toISOString().slice(0, 10);

export const addDaysUtc = (days: number, now: Date = new Date()): string => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
  return d.toISOString().slice(0, 10);
};

export const isOverdue = (
  dueDate: string | null | undefined,
  status: string,
  now: Date = new Date(),
): boolean => !!dueDate && status !== 'done' && dueDate < todayUtc(now);
