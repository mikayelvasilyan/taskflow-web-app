/** 8 avatar colours, all >= 4.5:1 against white text. */
export const AVATAR_COLORS = [
  '#2F5BEA',
  '#7C3AED',
  '#BE185D',
  '#C2410C',
  '#15803D',
  '#0E7490',
  '#A16207',
  '#475569',
] as const;

export const PROJECT_COLORS = [
  '#2F5BEA',
  '#7C3AED',
  '#DB2777',
  '#EA580C',
  '#16A34A',
  '#0891B2',
  '#CA8A04',
  '#64748B',
] as const;

export function pickColor(seed: string, palette: readonly string[] = AVATAR_COLORS): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length] as string;
}
