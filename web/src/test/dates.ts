/** YYYY-MM-DD for today plus N days, in UTC (same "today" rule as the app). */
export function addDays(days: number): string {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + days))
    .toISOString()
    .slice(0, 10);
}
