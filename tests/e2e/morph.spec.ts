import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { orderedSlugs } from './routes';

const vtName = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((e) => getComputedStyle(e).getPropertyValue('view-transition-name'));

const allNames = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .map((e) => getComputedStyle(e).getPropertyValue('view-transition-name'))
      .filter((n) => n && n !== 'none'),
  );

const countTransitions = () => {
  const proto = Document.prototype as unknown as { startViewTransition?: (...a: unknown[]) => unknown };
  const original = proto.startViewTransition;
  (window as unknown as { __vt: number }).__vt = 0;
  if (!original) return;
  proto.startViewTransition = function (this: unknown, ...args: unknown[]) {
    (window as unknown as { __vt: number }).__vt++;
    return original.apply(this, args);
  };
};

test('card, title and cover share names with the project page', async ({ page }) => {
  await page.goto('/zh');
  const card = '.project-card[data-slot="p1"]';
  const slug = (await page.locator(card).getAttribute('href'))!.split('/').pop()!;
  expect(await vtName(page, card)).toBe(`card-${slug}`);
  expect(await vtName(page, `${card} .card-title`)).toBe(`title-${slug}`);
  expect(await vtName(page, `${card} img`)).toBe(`cover-${slug}`);
  await page.goto(`/zh/work/${slug}`);
  expect(await vtName(page, '.project-header')).toBe(`card-${slug}`);
  expect(await vtName(page, 'h1.project-title')).toBe(`title-${slug}`);
  expect(await vtName(page, '.project-hero img')).toBe(`cover-${slug}`);
});

test('clicking a card morphs client-side, and back reverses it', async ({ page }) => {
  await page.addInitScript(countTransitions);
  await page.goto('/zh');
  await page.evaluate(() => ((window as unknown as { __marker: number }).__marker = 1));
  await page.locator('.project-card[data-slot="p1"]').click();
  await expect(page).toHaveURL(/\/zh\/work\/[\w-]+$/);
  await expect(page.locator('h1.project-title')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as { __vt: number }).__vt)).toBeGreaterThanOrEqual(1);
  await page.goBack();
  await expect(page).toHaveURL(/\/zh$/);
  await expect(page.locator('.project-card[data-slot="p1"]')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(1);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __vt: number }).__vt)).toBeGreaterThanOrEqual(2);
});

test('reduced motion: no shared-element names (cross-fade only), navigation still works', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/zh');
  expect(await vtName(page, '.project-card[data-slot="p1"]')).toBe('none');
  await page.locator('.project-card[data-slot="p1"]').click();
  await expect(page.locator('h1.project-title')).toBeVisible();
  expect(await vtName(page, 'h1.project-title')).toBe('none');
});

test('browsers without View Transitions still navigate', async ({ page }) => {
  await page.addInitScript(() => {
    delete (Document.prototype as unknown as { startViewTransition?: unknown }).startViewTransition;
  });
  await page.goto('/zh');
  await page.locator('.project-card[data-slot="p1"]').click();
  await expect(page.locator('h1.project-title')).toBeVisible();
});

test('names are unique on every page', async ({ page }) => {
  for (const url of ['/zh', '/en', '/zh/work', '/en/work', ...orderedSlugs().map((s) => `/zh/work/${s}`)]) {
    await page.goto(url);
    const names = await allNames(page);
    expect(new Set(names).size, `${url}: ${names.join(', ')}`).toBe(names.length);
  }
});
