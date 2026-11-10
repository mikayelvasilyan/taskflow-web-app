/**
 * Captures every page in light/dark x desktop/mobile into docs/screenshots/.
 * Doubles as a smoke test: exits non-zero if any page logs a console error or a failed request.
 *
 * Needs the app running (API + web). Uses the installed Chrome, so no browser download:
 *   BASE_URL=http://localhost:5173 npm run screenshots
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = path.resolve(import.meta.dirname, '../docs/screenshots');
const THEMES = ['light', 'dark'] as const;
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

const problems: string[] = [];

function watch(page: Page, label: string) {
  page.on('console', (m) => {
    // 401 on /auth/me is expected for signed-out visitors.
    if (m.type() === 'error' && !/401|favicon/i.test(m.text()))
      problems.push(`${label}: console error: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`${label}: page error: ${e.message}`));
}

async function newContext(
  browser: Browser,
  theme: string,
  vp: keyof typeof VIEWPORTS,
  signedIn: boolean,
) {
  const ctx = await browser.newContext({
    viewport: VIEWPORTS[vp],
    deviceScaleFactor: vp === 'mobile' ? 2 : 1,
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
    if (!res.ok())
      throw new Error(`Demo login failed (${res.status()}). Is the API running with demo data?`);
  }
  return ctx;
}

async function shoot(page: Page, name: string, theme: string, vp: string, fullPage = false) {
  await page.waitForTimeout(700); // let charts and fonts settle
  if (fullPage) {
    // Lazy-loaded images only load when scrolled into view: scroll down, wait for them, scroll back.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      await Promise.all(
        [...document.images]
          .filter((i) => i.offsetParent !== null)
          .map((i) => i.decode().catch(() => undefined)),
      );
      window.scrollTo(0, 0);
    });
  }
  const file = path.join(OUT, `${name}-${theme}-${vp}.png`);
  // The repo can live in a synced folder (OneDrive) that briefly locks files: retry a few times.
  for (let attempt = 1; ; attempt++) {
    try {
      await page.screenshot({ path: file, fullPage });
      break;
    } catch (err) {
      if (attempt >= 4) throw err;
      await page.waitForTimeout(500 * attempt);
    }
  }
  console.log(`  captured ${name}-${theme}-${vp}`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    for (const theme of THEMES) {
      for (const vp of Object.keys(VIEWPORTS) as (keyof typeof VIEWPORTS)[]) {
        console.log(`${theme} / ${vp}`);

        // Public pages
        const pub: BrowserContext = await newContext(browser, theme, vp, false);
        const p1 = await pub.newPage();
        watch(p1, `public ${theme}/${vp}`);
        for (const [name, url] of [
          ['landing', '/'],
          ['login', '/login'],
          ['signup', '/signup'],
          ['not-found', '/no-such-page'],
        ] as const) {
          await p1.goto(url, { waitUntil: 'networkidle' });
          await shoot(p1, name, theme, vp, name === 'landing');
        }
        await pub.close();

        // App pages
        const ctx = await newContext(browser, theme, vp, true);
        const page = await ctx.newPage();
        watch(page, `app ${theme}/${vp}`);
        await page.goto('/app/dashboard', { waitUntil: 'networkidle' });
        await shoot(page, 'dashboard', theme, vp);
        await page.goto('/app/my-tasks', { waitUntil: 'networkidle' });
        await shoot(page, 'my-tasks', theme, vp);

        const projectHref = await page.evaluate(async () => {
          const r = await fetch('/api/projects').then((x) => x.json());
          return `/app/projects/${r.projects[0].id}`;
        });
        await page.goto(`${projectHref}/board`, { waitUntil: 'networkidle' });
        await shoot(page, 'board', theme, vp);
        await page.goto(`${projectHref}/list`, { waitUntil: 'networkidle' });
        await shoot(page, 'list', theme, vp);

        const taskId = await page.evaluate(async (href) => {
          const r = await fetch(`/api${href.replace('/app', '')}/tasks`).then((x) => x.json());
          return (
            r.tasks.find((t: { commentCount: number }) => t.commentCount > 0)?.id ?? r.tasks[0].id
          );
        }, projectHref);
        await page.goto(`${projectHref}/board?task=${taskId}`, { waitUntil: 'networkidle' });
        await shoot(page, 'task-panel', theme, vp);
        await page.goto(`${projectHref}/settings`, { waitUntil: 'networkidle' });
        await shoot(page, 'project-settings', theme, vp);
        await page.goto('/app/settings?tab=members', { waitUntil: 'networkidle' });
        await shoot(page, 'settings', theme, vp);
        await page.goto('/app/settings?tab=profile', { waitUntil: 'networkidle' });
        await shoot(page, 'settings-profile', theme, vp);
        await page.goto('/app/settings?tab=appearance', { waitUntil: 'networkidle' });
        await shoot(page, 'settings-appearance', theme, vp);

        // Command palette with a query
        await page.goto('/app/dashboard', { waitUntil: 'networkidle' });
        await page.getByTestId('search-trigger').click();
        await page.getByTestId('command-palette-input').fill('redirect');
        await page.getByTestId('command-palette').getByText('Redirect map for old URLs').waitFor();
        await shoot(page, 'command-palette', theme, vp);
        await page.keyboard.press('Escape');

        // New-task dialog
        await page.goto(`${projectHref}/board`, { waitUntil: 'networkidle' });
        await page.getByTestId('new-task-button').click();
        await page.getByTestId('new-task-form').waitFor();
        await shoot(page, 'new-task', theme, vp);
        await page.keyboard.press('Escape');

        // Phone-only: Projects sheet and the filter sheet
        if (vp === 'mobile') {
          await page.getByTestId('nav-link-projects').click();
          await page.getByRole('dialog', { name: 'Projects' }).waitFor();
          await shoot(page, 'projects-sheet', theme, vp);
          await page.keyboard.press('Escape');
          await page.getByTestId('filters-toggle').click();
          await page.getByRole('dialog', { name: 'Filters' }).waitFor();
          await shoot(page, 'filters-sheet', theme, vp);
          await page.keyboard.press('Escape');
        }

        // Empty state: a brand-new project (removed again afterwards)
        const created = await page.evaluate(async () => {
          const r = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Launch Checklist' }),
          });
          return (await r.json()).project.id as string;
        });
        await page.goto(`/app/projects/${created}/board`, { waitUntil: 'networkidle' });
        await shoot(page, 'board-empty', theme, vp);
        await page.evaluate(async (id) => {
          await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        }, created);
        await ctx.close();

        // A regular member's view (no admin Members tab)
        const memberCtx = await newContext(browser, theme, vp, false);
        const mres = await memberCtx.request.post('/api/auth/login', {
          data: { email: 'member@taskflow.dev', password: 'Member123!' },
        });
        if (!mres.ok()) throw new Error('Member demo login failed');
        const mpage = await memberCtx.newPage();
        watch(mpage, `member ${theme}/${vp}`);
        await mpage.goto('/app/settings', { waitUntil: 'networkidle' });
        await shoot(mpage, 'settings-member', theme, vp);
        await memberCtx.close();
      }
    }
  } finally {
    await browser.close();
  }

  if (problems.length) {
    console.error(`\n${problems.length} problem(s):\n${[...new Set(problems)].join('\n')}`);
    process.exit(1);
  }
  console.log('\nAll pages captured with no console errors.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
