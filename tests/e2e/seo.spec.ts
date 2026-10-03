import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { allPaths, orderedSlugs } from './routes';
import { LOCALES, localizedPath } from '../../src/lib/i18n';

const jsonLd = (page: Page) =>
  page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.map((e) => JSON.parse(e.textContent ?? '{}')));

for (const lang of LOCALES) {
  for (const path of allPaths()) {
    const url = localizedPath(lang, path);
    test(`${url}: Open Graph tags and a reachable OG image`, async ({ page, request }) => {
      await page.goto(url);
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `https://panspace.me${url}`);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
      const image = (await page.locator('meta[property="og:image"]').getAttribute('content'))!;
      const res = await request.get(new URL(image).pathname);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('image/png');
    });
  }
}

test('home and about carry Person JSON-LD', async ({ page }) => {
  for (const url of ['/zh', '/en/about']) {
    await page.goto(url);
    const person = (await jsonLd(page)).find((d) => d['@type'] === 'Person');
    expect(person?.name).toBe('Poter Pan');
    expect(person?.sameAs).toContain('https://github.com/poterpan');
  }
});

test('project pages carry CreativeWork JSON-LD and a per-project OG image', async ({ page }) => {
  for (const slug of orderedSlugs()) {
    await page.goto(`/en/work/${slug}`);
    const work = (await jsonLd(page)).find((d) => d['@type'] === 'CreativeWork');
    expect(work?.name).toBe(await page.locator('h1.project-title').textContent());
    expect(work?.inLanguage).toBe('en');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `https://panspace.me/og/en/work/${slug}.png`);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  }
});

test('sitemap lists every page with hreflang alternates and nothing else', async ({ request }) => {
  expect((await request.get('/sitemap-index.xml')).status()).toBe(200);
  const xml = await (await request.get('/sitemap-0.xml')).text();
  for (const lang of LOCALES) {
    for (const path of allPaths()) expect(xml).toContain(`<loc>https://panspace.me${localizedPath(lang, path)}</loc>`);
  }
  expect(xml).toContain('hreflang="zh-Hant"');
  expect(xml).toContain('hreflang="en"');
  expect(xml).not.toContain('/og/');
  expect(xml).not.toContain('404');
});

test('robots.txt points to the sitemap', async ({ request }) => {
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: https://panspace.me/sitemap-index.xml');
});

test('the root redirector declares alternates', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('hreflang="x-default"');
  expect(html).toContain('href="https://panspace.me/zh"');
});
