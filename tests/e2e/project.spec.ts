import { expect, test } from './fixtures';
import { orderedSlugs, projectMetas } from './routes';

test.describe('project pages', () => {
  for (const slug of orderedSlugs()) {
    test(`/zh/work/${slug}: header, cover, table of contents`, async ({ page }) => {
      await page.goto(`/zh/work/${slug}`);
      await expect(page.locator('.window-bar .window-path')).toHaveText(`~/work/${slug}`);
      await expect(page.locator('h1.project-title')).toBeVisible();
      await expect(page.locator('.project-hero picture source[type="image/avif"]')).toHaveCount(1);
      await expect(page.locator('.project-hero picture source[type="image/webp"]')).toHaveCount(1);
      const hrefs = await page.locator('.project-facts-desktop nav a').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
      expect(hrefs).toHaveLength(4);
      for (const href of hrefs) await expect(page.locator(`[id="${decodeURIComponent(href.slice(1))}"]`)).toHaveCount(1);
    });
  }

  test('prose has vertical rhythm, bulleted lists and bold headings', async ({ page }) => {
    await page.goto(`/zh/work/${orderedSlugs()[0]}`);
    const prose = page.locator('.prose-ps');
    const margin = await prose.locator('p').first().evaluate((e) => parseFloat(getComputedStyle(e).marginBottom));
    expect(margin).toBeGreaterThan(0);
    const weight = await prose.locator('h2').first().evaluate((e) => Number(getComputedStyle(e).fontWeight));
    expect(weight).toBeGreaterThanOrEqual(600);
    const lists = await prose.locator('ul').evaluateAll((els) => els.map((e) => getComputedStyle(e).listStyleType));
    for (const type of lists) expect(type).toBe('disc');
  });

  test('desktop: facts sidebar is sticky; mobile: facts collapse under the header', async ({ page }, info) => {
    await page.goto(`/en/work/${orderedSlugs()[0]}`);
    if (info.project.name === 'desktop') {
      await expect(page.locator('.project-facts-desktop')).toBeVisible();
      await expect(page.locator('details.project-facts-mobile')).toBeHidden();
      expect(await page.locator('.project-facts-desktop').evaluate((e) => getComputedStyle(e).position)).toBe('sticky');
    } else {
      await expect(page.locator('.project-facts-desktop')).toBeHidden();
      const details = page.locator('details.project-facts-mobile');
      await expect(details).toBeVisible();
      await details.locator('summary').click();
      await expect(details.locator('dl')).toBeVisible();
    }
  });

  test('confidential projects show the notice and never link to GitHub', async ({ page }) => {
    const confidential = projectMetas().filter((p) => p.meta.confidential);
    expect(confidential.length).toBeGreaterThan(0);
    for (const { slug } of confidential) {
      for (const lang of ['zh', 'en']) {
        await page.goto(`/${lang}/work/${slug}`);
        await expect(page.locator('[data-confidential]').first()).toHaveText(
          lang === 'zh' ? '商業專案・客戶資訊保密' : 'Commercial project · client details confidential',
        );
        await expect(page.locator('article a[href*="github.com"]')).toHaveCount(0);
      }
    }
  });

  test('public projects show their GitHub link', async ({ page }) => {
    await page.goto('/en/work/chippot');
    await expect(page.locator('.link-list a[href="https://github.com/poterpan/ChipPot"]')).toBeVisible();
    await expect(page.locator('[data-confidential]')).toHaveCount(0);
  });

  test('next links walk every project once, in list order', async ({ page }) => {
    const order = orderedSlugs();
    await page.goto(`/zh/work/${order[0]}`);
    await expect(page.locator('a[rel="prev"]')).toHaveCount(0);
    const visited = [order[0]];
    while ((await page.locator('a[rel="next"]').count()) > 0) {
      const href = await page.locator('a[rel="next"]').getAttribute('href');
      await page.locator('a[rel="next"]').click();
      // ClientRouter swaps the page asynchronously: wait for the URL before reading anything.
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      await expect(page.locator('h1.project-title')).toBeVisible();
      visited.push(new URL(page.url()).pathname.split('/').pop() ?? '');
    }
    expect(visited).toEqual(order);
  });

  test('MDX components render on the NTUTBox page', async ({ page }) => {
    await page.goto('/zh/work/ntutbox');
    await expect(page.locator('.mdx-stat').first()).toBeVisible();
    await expect(page.locator('.mdx-gallery picture source[type="image/avif"]').first()).toBeAttached();
  });

  test('non-canonical forms redirect, and the language switch still targets the same page', async ({ page, request }) => {
    for (const form of ['/zh/work/ntutbox/', '/zh/work/ntutbox.html']) {
      const res = await request.get(form, { maxRedirects: 0 });
      expect(res.status()).toBe(307);
      expect(res.headers()['location']).toMatch(/\/zh\/work\/ntutbox$/);
    }
    await page.goto('/zh/work/ntutbox/');
    await expect(page).toHaveURL(/\/zh\/work\/ntutbox$/);
    await expect(page.locator('a[data-lang-switch="en"]')).toHaveAttribute('href', '/en/work/ntutbox');
  });

  test.describe('first visit landing on a project page', () => {
    test.use({ bootSeen: false });
    test('navigating home from a project page does not play the boot', async ({ page }) => {
      await page.goto('/zh/work/ntutbox');
      await page.locator('.site-nav .brand').click();
      await expect(page).toHaveURL(/\/zh$/);
      await expect(page.locator('#boot')).toBeHidden();
    });
  });
});
