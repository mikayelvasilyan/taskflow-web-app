/**
 * Keyboard-only checks that axe cannot do: skip link, visible focus, focus trapped in dialogs and
 * returned on close, task panel via Enter/Escape, command palette via Ctrl+K.
 *   BASE_URL=http://localhost:5173 npm run a11y   (runs after the axe audit)
 */
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
let failed = 0;
const check = (name: string, ok: boolean, extra = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`);
};

async function main() {
  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
    baseURL: BASE_URL,
  });
  const login = await ctx.request.post('/api/auth/login', {
    data: { email: 'demo@taskflow.dev', password: 'Demo123!' },
  });
  if (!login.ok()) throw new Error('Demo login failed. Is the API running with demo data?');
  const page = await ctx.newPage();
  const active = () =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return {
        id: el?.id ?? '',
        testid: el?.dataset.testid ?? '',
        text: el?.textContent?.trim().slice(0, 40) ?? '',
      };
    });
  const insideDialog = () =>
    page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));

  // 1. Skip link is the first tab stop and moves focus to the main region
  await page.goto('/app/dashboard', { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  check(
    'first Tab stop is the skip link',
    (await active()).text === 'Skip to content',
    (await active()).text,
  );
  await page.keyboard.press('Enter');
  check('skip link moves focus to the main region', (await active()).id === 'main');

  // 2. Focus ring is visible on keyboard focus
  await page.goto('/app/dashboard', { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement as Element);
    return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
  });
  check(
    'keyboard focus shows an outline of at least 2px',
    outline.style !== 'none' && outline.width >= 2,
    JSON.stringify(outline),
  );

  // 3. Dialog: opens from the keyboard, traps focus, Escape returns focus to the opener
  await page.getByTestId('new-project-button').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('new-project-form').waitFor();
  check('focus moves into the dialog when it opens', await insideDialog());
  let escaped = false;
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    if (!(await insideDialog())) escaped = true;
  }
  check('Tab never leaves the open dialog (focus trap)', !escaped);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check(
    'Escape closes the dialog and returns focus to the opener',
    (await active()).testid === 'new-project-button',
    JSON.stringify(await active()),
  );

  // 4. Command palette from the keyboard
  await page.keyboard.press('Control+k');
  await page.getByTestId('command-palette-input').waitFor();
  check(
    'Ctrl+K opens the command palette with the input focused',
    (await active()).testid === 'command-palette-input',
  );
  await page.keyboard.press('Escape');
  await page.getByTestId('command-palette').waitFor({ state: 'hidden' });
  check('Escape closes the command palette', true);

  // 5. Board card: Enter opens the task panel, Escape closes it and focus returns to the card
  const href = await page.evaluate(async () => {
    const r = await fetch('/api/projects').then((x) => x.json());
    return `/app/projects/${r.projects[0].id}/board`;
  });
  await page.goto(href, { waitUntil: 'networkidle' });
  const card = page.locator('[data-testid^="task-card-"]').first();
  await card.focus();
  const cardId = (await active()).testid;
  await page.keyboard.press('Enter');
  await page.getByTestId('task-panel').waitFor();
  check('Enter on a focused card opens the task panel', page.url().includes('task='));
  check('focus moves into the task panel', await insideDialog());
  await page.keyboard.press('Escape');
  await page.getByTestId('task-panel').waitFor({ state: 'hidden' });
  await page.waitForTimeout(200);
  check(
    'Escape closes the panel and returns focus to the card',
    (await active()).testid === cardId,
    JSON.stringify(await active()),
  );

  await browser.close();
  console.log(
    `\n${failed === 0 ? 'All keyboard checks passed.' : `${failed} keyboard check(s) failed.`}`,
  );
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
