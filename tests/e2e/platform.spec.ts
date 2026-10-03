import { expect, test } from './fixtures';
import { allPaths } from './routes';
import { localizedPath } from '../../src/lib/i18n';

test('hashed assets are cached immutably; pages are nosniff', async ({ page, request }) => {
  const res = await request.get('/zh');
  expect(res.headers()['x-content-type-options']).toBe('nosniff');
  await page.goto('/zh');
  const src = await page.locator('script[type="module"][src^="/_astro/"]').first().getAttribute('src');
  const asset = await request.get(src!);
  expect(asset.headers()['cache-control']).toContain('immutable');
});

test('no cookies are set anywhere (analytics is cookieless)', async ({ page, context }) => {
  for (const path of allPaths()) await page.goto(localizedPath('zh', path));
  expect(await context.cookies()).toEqual([]);
});

test('without a beacon token no analytics script is emitted', async ({ page }) => {
  test.skip(!!process.env.PUBLIC_CF_BEACON_TOKEN, 'token configured for this build');
  await page.goto('/en');
  await expect(page.locator('script[src*="cloudflareinsights"]')).toHaveCount(0);
});
