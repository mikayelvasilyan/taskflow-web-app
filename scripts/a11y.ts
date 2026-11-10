/**
 * Accessibility audit: runs axe-core (WCAG 2.0/2.1 A and AA) on every page in light and dark,
 * on desktop and phone, including open dialogs. Exits non-zero on any serious or critical issue.
 * Moderate/minor findings are printed but do not fail the run.
 *
 * Needs the app running. Uses the installed Chrome, so no browser download:
 *   BASE_URL=http://localhost:5173 npm run a11y
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { chromium, type Page } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const THEMES = ['light', 'dark'] as const;
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

interface Violation {
  id: string;
  impact: string | null;
  help: string;
  nodes: { target: string[]; failureSummary?: string }[];
}

const failures: string[] = [];
const notes: string[] = [];
let checked = 0;

async function audit(page: Page, label: string) {
  await page.waitForTimeout(600); // animations and charts settle
  await page.evaluate(AXE_SOURCE);
  const violations = (await page.evaluate(async () => {
    // @ts-expect-error axe is injected into the page above
    const r = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    return r.violations;
  })) as Violation[];
  checked += 1;
  for (const v of violations) {
    const line = `${label}: [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} element${v.nodes.length === 1 ? '' : 's'}) e.g. ${v.nodes[0]?.target.join(' ')}`;
    if (v.impact === 'serious' || v.impact === 'critical') failures.push(line);
    else notes.push(line);
  }
  console.log(`  ${violations.length === 0 ? 'ok  ' : 'ISSUES'} ${label}`);
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    for (const theme of THEMES) {
      for (const vp of Object.keys(VIEWPORTS) as (keyof typeof VIEWPORTS)[]) {
        console.log(`${theme} / ${vp}`);
        const tag = (n: string) => `${n} ${theme}/${vp}`;
        const open = async (signedIn: boolean) => {
          const ctx = await browser.newContext({
            viewport: VIEWPORTS[vp],
            isMobile: vp === 'mobile',
            hasTouch: vp === 'mobile',
            reducedMotion: 'reduce',
            baseURL: BASE_URL,
          });
          await ctx.addInitScript((t) => localStorage.setItem('tf-theme', t), theme);
          if (signedIn) {
            const res = await ctx.request.post('/api/auth/login', {
              data: { email: 'demo@taskflow.dev', password: 'Demo123!' },
            });
            if (!res.ok()) throw new Error('Demo login failed. Is the API running with demo data?');
          }
          return { ctx, page: await ctx.newPage() };
        };

        // Public pages
        const pub = await open(false);
        for (const [name, url] of [
          ['landing', '/'],
          ['login', '/login'],
          ['signup', '/signup'],
          ['404', '/no-such-page'],
        ] as const) {
          await pub.page.goto(url, { waitUntil: 'networkidle' });
          await audit(pub.page, tag(name));
        }
        await pub.ctx.close();

        // App pages
        const { ctx, page } = await open(true);
        const projectHref = await (async () => {
          await page.goto('/app/dashboard', { waitUntil: 'networkidle' });
          return page.evaluate(async () => {
            const r = await fetch('/api/projects').then((x) => x.json());
            return `/app/projects/${r.projects[0].id}`;
          });
        })();
        await audit(page, tag('dashboard'));

        const routes: [string, string][] = [
          ['my-tasks', '/app/my-tasks'],
          ['board', `${projectHref}/board`],
          ['list', `${projectHref}/list`],
          ['project-settings', `${projectHref}/settings`],
          ['settings-profile', '/app/settings?tab=profile'],
          ['settings-appearance', '/app/settings?tab=appearance'],
          ['settings-members', '/app/settings?tab=members'],
        ];
        for (const [name, url] of routes) {
          await page.goto(url, { waitUntil: 'networkidle' });
          await audit(page, tag(name));
        }

        // Open overlays
        const taskId = await page.evaluate(async (href) => {
          const r = await fetch(`/api${href.replace('/app', '')}/tasks`).then((x) => x.json());
          return (
            r.tasks.find((t: { commentCount: number }) => t.commentCount > 0)?.id ?? r.tasks[0].id
          );
        }, projectHref);
        await page.goto(`${projectHref}/board?task=${taskId}`, { waitUntil: 'networkidle' });
        await audit(page, tag('task-panel'));

        await page.goto(`${projectHref}/board`, { waitUntil: 'networkidle' });
        await page.getByTestId('new-task-button').click();
        await page.getByTestId('new-task-form').waitFor();
        await audit(page, tag('new-task-dialog'));
        await page.keyboard.press('Escape');

        await page.getByTestId('search-trigger').click();
        await page.getByTestId('command-palette-input').fill('redirect');
        await page.getByTestId('command-palette').getByText('Redirect map for old URLs').waitFor();
        await audit(page, tag('command-palette'));
        await page.keyboard.press('Escape');

        if (vp === 'mobile') {
          await page.getByTestId('filters-toggle').click();
          await page.getByRole('dialog', { name: 'Filters' }).waitFor();
          await audit(page, tag('filters-sheet'));
          await page.keyboard.press('Escape');
        }
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\n${checked} page states audited.`);
  if (notes.length)
    console.log(`\nModerate/minor (not blocking):\n${[...new Set(notes)].join('\n')}`);
  if (failures.length) {
    console.error(
      `\n${failures.length} serious/critical issue(s):\n${[...new Set(failures)].join('\n')}`,
    );
    process.exit(1);
  }
  console.log('No serious or critical accessibility issues.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
