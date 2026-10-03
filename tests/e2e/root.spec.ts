import { BLOCK_STORAGE, expect, test } from './fixtures';
import { LANG_KEY } from '../../src/lib/storage';

test.describe('root language redirect', () => {
  test.describe('English browser', () => {
    test.use({ locale: 'en-US' });
    test('goes to /en', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/en$/);
    });
    test('a stored choice wins over the browser language', async ({ page }) => {
      await page.addInitScript((key) => window.localStorage.setItem(key, 'zh'), LANG_KEY);
      await page.goto('/');
      await expect(page).toHaveURL(/\/zh$/);
    });
  });

  test.describe('Traditional Chinese browser', () => {
    test.use({ locale: 'zh-TW' });
    test('goes to /zh', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/zh$/);
    });
    test('storage blocked: still uses the browser language', async ({ page }) => {
      await page.addInitScript(BLOCK_STORAGE);
      await page.goto('/');
      await expect(page).toHaveURL(/\/zh$/);
    });
  });

  test.describe('Japanese browser', () => {
    test.use({ locale: 'ja-JP' });
    test('falls back to /en', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/en$/);
    });
  });

  test.describe('JavaScript disabled', () => {
    test.use({ javaScriptEnabled: false });
    test('shows both language links', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('link', { name: '中文' })).toHaveAttribute('href', '/zh');
      await expect(page.getByRole('link', { name: 'English' })).toHaveAttribute('href', '/en');
    });
  });
});

test('a trailing slash redirects to the canonical path', async ({ request }) => {
  const res = await request.get('/zh/', { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers()['location']).toMatch(/\/zh$/);
});

test('each language home responds 200', async ({ request }) => {
  for (const path of ['/zh', '/en']) expect((await request.get(path)).status()).toBe(200);
});
