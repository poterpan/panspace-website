import { expect, test } from './fixtures';
import { allPaths } from './routes';
import { localizedPath } from '../../src/lib/i18n';
import { LANG_KEY } from '../../src/lib/storage';

const SITE = 'https://panspace.me';
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

for (const path of allPaths()) {
  test(`canonical and hreflang on ${path}`, async ({ page }) => {
    await page.goto(localizedPath('zh', path));
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}${localizedPath('zh', path)}`);
    const alternates = await page
      .locator('link[rel="alternate"][hreflang]')
      .evaluateAll((els) => els.map((e) => [e.getAttribute('hreflang'), e.getAttribute('href')]));
    expect(alternates).toEqual([
      ['zh-Hant', `${SITE}${localizedPath('zh', path)}`],
      ['en', `${SITE}${localizedPath('en', path)}`],
      ['x-default', `${SITE}/`],
    ]);
  });

  test(`language switch stays on ${path} and is remembered`, async ({ page }) => {
    await page.goto(localizedPath('zh', path));
    await page.locator('a[data-lang-switch="en"]').click();
    await expect(page).toHaveURL(new RegExp(`${escape(localizedPath('en', path))}$`));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(await page.evaluate((k) => localStorage.getItem(k), LANG_KEY)).toBe('en');
    await page.locator('a[data-lang-switch="zh"]').click();
    await expect(page).toHaveURL(new RegExp(`${escape(localizedPath('zh', path))}$`));
  });
}

test.describe('remembered language', () => {
  test.use({ locale: 'zh-TW' });
  test('an explicit switch to English wins at /', async ({ page }) => {
    await page.goto('/zh');
    await page.locator('a[data-lang-switch="en"]').click();
    await expect(page).toHaveURL(/\/en$/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/en$/);
  });
});

test('skip link is the first tab stop and moves focus to main', async ({ page }) => {
  await page.goto('/zh');
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test('focused links show a visible focus ring', async ({ page }) => {
  await page.goto('/zh');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement as Element).outlineStyle);
  expect(outline).not.toBe('none');
});
