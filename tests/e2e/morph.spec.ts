import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { orderedSlugs } from './routes';

type Probe = { __marker?: number; __vt: number; __cardName?: string };

const css = (page: Page, selector: string, prop: string) =>
  page.locator(selector).first().evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), prop);

const allNames = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .map((e) => getComputedStyle(e).getPropertyValue('view-transition-name'))
      .filter((n) => n && n !== 'none'),
  );

const countTransitions = () => {
  const proto = Document.prototype as unknown as { startViewTransition?: (...a: unknown[]) => unknown };
  const original = proto.startViewTransition;
  (window as unknown as Probe).__vt = 0;
  if (!original) return;
  proto.startViewTransition = function (this: unknown, ...args: unknown[]) {
    (window as unknown as Probe).__vt++;
    return original.apply(this, args);
  };
};

/** Records the p1 card's view-transition-name while the old page is still live (just before the swap). */
const recordCardName = () => {
  document.addEventListener('astro:before-swap', () => {
    const card = document.querySelector('.project-card[data-slot="p1"]');
    if (card) (window as unknown as Probe).__cardName = getComputedStyle(card).getPropertyValue('view-transition-name');
  });
};

const P1 = '.project-card[data-slot="p1"]';

/** Clicks land on <html> while a view transition runs; wait until the window has settled. */
const settled = (page: Page) =>
  page.waitForFunction(() => !document.documentElement.matches(':active-view-transition'));

test('the project page is an app window: frame name, title bar, close button', async ({ page }) => {
  await page.goto('/zh');
  const slug = (await page.locator(P1).getAttribute('href'))!.split('/').pop()!;
  await expect(page.locator(P1)).toHaveAttribute('data-vt', `card-${slug}`);
  // At rest no card is named: only the one being opened joins the morph.
  expect(await css(page, P1, 'view-transition-name')).toBe('none');
  await page.goto(`/zh/work/${slug}`);
  expect(await css(page, '.window', 'view-transition-name')).toBe(`card-${slug}`);
  expect(await css(page, '.window', 'view-transition-class')).toBe('ps-window');
  await expect(page.locator('.window-bar .window-dots i')).toHaveCount(3);
  await expect(page.locator('.window-bar .window-path')).toHaveText(`~/work/${slug}`);
  // Opened directly (no in-site origin): close falls back to the work list.
  const close = page.locator('.window-bar [data-window-close]');
  await expect(close).toHaveAttribute('href', '/zh/work');
  await expect(close).toHaveAccessibleName('關閉視窗');
  await close.click();
  await expect(page).toHaveURL(/\/zh\/work$/);
});

test('clicking a card morphs it into the window, and back reverses it', async ({ page }) => {
  await page.addInitScript(countTransitions);
  await page.addInitScript(recordCardName);
  await page.goto('/zh');
  const slug = (await page.locator(P1).getAttribute('href'))!.split('/').pop()!;
  await page.evaluate(() => ((window as unknown as Probe).__marker = 1));
  await page.locator(P1).click();
  await expect(page).toHaveURL(new RegExp(`/zh/work/${slug}$`));
  await expect(page.locator('h1.project-title')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Probe).__cardName)).toBe(`card-${slug}`);
  expect(await page.evaluate(() => (window as unknown as Probe).__marker)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as Probe).__vt)).toBeGreaterThanOrEqual(1);
  await page.goBack();
  await expect(page).toHaveURL(/\/zh$/);
  await expect(page.locator(P1)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Probe).__marker)).toBe(1);
  await expect.poll(() => page.evaluate(() => (window as unknown as Probe).__vt)).toBeGreaterThanOrEqual(2);
});

test('close goes back to the page the window was opened from', async ({ page }) => {
  await page.goto('/zh');
  await page.evaluate(() => ((window as unknown as Probe).__marker = 1));
  await page.locator(P1).click();
  const close = page.locator('[data-window-close]');
  await expect(close).toHaveAttribute('href', '/zh');
  await close.click();
  await expect(page).toHaveURL(/\/zh$/);
  await expect(page.locator(P1)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Probe).__marker)).toBe(1);
});

test('clicking the backdrop outside the window closes it like the close button', async ({ page }) => {
  await page.goto('/zh');
  await page.evaluate(() => ((window as unknown as Probe).__marker = 1));
  await page.locator(P1).click();
  await expect(page.locator('h1.project-title')).toBeVisible();
  await settled(page);
  const frame = (await page.locator('.window').boundingBox())!;
  // The nav is not backdrop.
  await page.locator('.site-nav .brand').evaluate((e) => e.addEventListener('click', (ev) => ev.preventDefault()));
  await page.mouse.click(frame.x + 40, 20);
  // Inside the window is not backdrop.
  await page.mouse.click(frame.x + frame.width / 2, frame.y + 200);
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/zh\/work\//);
  // Backdrop: the gutter left of the frame on desktop, the strip above it on any width.
  await expect(page.locator('main')).toHaveCSS('cursor', 'zoom-out');
  await page.mouse.click(frame.x > 24 ? frame.x / 2 : frame.x + frame.width / 2, frame.y > 66 ? frame.y - 8 : frame.y + frame.height + 8);
  await expect(page).toHaveURL(/\/zh$/);
  await expect(page.locator(P1)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Probe).__marker)).toBe(1);
});

test('a text selection dragged from inside the window out to the backdrop does not close it', async ({ page }) => {
  await page.goto('/zh');
  await page.locator(P1).click();
  await expect(page.locator('h1.project-title')).toBeVisible();
  await settled(page);
  const title = (await page.locator('h1.project-title').boundingBox())!;
  const frame = (await page.locator('.window').boundingBox())!;
  await page.mouse.move(title.x + 4, title.y + title.height / 2);
  await page.mouse.down();
  await page.mouse.move(frame.x + 10, frame.y - 8, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/zh\/work\//);
  expect(await page.evaluate(() => String(window.getSelection()).length)).toBeGreaterThan(0);
});

test('Escape closes the window from the keyboard', async ({ page }) => {
  await page.goto('/en/work');
  const first = orderedSlugs()[0];
  await page.locator(`a.work-card[href="/en/work/${first}"]`).click();
  await expect(page.locator('h1.project-title')).toBeVisible();
  await expect(page.locator('[data-window-close]')).toHaveAttribute('href', '/en/work');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/en\/work$/);
});

test('reduced motion: no shared-element names (cross-fade only), navigation and close still work', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(recordCardName);
  await page.goto('/zh');
  await page.locator(P1).click();
  await expect(page.locator('h1.project-title')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Probe).__cardName)).toBe('none');
  expect(await css(page, '.window', 'view-transition-name')).toBe('none');
  expect(await css(page, '.window-body', 'view-transition-name')).toBe('none');
  await page.locator('[data-window-close]').click();
  await expect(page).toHaveURL(/\/zh$/);
});

test('browsers without View Transitions still navigate and close', async ({ page }) => {
  await page.addInitScript(() => {
    delete (Document.prototype as unknown as { startViewTransition?: unknown }).startViewTransition;
  });
  await page.goto('/zh');
  await page.locator(P1).click();
  await expect(page.locator('h1.project-title')).toBeVisible();
  await page.locator('[data-window-close]').click();
  await expect(page).toHaveURL(/\/zh$/);
});

test('names are unique on every page', async ({ page }) => {
  for (const url of ['/zh', '/en', '/zh/work', '/en/work', ...orderedSlugs().map((s) => `/zh/work/${s}`)]) {
    await page.goto(url);
    const names = await allNames(page);
    expect(new Set(names).size, `${url}: ${names.join(', ')}`).toBe(names.length);
  }
});
