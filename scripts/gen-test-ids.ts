/**
 * Generates docs/TEST_IDS.md from web/src/lib/testids.ts so the doc never drifts from the code.
 *   npm run docs:testids
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { tid } from '../web/src/lib/testids';

type Entry = { key: string; pattern: string };

const entries: Entry[] = Object.entries(tid).map(([key, value]) => {
  if (typeof value === 'string') return { key, pattern: value };
  // Builder functions: call with named placeholders to show the pattern, e.g. task-card-{id}
  // Use the builder's own parameter names so the pattern reads `{form}-{name}-input`.
  const fn = value as (...a: string[]) => string;
  const params =
    /^\s*(?:function\s*\w*)?\s*\(?([^)=]*)\)?\s*(?:=>|\{)/.exec(fn.toString())?.[1] ?? '';
  const names = params
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  return { key, pattern: fn(...names.map((n) => `{${n}}`)) };
});

// Group by the first segment of the id; forms share the `{form}-{field}-input` convention.
const groupOf = (pattern: string) =>
  pattern.startsWith('{') ? 'forms' : (pattern.split('-')[0] ?? 'misc');
const groups = new Map<string, Entry[]>();
for (const e of entries) {
  const g = groupOf(e.pattern);
  groups.set(g, [...(groups.get(g) ?? []), e]);
}

const lines: string[] = [
  '# Test ids',
  '',
  'Every interactive element and every element a test would assert on has a stable `data-testid`.',
  'This file is **generated** from [`web/src/lib/testids.ts`](../web/src/lib/testids.ts) (`npm run docs:testids`);',
  'edit the source, not this table. The E2E repo (`playwright-jenkins-e2e`) selects by these ids.',
  '',
  '## Conventions',
  '',
  '- Kebab-case: `<area>-<element>[-<qualifier>]`.',
  '- Ids with a `{placeholder}` are builders. Substitute the entity id or status value (`task-card-{id}` becomes `task-card-k3j9x0a1b2cd`).',
  '- State is exposed as data attributes next to the id, so tests can assert it without parsing text:',
  '',
  '| Element | Attributes |',
  '|---|---|',
  '| `task-card-{id}` | `data-status`, `data-priority`, `data-overdue` |',
  '| `task-row-{id}` | `data-status`, `data-priority`, `data-overdue` |',
  '| `board-column-{status}` | `data-count` |',
  '| `stat-card-{name}` | `data-value` |',
  '',
  '- Forms: `{form}-{field}-input`, `{form}-{field}-error` (inline validation), `{form}-submit`, `{form}-error` (server error).',
  '  Example: `login-email-input`, `login-password-error`, `login-submit`.',
  '- Toasts: `toast-success` / `toast-error`.',
  '- The board "Move to" menu uses `task-move-{id}` and `task-move-{id}-{status}`, so `task-card-*` only ever matches cards.',
  '',
  '## All ids',
  '',
];

for (const [group, list] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
  lines.push(`### ${group}`, '', '| Id | Key in `tid` |', '|---|---|');
  for (const e of list) lines.push(`| \`${e.pattern}\` | \`tid.${e.key}\` |`);
  lines.push('');
}

writeFileSync(path.resolve(import.meta.dirname, '../docs/TEST_IDS.md'), lines.join('\n'));
console.log(`Wrote docs/TEST_IDS.md (${entries.length} ids)`);
