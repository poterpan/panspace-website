import { readFileSync } from 'node:fs';
import { expect, test } from './fixtures';
import { allPaths, orderedSlugs } from './routes';
import { LOCALES, localizedPath, type Locale } from '../../src/lib/i18n';

const fm = (slug: string, lang: Locale, key: string): string => {
  const m = readFileSync(`src/content/projects/${slug}/${lang}.mdx`, 'utf8').match(new RegExp(`^${key}: (.*)$`, 'm'));
  return m![1].trim().replace(/^["']|["']$/g, '');
};

const FIXED: Record<string, Record<Locale, string>> = {
  '/': { zh: "潘柏嘉 Poter Pan｜Pan's Space", en: "Poter Pan｜Pan's Space" },
  '/work': { zh: "作品｜Pan's Space", en: "Work｜Pan's Space" },
  '/about': { zh: "關於我｜Pan's Space", en: "About｜Pan's Space" },
};

for (const lang of LOCALES) {
  for (const path of allPaths()) {
    const url = localizedPath(lang, path);
    test(`${url}: exact <title>, matching og/twitter titles, description length`, async ({ page }) => {
      await page.goto(url);
      const slug = path.startsWith('/work/') ? path.slice('/work/'.length) : null;
      const expected = slug ? `${fm(slug, lang, 'title')}｜Pan's Space` : FIXED[path][lang];
      await expect(page).toHaveTitle(expected);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', expected);
      await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', expected);
      const desc = (await page.locator('meta[name="description"]').getAttribute('content'))!;
      expect([...desc].length).toBeGreaterThan(0);
      expect([...desc].length).toBeLessThanOrEqual(lang === 'zh' ? 100 : 160);
    });
  }
}

test('the 404 page has the unified title and a short description', async ({ page }) => {
  await page.goto('/this-page-does-not-exist');
  await expect(page).toHaveTitle("Page not found｜Pan's Space");
  const desc = (await page.locator('meta[name="description"]').getAttribute('content'))!;
  expect(desc).toContain('找不到這個頁面');
  expect([...desc].length).toBeLessThanOrEqual(100);
});

test('no page title carries the old tagline', async ({ page }) => {
  for (const lang of LOCALES) {
    await page.goto(localizedPath(lang, '/'));
    expect(await page.title()).not.toMatch(/產品型開發者|Product-minded/);
  }
  expect(orderedSlugs().length).toBeGreaterThan(0);
});
