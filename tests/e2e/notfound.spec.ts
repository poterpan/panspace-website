import { expect, test } from './fixtures';

test('unknown URLs return 404 with the OS-style page', async ({ page, request }) => {
  for (const url of ['/zh/nope', '/en/work/does-not-exist', '/totally/unknown']) {
    // Workers serves 404.html for navigation requests, so send the header a browser would.
    const res = await request.get(url, { headers: { 'Sec-Fetch-Mode': 'navigate', Accept: 'text/html' } });
    expect(res.status()).toBe(404);
    expect(await res.text()).toContain('command not found');
  }
  const response = await page.goto('/en/work/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.locator('[data-missing-path]')).toHaveText('/en/work/does-not-exist');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.locator('.nf-links a[href="/zh"]')).toBeVisible();
  await expect(page.locator('.nf-links a[href="/en"]')).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});
