import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { orderedSlugs, projectMetas } from './routes';

const hrefs = (page: Page) =>
  page.locator('.work-grid a.work-card').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
const hydrated = (page: Page) =>
  expect(page.locator('astro-island[component-url*="WorkGrid"]:not([ssr])')).toBeAttached();
const slugsWith = (category: string) =>
  orderedSlugs().filter((s) => projectMetas().find((p) => p.slug === s)?.meta.categories.includes(category));

test('lists every project in list order', async ({ page }) => {
  await page.goto('/en/work');
  expect(await hrefs(page)).toEqual(orderedSlugs().map((s) => `/en/work/${s}`));
});

test('filtering by category re-lays out the grid and updates the URL', async ({ page }) => {
  await page.goto('/zh/work');
  await hydrated(page);
  const ios = page.getByRole('button', { name: 'iOS', exact: true });
  await ios.click();
  await expect(ios).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/\?cat=ios$/);
  await expect(page.locator('.work-grid a.work-card')).toHaveCount(slugsWith('ios').length);
  expect(await hrefs(page)).toEqual(slugsWith('ios').map((s) => `/zh/work/${s}`));
  await expect(page.locator('.work-status')).toHaveText(`共 ${slugsWith('ios').length} 個作品`);
  await page.getByRole('button', { name: '全部' }).click();
  await expect(page).toHaveURL(/\/zh\/work$/);
  await expect(page.locator('.work-grid a.work-card')).toHaveCount(orderedSlugs().length);
});

test('a ?cat= link preselects the filter', async ({ page }) => {
  await page.goto('/en/work?cat=web');
  await hydrated(page);
  await expect(page.getByRole('button', { name: 'Web', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.work-grid a.work-card')).toHaveCount(slugsWith('web').length);
});

test('unknown category falls back to all', async ({ page }) => {
  await page.goto('/en/work?cat=android');
  await hydrated(page);
  await expect(page.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.work-grid a.work-card')).toHaveCount(orderedSlugs().length);
});

test('reduced motion: filtering switches instantly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en/work');
  await hydrated(page);
  await page.getByRole('button', { name: 'iOS', exact: true }).click();
  await expect(page.locator('.work-grid a.work-card')).toHaveCount(slugsWith('ios').length, { timeout: 150 });
});

test('cards morph into the project page and names stay unique', async ({ page }) => {
  await page.goto('/zh/work');
  const names = await page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .map((e) => getComputedStyle(e).getPropertyValue('view-transition-name'))
      .filter((n) => n && n !== 'none'),
  );
  expect(new Set(names).size).toBe(names.length);
  const first = orderedSlugs()[0];
  const card = page.locator(`a.work-card[href="/zh/work/${first}"]`);
  await expect(card).toHaveAttribute('data-vt', `card-${first}`);
  await page.evaluate(() =>
    document.addEventListener('astro:before-swap', () => {
      const el = document.querySelector('a.work-card');
      (window as unknown as { __name: string }).__name = el ? getComputedStyle(el).getPropertyValue('view-transition-name') : '';
    }),
  );
  await card.click();
  await expect(page.locator('h1.project-title')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __name: string }).__name)).toBe(`card-${first}`);
  await expect(page.locator('[data-window-close]')).toHaveAttribute('href', '/zh/work');
  await page.locator('[data-window-close]').click();
  await expect(page).toHaveURL(/\/zh\/work$/);
  await expect(card).toBeVisible();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('all projects are listed and the inert filters are hidden', async ({ page }) => {
    await page.goto('/zh/work');
    await expect(page.locator('.work-grid a.work-card')).toHaveCount(orderedSlugs().length);
    await expect(page.locator('.work-filters')).toBeHidden();
  });
});
